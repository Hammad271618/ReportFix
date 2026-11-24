"use client";

import React, { useState } from "react";
import {
  FileText,
  Inbox,
  Globe,
  Scale,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Layers,
  Lock,
  ShieldAlert,
  Users,
  X,
  ClipboardList,
  Pencil,
  Check,
} from "lucide-react";
import type { ClientStatePayload, Issue, User } from "@/lib/types";

export type StudentNavId = "report" | "my" | "board" | "trust" | "directory";
export type StaffNavId = "ACTIVE" | "CRITICAL" | "RESOLVED" | "REOPENED" | "ALL";
export type AdminNavId = "all" | "vault" | "security" | "trust" | "briefing";

export type WorkspaceNavId = StudentNavId | StaffNavId | AdminNavId;

interface AppSidebarProps {
  activeUser: User;
  clientState: ClientStatePayload;
  activeNav: WorkspaceNavId;
  onSelectNav: (nav: WorkspaceNavId) => void;
  onRenameStudent: (userId: string, name: string) => Promise<void>;
  busyAction: string | null;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

function getStudentTrustMeta(score: number): {
  tier: string;
  weight: string;
  dotColor: string;
} {
  if (score >= 80) {
    return { tier: "Trusted", weight: "1.00x", dotColor: "bg-[#16a34a]" };
  }
  if (score >= 60) {
    return { tier: "Standard", weight: "0.80x", dotColor: "bg-[#3b82f6]" };
  }
  if (score >= 45) {
    return { tier: "Developing", weight: "0.55x", dotColor: "bg-[#d97706]" };
  }
  if (score >= 25) {
    return { tier: "Low trust", weight: "0.35x", dotColor: "bg-[#ea580c]" };
  }
  return { tier: "Restricted", weight: "0.15x", dotColor: "bg-[#dc2626]" };
}

function countStaffIssues(issues: Issue[]) {
  return {
    active: issues.filter(
      (i) =>
        i.status === "OPEN" ||
        i.status === "IN_PROGRESS" ||
        i.status === "REOPENED" ||
        i.status === "RESOLVED"
    ).length,
    critical: issues.filter(
      (i) =>
        i.priority === "CRITICAL" &&
        i.status !== "VERIFIED_RESOLVED" &&
        i.status !== "DISMISSED_SPAM"
    ).length,
    resolved: issues.filter((i) => i.status === "RESOLVED").length,
    reopened: issues.filter((i) => i.status === "REOPENED").length,
    all: issues.length,
  };
}

export function AppSidebar({
  activeUser,
  clientState,
  activeNav,
  onSelectNav,
  onRenameStudent,
  busyAction,
  mobileOpen,
  onCloseMobile,
}: AppSidebarProps) {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");

  const canRenameActiveStudent =
    activeUser.role === "student" &&
    (activeUser.isNewAccount || activeUser.id.startsWith("stu-new-"));

  const handleSaveRename = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draftName.trim();
    if (!trimmed || busyAction !== null) return;
    await onRenameStudent(activeUser.id, trimmed);
    setEditingName(false);
  };

  const trustMeta = getStudentTrustMeta(activeUser.trustScore);
  const staffCounts = countStaffIssues(clientState.issues);

  const publicIssuesCount = clientState.issues.filter(
    (i) => !i.isConfidential
  ).length;
  const confidentialCount =
    clientState.stats.confidentialCount ??
    clientState.issues.filter((i) => i.isConfidential).length;
  const openSecurityCount =
    clientState.stats.openSecurityAlertsCount ??
    clientState.securityAlerts.filter((a) => a.status === "OPEN").length;
  const studentUsersCount = clientState.users.filter(
    (u) => u.role === "student"
  ).length;

