"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
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
  UserRole,
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
import { BrandMark, CRAFT_EASE } from "@/components/MotionPrimitives";
import { stripTrailingPeriod } from "@/lib/format-ui";

const SESSION_STORAGE_KEY = "reportfix_active_user_id";

interface ToastMessage {
  id: number;
  kind: "success" | "error" | "info";
  text: string;
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

  // Remember last selected user per role for seamless 1-click role switching
  const lastUserByRole = useRef<Partial<Record<UserRole, string>>>({});

  // Navigation state synchronized with AppSidebar
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
    }, 5200);
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
        lastUserByRole.current[payload.activeUser.role] = payload.activeUser.id;
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

  const handleSwitchRole = async (role: UserRole) => {
    if (!clientState || clientState.activeUser.role === role) return;
    const remembered = lastUserByRole.current[role];
    const matchRemembered = remembered
      ? clientState.users.find((u) => u.id === remembered && u.role === role)
      : undefined;
    const fallback = clientState.users.find((u) => u.role === role);
    const target = matchRemembered ?? fallback;
    if (target) {
      await handleSwitchUser(target.id);
    }
  };

  const handleRefresh = async () => {
    setBusyAction("refresh");
    try {
      await fetchState(activeUserId);
      showToast("info", "Synced latest state");
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
        `Switched to ${data.user.name} · Trust ${data.user.trustScore}`
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
      showToast("success", `Renamed to ${data.user.name}`);
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
        mode === "clean" ? "Reset to clean baseline" : "Reset with sample tickets"
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
        data.message || `Triaged ${data.items.length} item(s)`
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
        throw new Error(data.message || "Failed to confirm room");
      }
      if (data.trace) {
        setLastSubmissionsByUser((prev) => ({
          ...prev,
          [clientState.activeUser.id]: {
            ok: true,
            items: [data.trace!],
            message: data.message || "Room confirmed and routed",
          },
        }));
      }
      await fetchState(clientState.activeUser.id);
      showToast("success", data.message || "Room confirmed and routed");
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to confirm room"
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
          (data.held ? "Held for brigade review" : "Joined issue")
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
        data.message || `Vote recorded`
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
        throw new Error(data.message || "Failed to update status");
      }
      await fetchState(clientState.activeUser.id);
      showToast("success", data.message || `Status updated`);
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
      showToast("success", data.message || "Override applied");
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
        throw new Error(data.message || "Failed to process alert");
      }
      await fetchState(clientState.activeUser.id);
      showToast(
        "success",
        data.message ||
          (decision === "confirm"
            ? "Brigade confirmed · -10 trust applied"
            : "Alert dismissed · held votes released")
      );
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to resolve alert"
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleSimulateAttack = async () => {
    if (!clientState) return;
    setBusyAction("simulate-attack");
    try {
      const res = await fetch("/api/admin/simulate-attack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ userId: clientState.activeUser.id }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Failed to simulate attack");
      }
      await fetchState(clientState.activeUser.id);
      showToast(
        "success",
        data.message || "Simulated security attack logged"
      );
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to simulate attack"
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
        throw new Error(data.message || "Failed to generate AI Admin Summary");
      }
      setAdminSummary(data.summary);
      showToast("success", "AI Admin Summary generated");
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to generate AI Admin Summary"
      );
    } finally {
      setBusyAction(null);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fafafa] p-6 text-[#525252]">
        <div className="flex items-center gap-3">
          <BrandMark className="h-6 w-6" />
          <Loader2
            className="h-4 w-4 animate-spin text-[#0f766e]"
            strokeWidth={1.75}
          />
        </div>
        <p className="mt-3 text-[13px] leading-5 text-[#737373]">
          Loading ReportFix
        </p>
      </div>
    );
  }

  if (loadError && !clientState) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fafafa] p-6">
        <div className="surface-card w-full max-w-sm rounded-[14px] p-6 text-center">
          <AlertCircle
            className="mx-auto h-5 w-5 text-[#dc2626]"
            strokeWidth={1.5}
          />
          <h1 className="mt-3 text-[15px] leading-5 font-medium text-[#171717]">
            Connection failed
          </h1>
          <p className="mt-1 text-[13px] leading-5 text-[#525252]">
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => void fetchState()}
            className="mt-4 h-9 rounded-[8px] bg-[#171717] px-4 text-[13px] leading-5 font-medium text-[#ffffff] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-[#262626] press-tactile"
          >
            Retry
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
    <div className="flex min-h-screen bg-[#f7f7f6] text-[#171717]">
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

      <div className="flex min-w-0 flex-1 flex-col">
        <JudgeBar
          activeUser={activeUser}
          users={clientState.users}
          busyAction={busyAction}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onSwitchUser={handleSwitchUser}
          onSwitchRole={handleSwitchRole}
          onCreateStudent={handleCreateStudent}
          onRenameStudent={handleRenameStudent}
          onReset={handleReset}
          onRefresh={handleRefresh}
        />

        {/* Animated Toast Notification with subtle decay rail */}
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: CRAFT_EASE }}
              className="fixed right-6 bottom-6 z-50 max-w-md overflow-hidden rounded-[12px] border border-[#171717]/[0.1] bg-[#171717] text-[#fafafa] shadow-[0_14px_36px_rgba(0,0,0,0.18)]"
            >
              <div className="flex items-start gap-2.5 px-4 py-3 text-[13px] leading-5">
                {toast.kind === "error" ? (
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#f87171]"
                    strokeWidth={1.5}
                  />
                ) : (
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#4ade80]"
                    strokeWidth={1.5}
                  />
                )}
                <span className="flex-1">{toast.text}</span>
                <button
                  type="button"
                  onClick={() => setToast(null)}
                  aria-label="Dismiss"
                  className="text-[#a3a3a3] hover:text-[#ffffff] transition-colors"
                >
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
              <div
                className={`h-[2px] w-full animate-toast-progress ${
                  toast.kind === "error" ? "bg-[#f87171]" : "bg-[#14b8a6]"
                }`}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-6 md:px-8 md:py-7">
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
              onSimulateAttack={handleSimulateAttack}
              onGenerateSummary={handleGenerateSummary}
            />
          )}
        </main>
      </div>
    </div>
  );
}
