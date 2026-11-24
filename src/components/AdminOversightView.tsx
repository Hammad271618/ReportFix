"use client";

import React, { useMemo, useState } from "react";
import {
  Lock,
  SlidersHorizontal,
  CheckCircle2,
  PlayCircle,
  Ban,
  ChevronDown,
  Check,
  X,
  ClipboardList,
  ArrowUpRight,
} from "lucide-react";
import {
  DEPARTMENTS,
  type AdminSummaryResult,
  type ClientStatePayload,
  type Department,
  type Issue,
  type IssueStatus,
  type PriorityLevel,
  type SecurityAlert,
  type User,
} from "@/lib/types";
import type { AdminNavId } from "@/components/AppSidebar";
import {
  formatAlertStatus,
  formatAlertType,
  formatPriorityLabel,
  formatRoomCode,
  formatStatusLabel,
  formatTime,
  getTrustMeta,
  priorityScoreStyle,
  statusDotColor,
  stripTrailingPeriod,
} from "@/lib/format-ui";
import {
  AnimatedNumber,
  RevealPanel,
  SectionStage,
  StaggerCard,
} from "@/components/MotionPrimitives";
import {
  DepartmentWorkloadChart,
  TrustTrajectoryChart,
  type DeptWorkloadDatum,
} from "@/components/Charts";

interface AdminOversightViewProps {
  activeUser: User;
  users: User[];
  issues: Issue[];
  securityAlerts: SecurityAlert[];
  stats: ClientStatePayload["stats"];
  adminSummary: AdminSummaryResult | null;
  busyAction: string | null;
  activeSection?: AdminNavId;
  onSelectSection?: (section: AdminNavId) => void;
  onUpdateStatus: (
    issueId: string,
    status: IssueStatus,
    note?: string
  ) => Promise<void>;
  onOverrideIssue: (
    issueId: string,
    payload: {
      department?: Department;
      priority?: PriorityLevel | "CLEAR";
      reason: string;
    }
  ) => Promise<void>;
  onResolveBrigade: (
    alertId: string,
    decision: "confirm" | "dismiss"
  ) => Promise<void>;
  onGenerateSummary: () => Promise<void>;
}