  const studentItems: Array<{
    id: StudentNavId;
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    count?: number | string;
    alertDot?: boolean;
  }> = [
    {
      id: "report",
      label: "Report & triage",
      icon: FileText,
      count:
        clientState.pendingClarifications.length > 0
          ? clientState.pendingClarifications.length
          : undefined,
      alertDot: clientState.pendingClarifications.length > 0,
    },
    {
      id: "my",
      label: "My issues",
      icon: Inbox,
      count: clientState.myIssues.length,
    },
    {
      id: "board",
      label: "Campus board",
      icon: Globe,
      count: clientState.issues.length,
    },
    {
      id: "trust",
      label: "Trust ledger",
      icon: Scale,
      count: activeUser.trustScore,
    },
    {
      id: "directory",
      label: "Room directory",
      icon: MapPin,
      count: clientState.campusLocations.length,
    },
  ];

  const staffItems: Array<{
    id: StaffNavId;
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    count: number;
    alertDot?: boolean;
  }> = [
    {
      id: "ACTIVE",
      label: "Active queue",
      icon: Inbox,
      count: staffCounts.active,
    },
    {
      id: "CRITICAL",
      label: "Critical safety",
      icon: AlertTriangle,
      count: staffCounts.critical,
      alertDot: staffCounts.critical > 0,
    },
    {
      id: "RESOLVED",
      label: "Awaiting verification",
      icon: CheckCircle2,
      count: staffCounts.resolved,
    },
    {
      id: "REOPENED",
      label: "Reopened tickets",
      icon: RotateCcw,
      count: staffCounts.reopened,
      alertDot: staffCounts.reopened > 0,
    },
    {
      id: "ALL",
      label: "All department tickets",
      icon: Layers,
      count: staffCounts.all,
    },
  ];

  const adminItems: Array<{
    id: AdminNavId;
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    count?: number;
    alertDot?: boolean;
  }> = [
    {
      id: "all",
      label: "All departments",
      icon: Layers,
      count: publicIssuesCount,
    },
    {
      id: "vault",
      label: "Confidential vault",
      icon: Lock,
      count: confidentialCount,
    },
    {
      id: "security",
      label: "Security & brigading",
      icon: ShieldAlert,
      count: openSecurityCount,
      alertDot: openSecurityCount > 0,
    },
    {
      id: "trust",
      label: "Trust inspector",
      icon: Users,
      count: studentUsersCount,
    },
    {
      id: "briefing",
      label: "Executive briefing",
      icon: ClipboardList,
    },
  ];

