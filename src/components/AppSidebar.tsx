"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
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
import { getInitials, getTrustMeta } from "@/lib/format-ui";
import { BrandMark, CRAFT_EASE } from "@/components/MotionPrimitives";

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

interface NavItemConfig {
  id: WorkspaceNavId;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  count?: number | string;
  alertColor?: "amber" | "red";
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

  const trustMeta = getTrustMeta(activeUser.trustScore);
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

  const navItems: NavItemConfig[] =
    activeUser.role === "student"
      ? [
          {
            id: "report",
            label: "Report",
            icon: FileText,
            count:
              clientState.pendingClarifications.length > 0
                ? clientState.pendingClarifications.length
                : undefined,
            alertColor:
              clientState.pendingClarifications.length > 0
                ? "amber"
                : undefined,
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
            label: "Rooms",
            icon: MapPin,
            count: clientState.campusLocations.length,
          },
        ]
      : activeUser.role === "staff"
      ? [
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
            alertColor: staffCounts.critical > 0 ? "red" : undefined,
          },
          {
            id: "RESOLVED",
            label: "Awaiting votes",
            icon: CheckCircle2,
            count: staffCounts.resolved,
          },
          {
            id: "REOPENED",
            label: "Reopened",
            icon: RotateCcw,
            count: staffCounts.reopened,
            alertColor: staffCounts.reopened > 0 ? "red" : undefined,
          },
          {
            id: "ALL",
            label: "All tickets",
            icon: Layers,
            count: staffCounts.all,
          },
        ]
      : [
          {
            id: "all",
            label: "Overview",
            icon: Layers,
            count: publicIssuesCount,
          },
          {
            id: "vault",
            label: "Safety vault",
            icon: Lock,
            count: confidentialCount,
          },
          {
            id: "security",
            label: "Security",
            icon: ShieldAlert,
            count: openSecurityCount,
            alertColor: openSecurityCount > 0 ? "red" : undefined,
          },
          {
            id: "trust",
            label: "Trust",
            icon: Users,
            count: studentUsersCount,
          },
          {
            id: "briefing",
            label: "AI Admin Summary",
            icon: ClipboardList,
          },
        ];

  const sectionLabel =
    activeUser.role === "student"
      ? "Workspace"
      : activeUser.role === "staff"
      ? `${activeUser.department} desk`
      : "Registrar";

  const handleNavClick = (id: WorkspaceNavId) => {
    onSelectNav(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <aside className="flex h-full w-[256px] shrink-0 flex-col border-r border-[#171717]/[0.09] bg-[#f0f0ee] text-[#171717] select-none">
      {/* Brand header — exact 56px height matching topbar */}
      <div className="flex h-14 items-center justify-between border-b border-[#171717]/[0.08] px-4">
        <div className="flex items-center gap-2.5">
          <BrandMark className="h-6 w-6 shrink-0" />
          <span className="text-[16px] leading-none font-semibold tracking-[-0.015em] text-[#171717]">
            ReportFix
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation"
          className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#737373] hover:bg-[#e7e7e5] hover:text-[#171717] lg:hidden transition-colors duration-150 ease-craft"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Compact operator badge — clean 2 lines, zero prose walls */}
      <div className="px-4 pt-4">
        <div className="rounded-[12px] border border-[#171717]/[0.08] bg-[#ffffff] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          {editingName && canRenameActiveStudent ? (
            <form
              onSubmit={handleSaveRename}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                maxLength={60}
                autoFocus
                placeholder="Student name"
                className="h-7 min-w-0 flex-1 rounded-[6px] border border-[#0f766e] bg-[#fafafa] px-2 text-[13px] leading-4 text-[#171717] placeholder:text-[#737373] focus:outline-none"
              />
              <button
                type="submit"
                disabled={busyAction !== null || !draftName.trim()}
                aria-label="Save student name"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[#171717] text-[#ffffff] hover:bg-[#262626] disabled:opacity-50 press-tactile"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => setEditingName(false)}
                aria-label="Cancel rename"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] border border-[#171717]/[0.08] text-[#737373] hover:bg-[#efefed] hover:text-[#171717] press-tactile"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#f3f3f2] font-mono text-[11px] font-medium text-[#171717] border border-[#171717]/[0.06]">
                {getInitials(activeUser.name)}
                <span
                  className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#ffffff] ${
                    activeUser.role === "student"
                      ? trustMeta.dotColor
                      : activeUser.role === "staff"
                      ? "bg-[#0f766e]"
                      : "bg-[#171717]"
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-[14px] leading-5 font-medium text-[#171717]">
                    {activeUser.name}
                  </span>
                  {canRenameActiveStudent && (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftName(activeUser.name);
                        setEditingName(true);
                      }}
                      title="Rename student"
                      aria-label="Rename student"
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] text-[#737373] hover:bg-[#efefed] hover:text-[#171717] press-tactile"
                    >
                      <Pencil className="h-3 w-3" strokeWidth={1.5} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] leading-4 text-[#737373] tabular-nums">
                  {activeUser.role === "student" ? (
                    <>
                      <span>{trustMeta.tier}</span>
                      <span>·</span>
                      <span className="text-[#171717] font-medium">
                        {activeUser.trustScore}
                      </span>
                      <span>·</span>
                      <span>{trustMeta.weight}</span>
                    </>
                  ) : activeUser.role === "staff" ? (
                    <>
                      <span>{activeUser.department}</span>
                      <span>·</span>
                      <span>{staffCounts.active} active</span>
                    </>
                  ) : (
                    <>
                      <span>Registrar</span>
                      <span>·</span>
                      <span>6 depts</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dense role navigation — 36px rows, 4px gap, 24px above / 8px below label */}
      <nav className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="mt-6 mb-2 px-2 text-[12px] leading-4 font-normal text-[#737373]">
          {sectionLabel}
        </div>
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`group relative flex h-9 w-full items-center justify-between rounded-[8px] px-2.5 text-[14px] leading-5 transition-colors duration-150 ease-craft press-tactile ${
                  active
                    ? "text-[#171717] font-medium"
                    : "text-[#525252] font-normal hover:bg-[#e9e9e7]/70 hover:text-[#171717]"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId={`sidebar-pill-${activeUser.role}`}
                    transition={{ duration: 0.22, ease: CRAFT_EASE }}
                    className="absolute inset-0 rounded-[8px] border border-[#171717]/[0.08] bg-[#ffffff] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  />
                )}
                {active && (
                  <motion.span
                    layoutId={`sidebar-accent-${activeUser.role}`}
                    transition={{ duration: 0.22, ease: CRAFT_EASE }}
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[#0f766e]"
                  />
                )}
                <span className="relative z-10 flex min-w-0 items-center gap-2.5">
                  <span className="flex w-5 shrink-0 items-center justify-center">
                    <Icon
                      className={`h-4 w-4 transition-colors duration-150 ${
                        active
                          ? "text-[#0f766e]"
                          : "text-[#737373] group-hover:text-[#525252]"
                      }`}
                      strokeWidth={1.5}
                    />
                  </span>
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="relative z-10 flex items-center gap-1.5">
                  {item.alertColor && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        item.alertColor === "red"
                          ? "bg-[#dc2626]"
                          : "bg-[#b45309]"
                      }`}
                    />
                  )}
                  {item.count !== undefined && (
                    <span
                      className={`font-mono text-[12px] leading-4 tabular-nums ${
                        active ? "text-[#171717]" : "text-[#737373]"
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
        {/* Quiet campus pulse directly below navigation — never overlapped by dev indicator */}
        <div className="mt-6">
          <div className="mb-2 px-2 text-[12px] leading-4 font-normal text-[#737373]">
            Campus pulse
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="rounded-[9px] border border-[#171717]/[0.08] bg-[#ffffff] py-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="font-mono text-[13px] leading-4 font-medium text-[#171717] tabular-nums">
                {clientState.stats.totalActivePublic}
              </div>
              <div className="mt-0.5 text-[11px] leading-3.5 text-[#737373]">
                Open
              </div>
            </div>
            <div className="rounded-[9px] border border-[#171717]/[0.08] bg-[#ffffff] py-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div
                className={`font-mono text-[13px] leading-4 font-medium tabular-nums ${
                  clientState.stats.criticalSafetyCount > 0
                    ? "text-[#dc2626]"
                    : "text-[#171717]"
                }`}
              >
                {clientState.stats.criticalSafetyCount}
              </div>
              <div className="mt-0.5 text-[11px] leading-3.5 text-[#737373]">
                Critical
              </div>
            </div>
            <div className="rounded-[9px] border border-[#171717]/[0.08] bg-[#ffffff] py-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="font-mono text-[13px] leading-4 font-medium text-[#171717] tabular-nums">
                {clientState.stats.resolvedAwaitingVotes}
              </div>
              <div className="mt-0.5 text-[11px] leading-3.5 text-[#737373]">
                Voting
              </div>
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );

  return (
    <>
      {/* Desktop fixed left sidebar */}
      <div className="hidden lg:block lg:w-[256px] lg:shrink-0">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </div>

      {/* Mobile animated overlay drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div
            className="fixed inset-0 z-50 flex lg:hidden"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: CRAFT_EASE }}
              className="fixed inset-0 bg-[#171717]/30 backdrop-blur-[2px]"
              onClick={onCloseMobile}
            />
            <motion.div
              initial={{ x: -264 }}
              animate={{ x: 0 }}
              exit={{ x: -264 }}
              transition={{ duration: 0.24, ease: CRAFT_EASE }}
              className="relative z-10 flex h-full"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
