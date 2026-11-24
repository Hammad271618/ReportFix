"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import type {
  AdminSummaryResult,
  ClientStatePayload,
  Department,
  IssueStatus,
  PriorityLevel,
  SubmitReportResponse,
  TriageItemTrace,
  User,
} from "@/lib/types";
import {
  AppSidebar,
  type AdminNavId,
  type StaffNavId,
  type StudentNavId,
  type WorkspaceNavId,
} from "@/components/AppSidebar";
import { JudgeBar } from "@/components/JudgeBar";
import { StudentWorkspace } from "@/components/StudentWorkspace";
import { StaffQueueView } from "@/components/StaffQueueView";
import { AdminOversightView } from "@/components/AdminOversightView";

const SESSION_STORAGE_KEY = "reportfix_active_user_id";

interface ToastMessage {
  id: number;
  kind: "success" | "error" | "info";
  text: string;
}

function stripTrailingPeriod(msg: string): string {
  return msg.replace(/\.$/, "");
}

export default function HomePage() {
  const [clientState, setClientState] = useState<ClientStatePayload | null>(
    null
  );
  const [activeUserId, setActiveUserId] = useState<string>("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [lastSubmissionsByUser, setLastSubmissionsByUser] = useState<
    Record<string, SubmitReportResponse>
  >({});
  const [adminSummary, setAdminSummary] = useState<AdminSummaryResult | null>(
    null
  );

  // Navigation state synchronized with the Left Sidebar
  const [studentNav, setStudentNav] = useState<StudentNavId>("report");
  const [staffNav, setStaffNav] = useState<StaffNavId>("ACTIVE");
  const [adminNav, setAdminNav] = useState<AdminNavId>("all");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const showToast = useCallback(
    (kind: ToastMessage["kind"], text: string) => {
      const id = Date.now();
      setToast({ id, kind, text: stripTrailingPeriod(text) });
    },
    []
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast((curr) => (curr?.id === toast.id ? null : curr));
    }, 5500);
    return () => clearTimeout(timer);
  }, [toast]);

  const fetchState = useCallback(
    async (userIdOverride?: string, silent = false) => {
      try {
        const targetUid = userIdOverride ?? activeUserId;
        const query = targetUid
          ? `?userId=${encodeURIComponent(targetUid)}`
          : "";
        const res = await fetch(`/api/state${query}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            errData.message || `Failed to load state (${res.status})`
          );
        }
        const payload = (await res.json()) as ClientStatePayload;
        setClientState(payload);
        setActiveUserId(payload.activeUser.id);
        try {
          sessionStorage.setItem(SESSION_STORAGE_KEY, payload.activeUser.id);
        } catch {
          // Ignore sessionStorage restrictions
        }
        setLoadError(null);
        return payload;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to fetch state";
        if (!silent) {
          setLoadError(msg);
        }
        return null;
      }
    },
    [activeUserId]
  );

  // Initial load with sessionStorage userId restore
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      let storedUid = "";
      try {
        storedUid = sessionStorage.getItem(SESSION_STORAGE_KEY) ?? "";
      } catch {
        storedUid = "";
      }
      if (mounted) {
        await fetchState(storedUid || undefined);
        if (mounted) setInitialLoading(false);
      }
    };
    init();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Gentle background polling when idle & visible
  useEffect(() => {
    if (!activeUserId) return;
    const interval = setInterval(() => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible" &&
        busyAction === null
      ) {
        void fetchState(activeUserId, true);
      }
    }, 12000);
    return () => clearInterval(interval);
  }, [activeUserId, busyAction, fetchState]);

  const handleSwitchUser = async (userId: string) => {
    if (userId === activeUserId) return;
    setBusyAction("switch-user");
    try {
      await fetchState(userId);
    } finally {
      setBusyAction(null);
    }
  };

  const handleRefresh = async () => {
    setBusyAction("refresh");
    try {
      await fetchState(activeUserId);
      showToast("info", "State refreshed from server");
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateStudent = async () => {
    setBusyAction("create-student");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        user?: User;
        message?: string;
      };
      if (!res.ok || !data.user) {
        throw new Error(data.message || "Failed to create student");
      }
      await fetchState(data.user.id);
      setStudentNav("report");
      showToast(
        "success",
        `Switched to ${data.user.name} (Trust ${data.user.trustScore}, new account)`
      );
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to create student"
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleRenameStudent = async (userId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusyAction("rename-student");
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ userId, name: trimmed }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        user?: User;
        message?: string;
      };
      if (!res.ok || !data.user) {
        throw new Error(data.message || "Failed to rename student");
      }
      await fetchState(activeUserId || data.user.id);
      showToast("success", data.message || `Renamed student to ${data.user.name}`);
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to rename student"
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleReset = async (mode: "clean" | "samples") => {
    setBusyAction(mode === "clean" ? "reset-clean" : "reset-samples");
    try {
      const res = await fetch("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ mode }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        mode?: string;
        state?: ClientStatePayload;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Reset failed");
      }
      setLastSubmissionsByUser({});
      setAdminSummary(null);
      await fetchState(activeUserId || undefined);
      showToast(
        "success",
        mode === "clean"
          ? "Database reset to clean baseline"
          : "Database reset with seeded sample tickets"
      );
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to reset state"
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleSubmitReport = async (text: string) => {
    if (!clientState) return;
    setBusyAction("submit-report");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ userId: clientState.activeUser.id, text }),
      });
      const data = (await res.json()) as SubmitReportResponse & {
        error?: string;
      };

      if (data.items) {
        setLastSubmissionsByUser((prev) => ({
          ...prev,
          [clientState.activeUser.id]: data,
        }));
      }

      if (!res.ok) {
        await fetchState(clientState.activeUser.id);
        throw new Error(
          data.message || data.error || `Report failed (${res.status})`
        );
      }

      await fetchState(clientState.activeUser.id);
      showToast(
        "success",
        data.message || `Triaged ${data.items.length} report item(s)`
      );
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to submit report"
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleClarify = async (clarificationId: string, locationId: string) => {
    if (!clientState) return;
    setBusyAction(`clarify-${clarificationId}`);
    try {
      const res = await fetch("/api/reports/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          userId: clientState.activeUser.id,
          clarificationId,
          locationId,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        trace?: TriageItemTrace;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Failed to clarify location");
      }
      if (data.trace) {
        setLastSubmissionsByUser((prev) => ({
          ...prev,
          [clientState.activeUser.id]: {
            ok: true,
            items: [data.trace!],
            message: data.message || "Clarified location and routed report",
          },
        }));
      }
      await fetchState(clientState.activeUser.id);
      showToast("success", data.message || "Location clarified and routed");
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to clarify location"
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleJoinIssue = async (issueId: string) => {
    if (!clientState) return;
    setBusyAction(`join-${issueId}`);
    try {
      const res = await fetch(
        `/api/issues/${encodeURIComponent(issueId)}/join`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ userId: clientState.activeUser.id }),
        }
      );
      const data = (await res.json()) as {
        ok?: boolean;
        held?: boolean;
        alreadyJoined?: boolean;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Could not join issue");
      }
      await fetchState(clientState.activeUser.id);
      showToast(
        data.held ? "info" : "success",
        data.message ||
          (data.held
            ? "Action held for registrar brigade review"
            : "Added your Me too confirmation")
      );
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to join issue"
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleVoteIssue = async (
    issueId: string,
    choice: "CONFIRM" | "DISPUTE",
    comment?: string
  ) => {
    if (!clientState) return;
    setBusyAction(`vote-${issueId}`);
    try {
      const res = await fetch(
        `/api/issues/${encodeURIComponent(issueId)}/vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            userId: clientState.activeUser.id,
            choice,
            comment: comment?.trim() || undefined,
          }),
        }
      );
      const data = (await res.json()) as {
        ok?: boolean;
        held?: boolean;
        outcome?: string;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Vote failed");
      }
      await fetchState(clientState.activeUser.id);
      showToast(
        data.held ? "info" : "success",
        data.message || `Vote recorded (${data.outcome ?? choice})`
      );
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to record vote"
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleUpdateStatus = async (
    issueId: string,
    status: IssueStatus,
    note?: string
  ) => {
    if (!clientState) return;
    setBusyAction(`status-${issueId}`);
    try {
      const res = await fetch(
        `/api/issues/${encodeURIComponent(issueId)}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            userId: clientState.activeUser.id,
            status,
            note,
          }),
        }
      );
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Failed to update issue status");
      }
      await fetchState(clientState.activeUser.id);
      showToast("success", data.message || `Status updated to ${status}`);
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to update status"
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleOverrideIssue = async (
    issueId: string,
    payload: {
      department?: Department;
      priority?: PriorityLevel | "CLEAR";
      reason: string;
    }
  ) => {
    if (!clientState) return;
    setBusyAction(`override-${issueId}`);
    try {
      const res = await fetch(
        `/api/issues/${encodeURIComponent(issueId)}/override`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            userId: clientState.activeUser.id,
            ...payload,
          }),
        }
      );
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Override failed");
      }
      await fetchState(clientState.activeUser.id);
      showToast("success", data.message || "Registrar override applied");
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to apply override"
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleResolveBrigade = async (
    alertId: string,
    decision: "confirm" | "dismiss"
  ) => {
    if (!clientState) return;
    setBusyAction(`brigade-${alertId}`);
    try {
      const res = await fetch(
        `/api/admin/brigade/${encodeURIComponent(alertId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            userId: clientState.activeUser.id,
            decision,
          }),
        }
      );
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Failed to process brigade alert");
      }
      await fetchState(clientState.activeUser.id);
      showToast(
        "success",
        data.message ||
          (decision === "confirm"
            ? "Brigade confirmed: -10 trust applied and held actions discarded"
            : "False alarm dismissed: held votes released and priority recomputed")
      );
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to resolve brigade alert"
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleGenerateSummary = async () => {
    if (!clientState) return;
    setBusyAction("admin-summary");
    try {
      const res = await fetch("/api/admin/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ userId: clientState.activeUser.id }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        summary?: AdminSummaryResult;
        message?: string;
      };
      if (!res.ok || !data.ok || !data.summary) {
        throw new Error(data.message || "Failed to generate briefing");
      }
      setAdminSummary(data.summary);
      showToast("success", data.message || "Executive briefing generated");
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to generate briefing"
      );
    } finally {
      setBusyAction(null);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f5f7fa] p-6 text-[#4b5565]">
        <Loader2
          className="h-6 w-6 animate-spin text-[#1d4ed8]"
          strokeWidth={1.5}
        />
        <p className="mt-3 text-[14px] leading-5 font-normal">
          Loading ReportFix dispatch console
        </p>
      </div>
    );
  }

  if (loadError && !clientState) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f5f7fa] p-6">
        <div className="w-full max-w-md rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff] p-6 text-center">
          <AlertCircle
            className="mx-auto h-6 w-6 text-[#dc2626]"
            strokeWidth={1.5}
          />
          <h1 className="mt-3 text-[16px] leading-6 font-medium text-[#111827]">
            Unable to connect to ReportFix API
          </h1>
          <p className="mt-1 text-[13px] leading-5 text-[#4b5565]">
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => void fetchState()}
            className="mt-4 h-9 rounded-[8px] bg-[#111827] px-4 text-[13px] leading-5 font-medium text-[#ffffff] hover:bg-[#1f2937] transition-colors duration-150 ease-craft"
          >
            Retry connection
          </button>
        </div>
      </div>
    );
  }

  if (!clientState) return null;

  const { activeUser } = clientState;

  const currentNav: WorkspaceNavId =
    activeUser.role === "student"
      ? studentNav
      : activeUser.role === "staff"
      ? staffNav
      : adminNav;

  const handleSelectNav = (nav: WorkspaceNavId) => {
    if (activeUser.role === "student") {
      setStudentNav(nav as StudentNavId);
    } else if (activeUser.role === "staff") {
      setStaffNav(nav as StaffNavId);
    } else {
      setAdminNav(nav as AdminNavId);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f5f7fa] text-[#111827]">
      {/* Left Sidebar (264px fixed desktop shell, responsive drawer on mobile) */}
      <AppSidebar
        activeUser={activeUser}
        clientState={clientState}
        activeNav={currentNav}
        onSelectNav={handleSelectNav}
        onRenameStudent={handleRenameStudent}
        busyAction={busyAction}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      {/* Right Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <JudgeBar
          activeUser={activeUser}
          users={clientState.users}
          busyAction={busyAction}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onSwitchUser={handleSwitchUser}
          onCreateStudent={handleCreateStudent}
          onRenameStudent={handleRenameStudent}
          onReset={handleReset}
          onRefresh={handleRefresh}
        />

        {/* Toast Notification */}
        {toast && (
          <div className="fixed right-6 bottom-6 z-50 max-w-md animate-enter">
            <div className="flex items-start gap-3 rounded-[10px] border border-[#111827]/[0.08] bg-[#ffffff] px-4 py-3 text-[13px] leading-5 text-[#111827] shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
              {toast.kind === "error" ? (
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#dc2626]"
                  strokeWidth={1.5}
                />
              ) : (
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#16a34a]"
                  strokeWidth={1.5}
                />
              )}
              <span className="flex-1">{toast.text}</span>
              <button
                type="button"
                onClick={() => setToast(null)}
                aria-label="Dismiss notification"
                className="text-[#6b7487] hover:text-[#111827]"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6 md:px-8 md:py-8">
          {activeUser.role === "student" && (
            <StudentWorkspace
              activeUser={activeUser}
              issues={clientState.issues}
              trendingIssues={clientState.trendingIssues}
              myIssues={clientState.myIssues}
              pendingClarifications={clientState.pendingClarifications}
              campusLocations={clientState.campusLocations}
              lastSubmission={lastSubmissionsByUser[activeUser.id] ?? null}
              busyAction={busyAction}
              activeSection={studentNav}
              onSelectSection={setStudentNav}
              onSubmitReport={handleSubmitReport}
              onClarify={handleClarify}
              onJoinIssue={handleJoinIssue}
              onVoteIssue={handleVoteIssue}
            />
          )}

          {activeUser.role === "staff" && (
            <StaffQueueView
              activeUser={activeUser}
              issues={clientState.issues}
              busyAction={busyAction}
              activeFilter={staffNav}
              onSelectFilter={setStaffNav}
              onUpdateStatus={handleUpdateStatus}
            />
          )}

          {activeUser.role === "admin" && (
            <AdminOversightView
              activeUser={activeUser}
              users={clientState.users}
              issues={clientState.issues}
              securityAlerts={clientState.securityAlerts}
              stats={clientState.stats}
              adminSummary={adminSummary}
              busyAction={busyAction}
              activeSection={adminNav}
              onSelectSection={setAdminNav}
              onUpdateStatus={handleUpdateStatus}
              onOverrideIssue={handleOverrideIssue}
              onResolveBrigade={handleResolveBrigade}
              onGenerateSummary={handleGenerateSummary}
            />
          )}
        </main>
      </div>
    </div>
  );
}