  const handleNavClick = (id: WorkspaceNavId) => {
    onSelectNav(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <aside className="flex h-full w-[264px] shrink-0 flex-col bg-[#0b0d14] text-[#eef0f5] border-r border-[#eef0f5]/[0.08] select-none">
      {/* Brand header — 56px tall, 16px horizontal padding */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-[#eef0f5]/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#1a1e28] border border-[#eef0f5]/[0.08] text-[#eef0f5] font-mono text-[12px] font-medium">
            RF
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[16px] leading-none font-medium tracking-tight text-[#eef0f5]">
              ReportFix
            </span>
            <span className="font-mono text-[12px] leading-4 text-[#7a8296]">
              v2.4
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation"
          className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#a3a9b8] hover:bg-[#1a1e28] hover:text-[#eef0f5] lg:hidden transition-colors duration-150 ease-craft"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Active operator card — 16px sidebar padding */}
      <div className="px-4 pt-4">
        <div className="rounded-[10px] bg-[#11141c] border border-[#eef0f5]/[0.08] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] leading-4 text-[#7a8296]">
              {activeUser.role === "student"
                ? "Student reporter"
                : activeUser.role === "staff"
                ? `${activeUser.department} facilities desk`
                : "University registrar"}
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[12px] leading-4 text-[#a3a9b8] tabular-nums">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  activeUser.role === "student"
                    ? trustMeta.dotColor
                    : activeUser.role === "staff"
                    ? "bg-[#3b82f6]"
                    : "bg-[#16a34a]"
                }`}
              />
              {activeUser.role === "student"
                ? `${activeUser.trustScore} pts`
                : activeUser.role === "staff"
                ? activeUser.department
                : "Admin"}
            </span>
          </div>
          {editingName && canRenameActiveStudent ? (
            <form onSubmit={handleSaveRename} className="mt-1.5 flex items-center gap-1.5">
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                maxLength={60}
                autoFocus
                placeholder="Enter student name"
                className="h-7 min-w-0 flex-1 rounded-[6px] border border-[#eef0f5]/20 bg-[#1a1e28] px-2 text-[13px] leading-4 text-[#eef0f5] placeholder:text-[#7a8296]"
              />
              <button
                type="submit"
                disabled={busyAction !== null || !draftName.trim()}
                aria-label="Save student name"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[#1d4ed8] text-[#ffffff] hover:bg-[#1e40af] disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => setEditingName(false)}
                aria-label="Cancel rename"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] border border-[#eef0f5]/15 text-[#a3a9b8] hover:bg-[#1a1e28]"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </form>
          ) : (
            <div className="mt-1 flex items-center justify-between gap-2">
              <div className="text-[14px] leading-5 font-medium text-[#eef0f5] truncate">
                {activeUser.name}
              </div>
              {canRenameActiveStudent && (
                <button
                  type="button"
                  onClick={() => {
                    setDraftName(activeUser.name);
                    setEditingName(true);
                  }}
                  title="Rename new student"
                  className="inline-flex shrink-0 items-center gap-1 rounded-[5px] border border-[#eef0f5]/15 bg-[#1a1e28] px-1.5 py-0.5 text-[11px] leading-4 text-[#a3a9b8] hover:text-[#eef0f5]"
                >
                  <Pencil className="h-3 w-3" strokeWidth={1.5} />
                  <span>Rename</span>
                </button>
              )}
            </div>
          )}
          <div className="mt-1 flex items-center justify-between text-[12px] leading-4 text-[#7a8296] tabular-nums">
            {activeUser.role === "student" ? (
              <>
                <span>Tier: {trustMeta.tier}</span>
                <span className="font-mono">Weight {trustMeta.weight}</span>
              </>
            ) : activeUser.role === "staff" ? (
              <>
                <span>Scoped queue</span>
                <span className="font-mono">{staffCounts.active} active</span>
              </>
            ) : (
              <>
                <span>All 6 departments</span>
                <span className="font-mono">{publicIssuesCount} tickets</span>
              </>
            )}
          </div>
          {activeUser.role === "student" && activeUser.trustExplanation && (
            <p className="mt-2 border-t border-[#eef0f5]/[0.08] pt-2 text-[11px] leading-4 text-[#a3a9b8]">
              {activeUser.trustExplanation}
            </p>
          )}
        </div>
      </div>

      {/* Dense role navigation — rows 36px tall, 4px gap, section label 24px above & 8px below */}
      <nav className="flex-1 overflow-y-auto px-4 pb-4">
        {activeUser.role === "student" && (
          <div>
            <div className="mt-6 mb-2 px-2 text-[12px] leading-4 font-normal text-[#7a8296]">
              Student workspace
            </div>
            <div className="space-y-1">
              {studentItems.map((item) => {
                const Icon = item.icon;
                const active = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`group flex h-9 w-full items-center justify-between rounded-[8px] px-2.5 text-[14px] leading-5 transition-colors duration-150 ease-craft ${
                      active
                        ? "bg-[#1a1e28] text-[#eef0f5] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                        : "text-[#a3a9b8] font-normal hover:bg-[#11141c] hover:text-[#eef0f5]"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className="flex w-5 shrink-0 items-center justify-center">
                        <Icon
                          className={`h-4 w-4 ${
                            active
                              ? "text-[#eef0f5]"
                              : "text-[#7a8296] group-hover:text-[#a3a9b8]"
                          }`}
                          strokeWidth={1.5}
                        />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      {item.alertDot && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#d97706]" />
                      )}
                      {item.count !== undefined && (
                        <span
                          className={`font-mono text-[12px] leading-4 tabular-nums ${
                            active ? "text-[#eef0f5]" : "text-[#7a8296]"
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeUser.role === "staff" && (
          <div>
            <div className="mt-6 mb-2 px-2 text-[12px] leading-4 font-normal text-[#7a8296]">
              {activeUser.department} dispatch queue
            </div>
            <div className="space-y-1">
              {staffItems.map((item) => {
                const Icon = item.icon;
                const active = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`group flex h-9 w-full items-center justify-between rounded-[8px] px-2.5 text-[14px] leading-5 transition-colors duration-150 ease-craft ${
                      active
                        ? "bg-[#1a1e28] text-[#eef0f5] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                        : "text-[#a3a9b8] font-normal hover:bg-[#11141c] hover:text-[#eef0f5]"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className="flex w-5 shrink-0 items-center justify-center">
                        <Icon
                          className={`h-4 w-4 ${
                            active
                              ? "text-[#eef0f5]"
                              : "text-[#7a8296] group-hover:text-[#a3a9b8]"
                          }`}
                          strokeWidth={1.5}
                        />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      {item.alertDot && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#dc2626]" />
                      )}
                      <span
                        className={`font-mono text-[12px] leading-4 tabular-nums ${
                          active ? "text-[#eef0f5]" : "text-[#7a8296]"
                        }`}
                      >
                        {item.count}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeUser.role === "admin" && (
          <div>
            <div className="mt-6 mb-2 px-2 text-[12px] leading-4 font-normal text-[#7a8296]">
              Registrar oversight
            </div>
            <div className="space-y-1">
              {adminItems.map((item) => {
                const Icon = item.icon;
                const active = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`group flex h-9 w-full items-center justify-between rounded-[8px] px-2.5 text-[14px] leading-5 transition-colors duration-150 ease-craft ${
                      active
                        ? "bg-[#1a1e28] text-[#eef0f5] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                        : "text-[#a3a9b8] font-normal hover:bg-[#11141c] hover:text-[#eef0f5]"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className="flex w-5 shrink-0 items-center justify-center">
                        <Icon
                          className={`h-4 w-4 ${
                            active
                              ? "text-[#eef0f5]"
                              : "text-[#7a8296] group-hover:text-[#a3a9b8]"
                          }`}
                          strokeWidth={1.5}
                        />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      {item.alertDot && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#dc2626]" />
                      )}
                      {item.count !== undefined && (
                        <span
                          className={`font-mono text-[12px] leading-4 tabular-nums ${
                            active ? "text-[#eef0f5]" : "text-[#7a8296]"
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Live campus summary ledger inside sidebar */}
        <div>
          <div className="mt-6 mb-2 px-2 text-[12px] leading-4 font-normal text-[#7a8296]">
            Campus summary
          </div>
          <div className="rounded-[10px] bg-[#11141c] border border-[#eef0f5]/[0.08] p-3 space-y-2">
            <div className="flex items-center justify-between text-[12px] leading-4">
              <span className="text-[#7a8296]">Public tickets</span>
              <span className="font-mono text-[#eef0f5] tabular-nums">
                {clientState.stats.totalActivePublic}
              </span>
            </div>
            <div className="flex items-center justify-between text-[12px] leading-4">
              <span className="text-[#7a8296]">Critical safety (98)</span>
              <span className="flex items-center gap-1.5 font-mono text-[#eef0f5] tabular-nums">
                {clientState.stats.criticalSafetyCount > 0 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#dc2626]" />
                )}
                {clientState.stats.criticalSafetyCount}
              </span>
            </div>
            <div className="flex items-center justify-between text-[12px] leading-4">
              <span className="text-[#7a8296]">Awaiting verification</span>
              <span className="font-mono text-[#eef0f5] tabular-nums">
                {clientState.stats.resolvedAwaitingVotes}
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Footer signature */}
      <div className="border-t border-[#eef0f5]/[0.08] px-4 py-3">
        <div className="flex items-center justify-between text-[12px] leading-4 text-[#7a8296]">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" />
            <span>Deterministic engine</span>
          </span>
          <span className="font-mono tabular-nums">
            {clientState.campusLocations.length} rooms
          </span>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop fixed left sidebar */}
      <div className="hidden lg:block lg:w-[264px] lg:shrink-0">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </div>

      {/* Mobile overlay drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-[#0b0d14]/60 transition-opacity duration-200 ease-craft"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 flex h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