export function AdminOversightView({
  activeUser,
  users,
  issues,
  securityAlerts,
  stats,
  adminSummary,
  busyAction,
  activeSection = "all",
  onSelectSection,
  onUpdateStatus,
  onOverrideIssue,
  onResolveBrigade,
  onGenerateSummary,
}: AdminOversightViewProps) {
  const [deptFilter, setDeptFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [expandedOverride, setExpandedOverride] = useState<
    Record<string, boolean>
  >({});
  const [overrideDept, setOverrideDept] = useState<Record<string, Department>>(
    {}
  );
  const [overridePriority, setOverridePriority] = useState<
    Record<string, PriorityLevel | "CLEAR" | "">
  >({});
  const [overrideReason, setOverrideReason] = useState<Record<string, string>>(
    {}
  );
  const [expandedStudents, setExpandedStudents] = useState<
    Record<string, boolean>
  >({});

  const isBusy = busyAction !== null;

  const switchSection = (sec: AdminNavId) => {
    onSelectSection?.(sec);
  };

  const publicIssues = useMemo(
    () =>
      issues
        .filter((i) => !i.isConfidential)
        .sort((a, b) => b.priorityScore - a.priorityScore),
    [issues]
  );

  const confidentialIssues = useMemo(
    () =>
      issues
        .filter((i) => i.isConfidential)
        .sort((a, b) => b.priorityScore - a.priorityScore),
    [issues]
  );

  const filteredPublicIssues = useMemo(() => {
    return publicIssues.filter((issue) => {
      if (deptFilter !== "ALL" && issue.department !== deptFilter) {
        return false;
      }
      if (statusFilter !== "ALL" && issue.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [publicIssues, deptFilter, statusFilter]);

  const students = useMemo(
    () => users.filter((u) => u.role === "student"),
    [users]
  );

  const userNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of users) m.set(u.id, u.name);
    return m;
  }, [users]);

  const issueById = useMemo(() => {
    const m = new Map<string, Issue>();
    for (const i of issues) m.set(i.id, i);
    return m;
  }, [issues]);

  const openAlertsCount =
    stats.openSecurityAlertsCount ??
    securityAlerts.filter((a) => a.status === "OPEN").length;
  const confidentialCount =
    stats.confidentialCount ?? confidentialIssues.length;

  // Department workload calculation for Recharts visualization
  const deptWorkload = useMemo(() => {
    const rows: DeptWorkloadDatum[] = DEPARTMENTS.map((dept) => {
      const deptIssues = publicIssues.filter(
        (i) =>
          i.department === dept &&
          i.status !== "VERIFIED_RESOLVED" &&
          i.status !== "DISMISSED_SPAM"
      );
      const criticalCount = deptIssues.filter(
        (i) => i.priority === "CRITICAL"
      ).length;
      const avgScore =
        deptIssues.length > 0
          ? Math.round(
              deptIssues.reduce((acc, cur) => acc + cur.priorityScore, 0) /
                deptIssues.length
            )
          : 0;
      const peakScore =
        deptIssues.length > 0
          ? Math.max(...deptIssues.map((i) => i.priorityScore))
          : 0;
      return {
        dept,
        activeCount: deptIssues.length,
        criticalCount,
        avgScore,
        peakScore,
      };
    });

    let leadDept: Department = "CSE";
    let bestScore = -1;
    for (const r of rows) {
      const composite = r.peakScore * 10 + r.activeCount;
      if (composite > bestScore) {
        bestScore = composite;
        leadDept = r.dept;
      }
    }

    return { rows, leadDept };
  }, [publicIssues]);

  const handleOverrideSubmit = async (issue: Issue) => {
    const reason = (overrideReason[issue.id] ?? "").trim();
    if (!reason || isBusy) return;
    const selectedDept = overrideDept[issue.id];
    const selectedPrio = overridePriority[issue.id];

    const payload: {
      department?: Department;
      priority?: PriorityLevel | "CLEAR";
      reason: string;
    } = { reason };

    if (selectedDept && selectedDept !== issue.department) {
      payload.department = selectedDept;
    }
    if (selectedPrio) {
      payload.priority = selectedPrio;
    }

    await onOverrideIssue(issue.id, payload);
    setExpandedOverride((prev) => ({ ...prev, [issue.id]: false }));
    setOverrideReason((prev) => ({ ...prev, [issue.id]: "" }));
  };

  return (
    <SectionStage stageKey={`admin-${activeUser.id}-${activeSection}`}>
      {/* SECTION 1: OVERVIEW & ALL DEPARTMENTS */}
      {activeSection === "all" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[28px] leading-[1.15] font-medium tracking-[-0.02em] text-[#171717]">
                Overview
              </h1>
              <p className="mt-1 text-[14px] leading-5 text-[#525252]">
                Campus-wide dispatch and priority overrides
              </p>
            </div>
            <button
              type="button"
              onClick={() => switchSection("briefing")}
              className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#171717]/[0.1] bg-[#ffffff] px-3 text-[13px] font-medium text-[#171717] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:bg-[#f3f3f2] press-tactile"
            >
              <ClipboardList
                className="h-4 w-4 text-[#525252]"
                strokeWidth={1.5}
              />
              <span>Briefing</span>
              <ArrowUpRight
                className="h-3.5 w-3.5 text-[#737373]"
                strokeWidth={1.5}
              />
            </button>
          </div>

          {/* 4 Compact Stat Cards */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="surface-card rounded-[12px] p-4">
              <div className="flex items-center justify-between text-[12px] text-[#737373]">
                <span>Active public</span>
                <span className="font-mono text-[11px] tabular-nums">
                  of {publicIssues.length}
                </span>
              </div>
              <div className="mt-2 font-mono text-[28px] leading-none font-medium text-[#171717]">
                <AnimatedNumber value={stats.totalActivePublic} />
              </div>
            </div>

            <div className="surface-card rounded-[12px] p-4">
              <div className="flex items-center justify-between text-[12px] text-[#737373]">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      stats.criticalSafetyCount > 0
                        ? "bg-[#dc2626]"
                        : "bg-[#d4d4d4]"
                    }`}
                  />
                  <span>Critical</span>
                </span>
                <span className="font-mono text-[11px]">Priority 98</span>
              </div>
              <div
                className={`mt-2 font-mono text-[28px] leading-none font-medium ${
                  stats.criticalSafetyCount > 0
                    ? "text-[#dc2626]"
                    : "text-[#171717]"
                }`}
              >
                <AnimatedNumber value={stats.criticalSafetyCount} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => switchSection("vault")}
              className="surface-card rounded-[12px] p-4 text-left hover:border-[#171717]/[0.16] transition-colors duration-150 press-tactile"
            >
              <div className="flex items-center justify-between text-[12px] text-[#737373]">
                <span>Safety vault</span>
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </div>
              <div className="mt-2 font-mono text-[28px] leading-none font-medium text-[#171717]">
                <AnimatedNumber value={confidentialCount} />
              </div>
            </button>

            <button
              type="button"
              onClick={() => switchSection("security")}
              className="surface-card rounded-[12px] p-4 text-left hover:border-[#171717]/[0.16] transition-colors duration-150 press-tactile"
            >
              <div className="flex items-center justify-between text-[12px] text-[#737373]">
                <span className="flex items-center gap-1.5">
                  {openAlertsCount > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#b45309]" />
                  )}
                  <span>Security alerts</span>
                </span>
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </div>
              <div
                className={`mt-2 font-mono text-[28px] leading-none font-medium ${
                  openAlertsCount > 0 ? "text-[#b45309]" : "text-[#171717]"
                }`}
              >
                <AnimatedNumber value={openAlertsCount} />
              </div>
            </button>
          </section>

          {/* Hero Moment: 2/3 Interactive Recharts Workload + 1/3 Control Ledger */}
          <section className="grid gap-5 lg:grid-cols-3">
            <div className="surface-card lg:col-span-2 rounded-[14px] p-5">
              <DepartmentWorkloadChart
                rows={deptWorkload.rows}
                leadDept={deptWorkload.leadDept}
                selectedDept={deptFilter}
                onSelectDept={(dept) =>
                  setDeptFilter((curr) => (curr === dept ? "ALL" : dept))
                }
              />
            </div>

            <div className="surface-card flex flex-col justify-between rounded-[14px] p-5">
              <div>
                <h2 className="text-[15px] leading-5 font-medium text-[#171717]">
                  Control ledger
                </h2>
                <dl className="mt-4 divide-y divide-[#171717]/[0.06] text-[13px] leading-5 tabular-nums">
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-[#525252]">Awaiting votes</dt>
                    <dd className="font-mono font-medium text-[#171717]">
                      {stats.resolvedAwaitingVotes}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-[#525252]">Reopened</dt>
                    <dd
                      className={`font-mono font-medium ${
                        stats.reopenedCount > 0
                          ? "text-[#dc2626]"
                          : "text-[#171717]"
                      }`}
                    >
                      {stats.reopenedCount}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-[#525252]">Students</dt>
                    <dd className="font-mono font-medium text-[#171717]">
                      {students.length}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-[#525252]">New accounts</dt>
                    <dd className="font-mono font-medium text-[#171717]">
                      {students.filter((s) => s.isNewAccount).length}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-[#525252]">Non-safety cap</dt>
                    <dd className="font-mono text-[#737373]">84</dd>
                  </div>
                </dl>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-[#171717]/[0.07] pt-3 text-[12px] text-[#737373]">
                <span>Brigade guard</span>
                <span className="font-mono text-[#171717]">3 new / 10m</span>
              </div>
            </div>
          </section>

          {/* Compact Filter Bar */}
          <div className="surface-card flex flex-wrap items-center justify-between gap-3 rounded-[12px] px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                aria-label="Filter by department"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="h-8 rounded-[8px] border border-[#171717]/[0.09] bg-[#fafafa] px-2.5 text-[13px] text-[#171717]"
              >
                <option value="ALL">All departments</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 rounded-[8px] border border-[#171717]/[0.09] bg-[#fafafa] px-2.5 text-[13px] text-[#171717]"
              >
                <option value="ALL">All statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="REOPENED">Reopened</option>
                <option value="RESOLVED">Awaiting votes</option>
                <option value="VERIFIED_RESOLVED">Verified</option>
                <option value="DISMISSED_SPAM">Dismissed</option>
              </select>

              {(deptFilter !== "ALL" || statusFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setDeptFilter("ALL");
                    setStatusFilter("ALL");
                  }}
                  className="h-8 rounded-[8px] px-2.5 text-[12px] font-medium text-[#0f766e] hover:bg-[#0f766e]/[0.08] press-tactile"
                >
                  Clear filters
                </button>
              )}
            </div>

            <span className="font-mono text-[12px] text-[#737373] tabular-nums">
              {filteredPublicIssues.length} / {publicIssues.length} tickets
            </span>
          </div>

          {/* Public Issues Queue */}
          <div className="space-y-3">
            {filteredPublicIssues.length === 0 ? (
              <div className="surface-card rounded-[14px] p-10 text-center text-[14px] text-[#525252]">
                No tickets match these filters
              </div>
            ) : (
              filteredPublicIssues.map((issue, idx) => {
                const overrideOpen = !!expandedOverride[issue.id];
                const currentDept =
                  issue.department === "CONFIDENTIAL_VAULT"
                    ? "CSE"
                    : issue.department;
                const roomCode = formatRoomCode(
                  issue.locationId,
                  issue.locationName
                );

                return (
                  <StaggerCard key={issue.id} index={idx}>
                    <article
                      className={`surface-card rounded-[12px] p-5 transition-colors duration-150 ease-craft hover:border-[#171717]/[0.14] ${
                        issue.priority === "CRITICAL" ? "border-[#dc2626]/30" : ""
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 flex-1 items-start gap-4">
                          <div
                            className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[10px] border font-mono tabular-nums ${priorityScoreStyle(
                              issue.priority
                            )}`}
                          >
                            <span className="text-[15px] leading-none font-medium">
                              {issue.priorityScore}
                            </span>
                            <span className="mt-0.5 text-[9px] leading-none opacity-80">
                              {formatPriorityLabel(issue.priority).slice(0, 4)}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="text-[15px] leading-[22px] font-medium text-[#171717]">
                              {issue.cleanSummary}
                            </h3>

                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] leading-4 text-[#737373]">
                              <span className="inline-flex items-center gap-1.5 text-[#525252]">
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${statusDotColor(
                                    issue.status
                                  )}`}
                                />
                                <span>{formatStatusLabel(issue.status)}</span>
                              </span>

                              <span className="font-mono text-[#171717]">
                                {roomCode}
                                <span className="ml-1.5 font-sans text-[#737373]">
                                  {issue.locationName}
                                </span>
                              </span>

                              <span className="font-medium text-[#171717]">
                                {issue.department}
                              </span>

                              <span className="font-mono tabular-nums">
                                {issue.meTooCount}{" "}
                                {issue.meTooCount === 1
                                  ? "supporter"
                                  : "supporters"}
                              </span>

                              {issue.priorityBreakdown.adminOverridePriority && (
                                <span className="rounded-[5px] bg-[#0f766e]/[0.09] px-1.5 py-0.5 font-mono text-[11px] text-[#0f766e]">
                                  Overridden
                                </span>
                              )}
                            </div>

                            <p className="mt-2 text-[13px] leading-5 text-[#525252]">
                              {stripTrailingPeriod(issue.oneLineReason)}
                            </p>

                            {issue.priorityBreakdown.adminOverrideReason && (
                              <p className="mt-1 text-[12px] text-[#0f766e]">
                                Override: {issue.priorityBreakdown.adminOverrideReason}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setOverrideDept((prev) => ({
                                ...prev,
                                [issue.id]: prev[issue.id] ?? currentDept,
                              }));
                              setExpandedOverride((prev) => ({
                                ...prev,
                                [issue.id]: !prev[issue.id],
                              }));
                            }}
                            className={`inline-flex h-8 items-center gap-1.5 rounded-[8px] border px-3 text-[13px] font-medium press-tactile ${
                              overrideOpen
                                ? "border-[#0f766e]/40 bg-[#0f766e]/[0.07] text-[#0f766e]"
                                : "border-[#171717]/[0.1] bg-[#ffffff] text-[#171717] hover:bg-[#f3f3f2]"
                            }`}
                          >
                            <SlidersHorizontal
                              className="h-3.5 w-3.5"
                              strokeWidth={1.5}
                            />
                            <span>Override</span>
                          </button>

                          <button
                            type="button"
                            disabled={isBusy || issue.status === "IN_PROGRESS"}
                            onClick={() =>
                              onUpdateStatus(issue.id, "IN_PROGRESS")
                            }
                            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#171717]/[0.1] bg-[#ffffff] px-3 text-[13px] font-medium text-[#171717] hover:bg-[#f3f3f2] disabled:opacity-40 press-tactile"
                          >
                            <PlayCircle
                              className="h-3.5 w-3.5 text-[#525252]"
                              strokeWidth={1.5}
                            />
                            <span>In progress</span>
                          </button>

                          <button
                            type="button"
                            disabled={
                              isBusy ||
                              issue.status === "RESOLVED" ||
                              issue.status === "VERIFIED_RESOLVED"
                            }
                            onClick={() => onUpdateStatus(issue.id, "RESOLVED")}
                            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-[#171717] px-3 text-[13px] font-medium text-[#ffffff] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-[#262626] disabled:opacity-40 press-tactile"
                          >
                            <CheckCircle2
                              className="h-3.5 w-3.5"
                              strokeWidth={1.5}
                            />
                            <span>Resolve</span>
                          </button>

                          <button
                            type="button"
                            disabled={
                              isBusy || issue.status === "DISMISSED_SPAM"
                            }
                            onClick={() =>
                              onUpdateStatus(issue.id, "DISMISSED_SPAM")
                            }
                            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#171717]/[0.09] bg-[#ffffff] px-3 text-[13px] text-[#dc2626] hover:bg-[#dc2626]/[0.06] disabled:opacity-40 press-tactile"
                          >
                            <Ban className="h-3.5 w-3.5" strokeWidth={1.5} />
                            <span>Spam</span>
                          </button>
                        </div>
                      </div>

                      <RevealPanel open={overrideOpen}>
                        <div className="mt-4 rounded-[10px] border border-[#171717]/[0.07] bg-[#fafafa] p-4">
                          <div className="grid gap-3 sm:grid-cols-4">
                            <div>
                              <label className="mb-1 block text-[11px] text-[#737373]">
                                Department
                              </label>
                              <select
                                value={overrideDept[issue.id] ?? currentDept}
                                onChange={(e) =>
                                  setOverrideDept((prev) => ({
                                    ...prev,
                                    [issue.id]: e.target.value as Department,
                                  }))
                                }
                                className="h-9 w-full rounded-[8px] border border-[#171717]/[0.1] bg-[#ffffff] px-3 text-[13px] text-[#171717]"
                              >
                                {DEPARTMENTS.map((d) => (
                                  <option key={d} value={d}>
                                    {d}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="mb-1 block text-[11px] text-[#737373]">
                                Priority
                              </label>
                              <select
                                value={overridePriority[issue.id] ?? ""}
                                onChange={(e) =>
                                  setOverridePriority((prev) => ({
                                    ...prev,
                                    [issue.id]: e.target.value as
                                      | PriorityLevel
                                      | "CLEAR"
                                      | "",
                                  }))
                                }
                                className="h-9 w-full rounded-[8px] border border-[#171717]/[0.1] bg-[#ffffff] px-3 text-[13px] text-[#171717]"
                              >
                                <option value="">Keep computed</option>
                                <option value="CRITICAL">Critical (98)</option>
                                <option value="HIGH">High (78)</option>
                                <option value="MEDIUM">Medium (52)</option>
                                <option value="LOW">Low (25)</option>
                                <option value="CLEAR">Revert to computed</option>
                              </select>
                            </div>

                            <div className="sm:col-span-2">
                              <label className="mb-1 block text-[11px] text-[#737373]">
                                Audit reason
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={overrideReason[issue.id] ?? ""}
                                  onChange={(e) =>
                                    setOverrideReason((prev) => ({
                                      ...prev,
                                      [issue.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="Reason for override"
                                  className="h-9 flex-1 rounded-[8px] border border-[#171717]/[0.1] bg-[#ffffff] px-3 text-[13px] text-[#171717] placeholder:text-[#737373]"
                                />
                                <button
                                  type="button"
                                  disabled={
                                    isBusy ||
                                    !(overrideReason[issue.id] ?? "").trim()
                                  }
                                  onClick={() => handleOverrideSubmit(issue)}
                                  className="h-9 rounded-[8px] bg-[#171717] px-4 text-[13px] font-medium text-[#ffffff] hover:bg-[#262626] disabled:opacity-40 press-tactile"
                                >
                                  Apply
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </RevealPanel>
                    </article>
                  </StaggerCard>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: SAFETY VAULT */}
      {activeSection === "vault" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-[28px] leading-[1.15] font-medium tracking-[-0.02em] text-[#171717]">
              Safety vault
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-[14px] leading-5 text-[#525252]">
              <Lock className="h-3.5 w-3.5 text-[#737373]" strokeWidth={1.5} />
              <span>Anonymous confidential reports · hidden from public boards</span>
            </p>
          </div>

          {confidentialIssues.length === 0 ? (
            <div className="surface-card rounded-[14px] p-10 text-center text-[14px] text-[#525252]">
              No confidential cases in the vault
            </div>
          ) : (
            <div className="space-y-3">
              {confidentialIssues.map((issue, idx) => {
                const roomCode = formatRoomCode(
                  issue.locationId,
                  issue.locationName
                );
                return (
                  <StaggerCard key={issue.id} index={idx}>
                    <article className="surface-card rounded-[12px] p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 flex-1 items-start gap-4">
                          <div
                            className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[10px] border font-mono tabular-nums ${priorityScoreStyle(
                              issue.priority
                            )}`}
                          >
                            <span className="text-[15px] leading-none font-medium">
                              {issue.priorityScore}
                            </span>
                            <span className="mt-0.5 text-[9px] leading-none opacity-80">
                              {formatPriorityLabel(issue.priority).slice(0, 4)}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="text-[15px] leading-[22px] font-medium text-[#171717]">
                              {issue.cleanSummary}
                            </h3>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#737373]">
                              <span className="inline-flex items-center gap-1 font-medium text-[#171717]">
                                <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
                                <span>Anonymous</span>
                              </span>
                              <span className="inline-flex items-center gap-1.5 text-[#525252]">
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${statusDotColor(
                                    issue.status
                                  )}`}
                                />
                                <span>{formatStatusLabel(issue.status)}</span>
                              </span>
                              <span className="font-mono text-[#171717]">
                                {roomCode}
                                <span className="ml-1.5 font-sans text-[#737373]">
                                  {issue.locationName}
                                </span>
                              </span>
                              <span className="font-mono">
                                {formatTime(issue.createdAt)}
                              </span>
                            </div>
                            <p className="mt-2 text-[13px] leading-5 text-[#525252]">
                              {stripTrailingPeriod(issue.oneLineReason)}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={isBusy || issue.status === "IN_PROGRESS"}
                            onClick={() =>
                              onUpdateStatus(issue.id, "IN_PROGRESS")
                            }
                            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#171717]/[0.1] bg-[#ffffff] px-3 text-[13px] font-medium text-[#171717] hover:bg-[#f3f3f2] disabled:opacity-40 press-tactile"
                          >
                            <PlayCircle
                              className="h-3.5 w-3.5 text-[#525252]"
                              strokeWidth={1.5}
                            />
                            <span>In progress</span>
                          </button>

                          <button
                            type="button"
                            disabled={
                              isBusy ||
                              issue.status === "RESOLVED" ||
                              issue.status === "VERIFIED_RESOLVED"
                            }
                            onClick={() => onUpdateStatus(issue.id, "RESOLVED")}
                            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-[#171717] px-3 text-[13px] font-medium text-[#ffffff] hover:bg-[#262626] disabled:opacity-40 press-tactile"
                          >
                            <CheckCircle2
                              className="h-3.5 w-3.5"
                              strokeWidth={1.5}
                            />
                            <span>Resolve</span>
                          </button>

                          <button
                            type="button"
                            disabled={
                              isBusy || issue.status === "DISMISSED_SPAM"
                            }
                            onClick={() =>
                              onUpdateStatus(issue.id, "DISMISSED_SPAM")
                            }
                            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#171717]/[0.09] bg-[#ffffff] px-3 text-[13px] text-[#525252] hover:bg-[#f3f3f2] disabled:opacity-40 press-tactile"
                          >
                            <Ban className="h-3.5 w-3.5" strokeWidth={1.5} />
                            <span>Close</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  </StaggerCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: SECURITY */}
      {activeSection === "security" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-[28px] leading-[1.15] font-medium tracking-[-0.02em] text-[#171717]">
              Security
            </h1>
            <p className="mt-1 text-[14px] leading-5 text-[#525252]">
              Brigade bursts and blocked prompt-injection attempts
            </p>
          </div>

          {securityAlerts.length === 0 ? (
            <div className="surface-card rounded-[14px] p-10 text-center text-[14px] text-[#525252]">
              No security alerts logged
            </div>
          ) : (
            <div className="space-y-3">
              {securityAlerts.map((alert, idx) => {
                const linkedIssue = alert.issueId
                  ? issueById.get(alert.issueId)
                  : undefined;
                const isOpenBrigade =
                  alert.type === "BRIGADING_SUSPECTED" &&
                  alert.status === "OPEN";

                return (
                  <StaggerCard key={alert.id} index={idx}>
                    <article
                      className={`surface-card rounded-[12px] p-5 ${
                        alert.status === "OPEN" ? "border-[#b45309]/35" : ""
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2.5 text-[12px]">
                            <span className="inline-flex items-center gap-1.5 font-medium text-[#171717]">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  alert.severity === "HIGH"
                                    ? "bg-[#dc2626]"
                                    : "bg-[#b45309]"
                                }`}
                              />
                              <span>{formatAlertType(alert.type)}</span>
                            </span>
                            <span className="font-mono text-[#737373]">
                              {formatAlertStatus(alert.status)}
                            </span>
                            <span className="font-mono text-[#737373] tabular-nums">
                              {formatTime(alert.createdAt)}
                            </span>
                          </div>

                          <h3 className="text-[15px] leading-[22px] font-medium text-[#171717]">
                            {alert.title}
                          </h3>
                          <p className="text-[13px] leading-5 text-[#525252]">
                            {stripTrailingPeriod(alert.detail)}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[12px] text-[#737373]">
                            <span>
                              Accounts:{" "}
                              <strong className="font-medium text-[#171717]">
                                {alert.involvedUserIds
                                  .map((uid) => userNameMap.get(uid) ?? uid)
                                  .join(", ") || "None"}
                              </strong>
                            </span>
                            {linkedIssue && (
                              <span className="tabular-nums">
                                Ticket:{" "}
                                <span className="font-medium text-[#171717]">
                                  {linkedIssue.cleanSummary}
                                </span>{" "}
                                ({linkedIssue.heldBrigadeActions.length} held)
                              </span>
                            )}
                          </div>
                        </div>

                        {isOpenBrigade ? (
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                onResolveBrigade(alert.id, "confirm")
                              }
                              className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-[#dc2626] px-3 text-[13px] font-medium text-[#ffffff] hover:bg-[#b91c1c] disabled:opacity-50 press-tactile"
                            >
                              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                              <span>Confirm (-10)</span>
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                onResolveBrigade(alert.id, "dismiss")
                              }
                              className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#171717]/[0.1] bg-[#ffffff] px-3 text-[13px] font-medium text-[#171717] hover:bg-[#f3f3f2] disabled:opacity-50 press-tactile"
                            >
                              <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                              <span>Release votes</span>
                            </button>
                          </div>
                        ) : (
                          alert.status === "OPEN" && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                onResolveBrigade(alert.id, "confirm")
                              }
                              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] border border-[#171717]/[0.1] bg-[#ffffff] px-3 text-[13px] font-medium text-[#171717] hover:bg-[#f3f3f2] disabled:opacity-50 press-tactile"
                            >
                              <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                              <span>Acknowledge</span>
                            </button>
                          )
                        )}
                      </div>
                    </article>
                  </StaggerCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: TRUST INSPECTOR */}
      {activeSection === "trust" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-[28px] leading-[1.15] font-medium tracking-[-0.02em] text-[#171717]">
              Trust inspector
            </h1>
            <p className="mt-1 text-[14px] leading-5 text-[#525252]">
              Select a student to inspect score trend and audit log
            </p>
          </div>

          <div className="surface-card overflow-hidden rounded-[14px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] leading-5">
                <thead className="border-b border-[#171717]/[0.07] bg-[#fafafa] text-[12px] text-[#737373]">
                  <tr>
                    <th className="px-5 py-3 font-normal">Student</th>
                    <th className="px-5 py-3 font-normal">Account</th>
                    <th className="px-5 py-3 font-normal">Score</th>
                    <th className="px-5 py-3 font-normal">Weight</th>
                    <th className="px-5 py-3 text-right font-normal">Events</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#171717]/[0.06]">
                  {students.map((stu) => {
                    const isExpanded = !!expandedStudents[stu.id];
                    const meta = getTrustMeta(stu.trustScore);
                    return (
                      <React.Fragment key={stu.id}>
                        <tr
                          onClick={() =>
                            setExpandedStudents((prev) => ({
                              ...prev,
                              [stu.id]: !prev[stu.id],
                            }))
                          }
                          className={`cursor-pointer transition-colors duration-150 ${
                            isExpanded ? "bg-[#fafafa]" : "hover:bg-[#fafafa]"
                          }`}
                        >
                          <td className="px-5 py-3.5 font-medium text-[#171717]">
                            <div className="flex items-center gap-2.5">
                              <ChevronDown
                                className={`h-4 w-4 text-[#737373] transition-transform duration-150 ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                                strokeWidth={1.5}
                              />
                              <span>{stu.name}</span>
                              <span className="font-mono text-[11px] font-normal text-[#737373]">
                                {stu.id}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-[#525252]">
                            {stu.isNewAccount ? "New (<15m)" : "Established"}
                          </td>
                          <td className="px-5 py-3.5 font-mono font-medium text-[#171717] tabular-nums">
                            {stu.trustScore}
                            <span className="text-[#737373] font-normal">
                              /100
                            </span>
                          </td>
                          <td className="px-5 py-3.5 tabular-nums">
                            <span className="inline-flex items-center gap-2 font-mono text-[#171717]">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${meta.dotColor}`}
                              />
                              <span>
                                {meta.weight} · {meta.tier}
                              </span>
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-[#525252] tabular-nums">
                            {stu.trustHistory.length}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={5} className="bg-[#fafafa] px-6 py-4">
                              <div className="grid gap-4 lg:grid-cols-3">
                                <div className="rounded-[10px] border border-[#171717]/[0.07] bg-[#ffffff] p-4">
                                  <div className="mb-2 text-[12px] font-medium text-[#171717]">
                                    Trajectory
                                  </div>
                                  <TrustTrajectoryChart
                                    history={stu.trustHistory}
                                    currentScore={stu.trustScore}
                                  />
                                </div>

                                <div className="lg:col-span-2 overflow-hidden rounded-[10px] border border-[#171717]/[0.07] bg-[#ffffff]">
                                  {stu.trustHistory.length === 0 ? (
                                    <div className="p-6 text-center text-[13px] text-[#737373]">
                                      No audit events recorded
                                    </div>
                                  ) : (
                                    <table className="w-full text-left text-[12px] leading-5">
                                      <thead className="border-b border-[#171717]/[0.07] bg-[#fafafa] text-[#737373]">
                                        <tr>
                                          <th className="px-4 py-2 font-normal">
                                            Date
                                          </th>
                                          <th className="px-4 py-2 font-normal">
                                            Event
                                          </th>
                                          <th className="px-4 py-2 text-right font-normal">
                                            Delta
                                          </th>
                                          <th className="px-4 py-2 text-right font-normal">
                                            Score
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[#171717]/[0.06]">
                                        {stu.trustHistory.map((ev) => (
                                          <tr key={ev.id}>
                                            <td className="whitespace-nowrap px-4 py-2 font-mono text-[#737373] tabular-nums">
                                              {formatTime(ev.timestamp)}
                                            </td>
                                            <td className="px-4 py-2 text-[#171717]">
                                              {ev.reason}
                                            </td>
                                            <td
                                              className={`whitespace-nowrap px-4 py-2 text-right font-mono font-medium tabular-nums ${
                                                ev.delta > 0
                                                  ? "text-[#15803d]"
                                                  : ev.delta < 0
                                                  ? "text-[#dc2626]"
                                                  : "text-[#737373]"
                                              }`}
                                            >
                                              {ev.delta > 0
                                                ? `+${ev.delta}`
                                                : ev.delta}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-2 text-right font-mono font-medium text-[#171717] tabular-nums">
                                              {ev.newScore}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: BRIEFING */}
      {activeSection === "briefing" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[28px] leading-[1.15] font-medium tracking-[-0.02em] text-[#171717]">
                Executive briefing
              </h1>
              <p className="mt-1 text-[14px] leading-5 text-[#525252]">
                Active hazards, bottlenecks, and trust signals
              </p>
            </div>
            <button
              type="button"
              disabled={isBusy}
              onClick={onGenerateSummary}
              className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-[#171717] px-4 text-[13px] font-medium text-[#ffffff] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-[#262626] disabled:opacity-45 press-tactile"
            >
              <ClipboardList className="h-4 w-4" strokeWidth={1.5} />
              <span>
                {busyAction === "admin-summary"
                  ? "Generating"
                  : adminSummary
                  ? "Refresh"
                  : "Generate briefing"}
              </span>
            </button>
          </div>

          <section className="surface-card rounded-[14px] p-6">
            {adminSummary ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#171717]/[0.07] pb-4">
                  <h2 className="text-[16px] leading-6 font-medium text-[#171717]">
                    {adminSummary.headline}
                  </h2>
                  <div className="flex items-center gap-3 font-mono text-[12px] text-[#737373] tabular-nums">
                    {adminSummary.usedFallback && <span>Fallback</span>}
                    <span>{formatTime(adminSummary.generatedAt)}</span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[10px] border border-[#171717]/[0.07] bg-[#fafafa] p-4">
                    <div className="mb-2.5 flex items-center gap-2 text-[13px] font-medium text-[#171717]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#dc2626]" />
                      <span>Safety hazards</span>
                    </div>
                    <ul className="space-y-1.5 text-[13px] leading-5 text-[#525252]">
                      {adminSummary.criticalAndSafety.map((item, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="text-[#737373]">·</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-[10px] border border-[#171717]/[0.07] bg-[#fafafa] p-4">
                    <div className="mb-2.5 text-[13px] font-medium text-[#171717]">
                      Bottlenecks
                    </div>
                    <ul className="space-y-1.5 text-[13px] leading-5 text-[#525252]">
                      {adminSummary.departmentBottlenecks.map((item, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="text-[#737373]">·</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-[10px] border border-[#171717]/[0.07] bg-[#fafafa] p-4">
                    <div className="mb-2.5 text-[13px] font-medium text-[#171717]">
                      Trust signals
                    </div>
                    <ul className="space-y-1.5 text-[13px] leading-5 text-[#525252]">
                      {adminSummary.communityAndTrustSignals.map(
                        (item, idx) => (
                          <li key={idx} className="flex gap-2">
                            <span className="text-[#737373]">·</span>
                            <span>{item}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>

                  <div className="rounded-[10px] border border-[#171717]/[0.07] bg-[#fafafa] p-4">
                    <div className="mb-2.5 flex items-center gap-2 text-[13px] font-medium text-[#171717]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#0f766e]" />
                      <span>Next actions</span>
                    </div>
                    <ul className="space-y-1.5 text-[13px] leading-5 text-[#525252]">
                      {adminSummary.recommendedActions.map((item, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="text-[#0f766e]">·</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-[14px] text-[#737373]">
                Generate a briefing to summarize current campus status
              </div>
            )}
          </section>
        </div>
      )}
    </SectionStage>
  );
}
