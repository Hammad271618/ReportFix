"use client";

import React, { useMemo, useState } from "react";
import {
  Lock,
  SlidersHorizontal,
  CheckCircle2,
  PlayCircle,
  Ban,
  ChevronDown,
  ChevronUp,
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

function formatPriorityLabel(priority: PriorityLevel): string {
  switch (priority) {
    case "CRITICAL":
      return "Critical";
    case "HIGH":
      return "High";
    case "MEDIUM":
      return "Medium";
    case "LOW":
    default:
      return "Low";
  }
}

function priorityDotColor(priority: PriorityLevel): string {
  switch (priority) {
    case "CRITICAL":
      return "bg-[#dc2626]";
    case "HIGH":
      return "bg-[#d97706]";
    case "MEDIUM":
      return "bg-[#1d4ed8]";
    case "LOW":
    default:
      return "bg-[#6b7487]";
  }
}

function formatStatusLabel(status: IssueStatus): string {
  switch (status) {
    case "OPEN":
      return "Open";
    case "IN_PROGRESS":
      return "In progress";
    case "RESOLVED":
      return "Awaiting verification";
    case "REOPENED":
      return "Reopened";
    case "VERIFIED_RESOLVED":
      return "Verified resolved";
    case "DISMISSED_SPAM":
      return "Dismissed";
  }
}

function formatAlertType(type: SecurityAlert["type"]): string {
  switch (type) {
    case "PROMPT_INJECTION":
      return "Prompt injection";
    case "BRIGADING_SUSPECTED":
      return "Suspected brigading";
    case "SPAM_FLOOD":
      return "Spam flood";
    case "SAFETY_UNROUTED":
      return "Unrouted safety report";
  }
}

function formatAlertStatus(status: SecurityAlert["status"]): string {
  switch (status) {
    case "OPEN":
      return "Open review";
    case "CONFIRMED":
      return "Confirmed";
    case "DISMISSED":
      return "Dismissed";
  }
}

function getTrustWeightLabel(score: number): {
  weight: string;
  tier: string;
  dotColor: string;
} {
  if (score >= 80)
    return { weight: "1.00x", tier: "Trusted", dotColor: "bg-[#16a34a]" };
  if (score >= 60)
    return { weight: "0.80x", tier: "Standard", dotColor: "bg-[#1d4ed8]" };
  if (score >= 45)
    return { weight: "0.55x", tier: "Developing", dotColor: "bg-[#d97706]" };
  if (score >= 25)
    return { weight: "0.35x", tier: "Low trust", dotColor: "bg-[#ea580c]" };
  return { weight: "0.15x", tier: "Restricted", dotColor: "bg-[#dc2626]" };
}

function formatRoomCode(locationId: string, locationName: string): string {
  if (locationId) {
    return locationId.toUpperCase().replaceAll("_", "-");
  }
  return locationName
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
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
    if (onSelectSection) {
      onSelectSection(sec);
    }
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

  // Department workload calculation for the 2/3 main chart
  const deptWorkload = useMemo(() => {
    const rows = DEPARTMENTS.map((dept) => {
      const deptIssues = publicIssues.filter(
        (i) =>
          i.department === dept &&
          i.status !== "VERIFIED_RESOLVED" &&
          i.status !== "DISMISSED_SPAM"
      );
      const critical = deptIssues.filter(
        (i) => i.priority === "CRITICAL"
      ).length;
      const avgScore =
        deptIssues.length > 0
          ? Math.round(
              deptIssues.reduce((acc, cur) => acc + cur.priorityScore, 0) /
                deptIssues.length
            )
          : 0;
      return {
        dept,
        activeCount: deptIssues.length,
        criticalCount: critical,
        avgScore,
      };
    });

    const maxCount = Math.max(1, ...rows.map((r) => r.activeCount));
    // Identify the primary bottleneck department (most active tickets, tie-break by avgScore)
    let leadDept: Department = "CSE";
    let bestScore = -1;
    for (const r of rows) {
      const composite = r.activeCount * 100 + r.avgScore;
      if (composite > bestScore) {
        bestScore = composite;
        leadDept = r.dept;
      }
    }

    return { rows, maxCount, leadDept };
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

  const renderExecutiveBriefingCard = () => (
    <section className="rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff] p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[16px] leading-6 font-medium text-[#111827]">
            Executive campus briefing
          </h2>
          <p className="mt-0.5 text-[13px] leading-5 text-[#4b5565]">
            Synthesizes active campus hazards, department bottlenecks, and
            community trust signals from sanitized ticket summaries
          </p>
        </div>
        <button
          type="button"
          disabled={isBusy}
          onClick={onGenerateSummary}
          className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-[#1d4ed8] px-4 text-[13px] leading-5 font-medium text-[#ffffff] hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150 ease-craft"
        >
          <ClipboardList className="h-4 w-4" strokeWidth={1.5} />
          <span>
            {busyAction === "admin-summary"
              ? "Generating briefing"
              : adminSummary
              ? "Refresh briefing"
              : "Generate briefing"}
          </span>
        </button>
      </div>

      {adminSummary ? (
        <div className="mt-5 space-y-4 rounded-[10px] border border-[#111827]/[0.08] bg-[#f5f7fa] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#111827]/[0.08] pb-3">
            <h3 className="text-[15px] leading-[22px] font-medium text-[#111827]">
              {adminSummary.headline}
            </h3>
            <div className="flex items-center gap-3 font-mono text-[12px] leading-4 text-[#6b7487] tabular-nums">
              {adminSummary.usedFallback && (
                <span>Deterministic fallback</span>
              )}
              <span>Generated {formatTime(adminSummary.generatedAt)}</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] p-4">
              <div className="mb-2 flex items-center gap-2 text-[13px] leading-5 font-medium text-[#111827]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#dc2626]" />
                <span>Critical &amp; safety hazards</span>
              </div>
              <ul className="space-y-1.5 text-[13px] leading-5 text-[#4b5565]">
                {adminSummary.criticalAndSafety.map((item, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-[#6b7487]">·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] p-4">
              <div className="mb-2 text-[13px] leading-5 font-medium text-[#111827]">
                Department bottlenecks
              </div>
              <ul className="space-y-1.5 text-[13px] leading-5 text-[#4b5565]">
                {adminSummary.departmentBottlenecks.map((item, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-[#6b7487]">·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] p-4">
              <div className="mb-2 text-[13px] leading-5 font-medium text-[#111827]">
                Community &amp; trust signals
              </div>
              <ul className="space-y-1.5 text-[13px] leading-5 text-[#4b5565]">
                {adminSummary.communityAndTrustSignals.map((item, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-[#6b7487]">·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] p-4">
              <div className="mb-2 flex items-center gap-2 text-[13px] leading-5 font-medium text-[#111827]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#1d4ed8]" />
                <span>Recommended registrar actions</span>
              </div>
              <ul className="space-y-1.5 text-[13px] leading-5 text-[#4b5565]">
                {adminSummary.recommendedActions.map((item, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-[#1d4ed8]">·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-[8px] border border-[#111827]/[0.08] bg-[#f5f7fa] p-4 text-[13px] leading-5 text-[#6b7487]">
          No executive briefing generated in this session yet. Click Generate
          briefing above to synthesize live campus status
        </div>
      )}
    </section>
  );

  return (
    <div className="space-y-6 animate-enter">
      {/* SECTION 1: ALL DEPARTMENTS & OVERRIDES */}
      {activeSection === "all" && (
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[28px] leading-[1.15] font-medium tracking-tight text-[#111827]">
                Registrar oversight
              </h1>
              <p className="mt-1 text-[14px] leading-5 text-[#4b5565]">
                Operator {activeUser.name} · cross-campus dispatch across all 6
                departments, audited priority overrides, and live workload
                distribution
              </p>
            </div>
            <button
              type="button"
              onClick={() => switchSection("briefing")}
              className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] px-3 text-[13px] leading-5 font-medium text-[#111827] hover:bg-[#eceff4] transition-colors duration-150 ease-craft"
            >
              <ClipboardList
                className="h-4 w-4 text-[#4b5565]"
                strokeWidth={1.5}
              />
              <span>Executive briefing</span>
              <ArrowUpRight
                className="h-4 w-4 text-[#6b7487]"
                strokeWidth={1.5}
              />
            </button>
          </div>

          {/* 4 Compact Stat Cards — numbers only, no corner icons */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff] p-5">
              <div className="text-[12px] leading-4 text-[#6b7487]">
                Active public tickets
              </div>
              <div className="mt-2 font-mono text-[32px] leading-none font-medium text-[#111827] tabular-nums">
                {stats.totalActivePublic}
              </div>
              <div className="mt-2 text-[12px] leading-4 text-[#4b5565] tabular-nums">
                {publicIssues.length} total across 6 departments
              </div>
            </div>

            <div className="rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff] p-5">
              <div className="flex items-center gap-2 text-[12px] leading-4 text-[#6b7487]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#dc2626]" />
                <span>Critical safety (98)</span>
              </div>
              <div className="mt-2 font-mono text-[32px] leading-none font-medium text-[#111827] tabular-nums">
                {stats.criticalSafetyCount}
              </div>
              <div className="mt-2 text-[12px] leading-4 text-[#4b5565]">
                Verified verbatim safety overrides
              </div>
            </div>

            <button
              type="button"
              onClick={() => switchSection("vault")}
              className="rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff] p-5 text-left hover:bg-[#f5f7fa] transition-colors duration-150 ease-craft"
            >
              <div className="flex items-center justify-between text-[12px] leading-4 text-[#6b7487]">
                <span>Confidential safety vault</span>
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </div>
              <div className="mt-2 font-mono text-[32px] leading-none font-medium text-[#111827] tabular-nums">
                {confidentialCount}
              </div>
              <div className="mt-2 text-[12px] leading-4 text-[#4b5565]">
                Anonymous reporter identity stripped
              </div>
            </button>

            <button
              type="button"
              onClick={() => switchSection("security")}
              className="rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff] p-5 text-left hover:bg-[#f5f7fa] transition-colors duration-150 ease-craft"
            >
              <div className="flex items-center justify-between text-[12px] leading-4 text-[#6b7487]">
                <span className="flex items-center gap-2">
                  {openAlertsCount > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#d97706]" />
                  )}
                  <span>Open security alerts</span>
                </span>
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </div>
              <div className="mt-2 font-mono text-[32px] leading-none font-medium text-[#111827] tabular-nums">
                {openAlertsCount}
              </div>
              <div className="mt-2 text-[12px] leading-4 text-[#4b5565] tabular-nums">
                {securityAlerts.length} total logged events
              </div>
            </button>
          </section>

          {/* Varied Grid Rhythm: 2/3 Main Department Workload Chart + 1/3 Verification & Security Ledger */}
          <section className="grid gap-6 lg:grid-cols-3">
            {/* 2/3 Main Chart: Department Workload Distribution (One accent on bottleneck/selected dept, neutral steps for rest) */}
            <div className="lg:col-span-2 rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff] p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-[15px] leading-[22px] font-medium text-[#111827]">
                    Active workload by department
                  </h2>
                  <p className="text-[13px] leading-5 text-[#4b5565]">
                    Click any department row to filter the ticket queue below.
                    Highest load department is highlighted
                  </p>
                </div>
                {deptFilter !== "ALL" && (
                  <button
                    type="button"
                    onClick={() => setDeptFilter("ALL")}
                    className="h-7 rounded-[6px] border border-[#111827]/[0.08] bg-[#f5f7fa] px-2.5 font-mono text-[12px] leading-4 text-[#4b5565] hover:text-[#111827]"
                  >
                    Clear filter ({deptFilter})
                  </button>
                )}
              </div>

              <div className="mt-5 space-y-3">
                {deptWorkload.rows.map((row) => {
                  const ratio =
                    deptWorkload.maxCount > 0
                      ? row.activeCount / deptWorkload.maxCount
                      : 0;
                  const isHighlighted =
                    deptFilter !== "ALL"
                      ? deptFilter === row.dept
                      : row.dept === deptWorkload.leadDept &&
                        row.activeCount > 0;

                  return (
                    <button
                      key={row.dept}
                      type="button"
                      onClick={() =>
                        setDeptFilter((curr) =>
                          curr === row.dept ? "ALL" : row.dept
                        )
                      }
                      className="group block w-full text-left"
                    >
                      <div className="mb-1.5 flex items-center justify-between text-[13px] leading-5 tabular-nums">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-medium ${
                              isHighlighted
                                ? "text-[#1d4ed8]"
                                : "text-[#111827] group-hover:text-[#1d4ed8]"
                            }`}
                          >
                            {row.dept}
                          </span>
                          {row.criticalCount > 0 && (
                            <span className="inline-flex items-center gap-1 font-mono text-[12px] leading-4 text-[#dc2626]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#dc2626]" />
                              {row.criticalCount} critical
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 font-mono text-[12px] leading-4 text-[#6b7487]">
                          <span>Avg score {row.avgScore}</span>
                          <span className="w-20 whitespace-nowrap text-right font-medium text-[#111827]">
                            {row.activeCount}{" "}
                            {row.activeCount === 1 ? "ticket" : "tickets"}
                          </span>
                        </div>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-[4px] bg-[#eceff4]">
                        <div
                          className={`h-full w-full origin-left rounded-[4px] transition-transform duration-300 ease-craft ${
                            isHighlighted ? "bg-[#1d4ed8]" : "bg-[#94a3b8]"
                          }`}
                          style={{
                            transform: `scaleX(${Math.max(
                              row.activeCount > 0 ? 0.04 : 0,
                              ratio
                            )})`,
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 1/3 Narrow Data Block: Verification & Queue Pulse List */}
            <div className="rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff] p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-[15px] leading-[22px] font-medium text-[#111827]">
                  Verification &amp; control ledger
                </h2>
                <p className="mt-0.5 text-[13px] leading-5 text-[#4b5565]">
                  Community verification loop and rule guard totals
                </p>

                <dl className="mt-5 divide-y divide-[#111827]/[0.08] text-[13px] leading-5 tabular-nums">
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-[#4b5565]">Awaiting student votes</dt>
                    <dd className="font-mono font-medium text-[#111827]">
                      {stats.resolvedAwaitingVotes}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-[#4b5565]">Reopened by dispute</dt>
                    <dd className="font-mono font-medium text-[#dc2626]">
                      {stats.reopenedCount}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-[#4b5565]">Student accounts</dt>
                    <dd className="font-mono font-medium text-[#111827]">
                      {students.length}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-[#4b5565]">New accounts (&lt;15m)</dt>
                    <dd className="font-mono font-medium text-[#111827]">
                      {students.filter((s) => s.isNewAccount).length}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-[#4b5565]">Non-safety priority cap</dt>
                    <dd className="font-mono text-[#6b7487]">84 · High</dd>
                  </div>
                </dl>
              </div>

              <div className="mt-4 pt-3 border-t border-[#111827]/[0.08] flex items-center justify-between text-[12px] leading-4 text-[#6b7487]">
                <span>Brigade threshold</span>
                <span className="font-mono text-[#111827]">
                  3 new accounts / 10m
                </span>
              </div>
            </div>
          </section>

          {/* Department & Status Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff] px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="admin-dept-filter"
                  className="text-[13px] leading-5 text-[#4b5565]"
                >
                  Department
                </label>
                <select
                  id="admin-dept-filter"
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="h-8 rounded-[8px] border border-[#111827]/[0.08] bg-[#f5f7fa] px-2.5 text-[13px] leading-5 text-[#111827]"
                >
                  <option value="ALL">All departments</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="admin-status-filter"
                  className="text-[13px] leading-5 text-[#4b5565]"
                >
                  Status
                </label>
                <select
                  id="admin-status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 rounded-[8px] border border-[#111827]/[0.08] bg-[#f5f7fa] px-2.5 text-[13px] leading-5 text-[#111827]"
                >
                  <option value="ALL">All statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="REOPENED">Reopened</option>
                  <option value="RESOLVED">Awaiting verification</option>
                  <option value="VERIFIED_RESOLVED">Verified resolved</option>
                  <option value="DISMISSED_SPAM">Dismissed</option>
                </select>
              </div>
            </div>

            <span className="font-mono text-[12px] leading-4 text-[#6b7487] tabular-nums">
              Showing {filteredPublicIssues.length} of {publicIssues.length}{" "}
              public tickets
            </span>
          </div>

          {/* Issues List */}
          <div className="space-y-3">
            {filteredPublicIssues.length === 0 ? (
              <div className="rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff] p-8 text-center text-[14px] leading-5 text-[#4b5565]">
                No public tickets match the selected department and status
                filters
              </div>
            ) : (
              filteredPublicIssues.map((issue) => {
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
                  <article
                    key={issue.id}
                    className={`rounded-[12px] border bg-[#ffffff] p-5 transition-colors duration-150 ease-craft ${
                      issue.priority === "CRITICAL"
                        ? "border-[#dc2626]/30"
                        : "border-[#111827]/[0.08]"
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2 min-w-0 flex-1">
                        {/* Signature detail */}
                        <div className="flex flex-wrap items-center gap-2 text-[12px] leading-4">
                          <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#eceff4] px-2 py-1 font-mono font-medium text-[#111827] tabular-nums">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${priorityDotColor(
                                issue.priority
                              )}`}
                            />
                            <span>
                              {issue.priorityScore} ·{" "}
                              {formatPriorityLabel(issue.priority)}
                            </span>
                          </span>

                          <span className="inline-flex items-center rounded-[6px] border border-[#111827]/[0.08] bg-[#ffffff] px-2 py-1 text-[#4b5565]">
                            {formatStatusLabel(issue.status)}
                          </span>

                          <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#f5f7fa] px-2 py-1 font-mono text-[#4b5565]">
                            <span className="font-medium text-[#111827]">
                              {roomCode}
                            </span>
                            <span className="text-[#6b7487]">·</span>
                            <span className="font-sans">
                              {issue.locationName}
                            </span>
                          </span>

                          <span className="font-mono text-[#111827] font-medium">
                            {issue.department} dept
                          </span>

                          <span className="font-mono text-[#6b7487] tabular-nums">
                            {issue.meTooCount} supporter
                            {issue.meTooCount === 1 ? "" : "s"}
                          </span>

                          {issue.priorityBreakdown.adminOverridePriority && (
                            <span className="rounded-[4px] bg-[#1d4ed8]/[0.08] px-2 py-0.5 font-mono text-[#1d4ed8]">
                              Registrar priority override
                            </span>
                          )}
                        </div>

                        <h4 className="text-[15px] leading-[22px] font-medium text-[#111827]">
                          {issue.cleanSummary}
                        </h4>
                        <p className="text-[13px] leading-5 text-[#4b5565]">
                          {issue.oneLineReason}
                        </p>
                        {issue.priorityBreakdown.adminOverrideReason && (
                          <p className="text-[12px] leading-4 text-[#1d4ed8]">
                            Override audit note:{" "}
                            {issue.priorityBreakdown.adminOverrideReason}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
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
                          className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] px-3 text-[13px] leading-5 font-medium text-[#111827] hover:bg-[#f5f7fa] transition-colors duration-150 ease-craft"
                        >
                          <SlidersHorizontal
                            className="h-4 w-4 text-[#4b5565]"
                            strokeWidth={1.5}
                          />
                          <span>Reassign / override</span>
                        </button>

                        <button
                          type="button"
                          disabled={isBusy || issue.status === "IN_PROGRESS"}
                          onClick={() =>
                            onUpdateStatus(issue.id, "IN_PROGRESS")
                          }
                          className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[#111827]/[0.08] bg-[#eceff4] px-3 text-[13px] leading-5 font-medium text-[#111827] hover:bg-[#e2e6ee] disabled:opacity-45 transition-colors duration-150 ease-craft"
                        >
                          <PlayCircle
                            className="h-4 w-4 text-[#4b5565]"
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
                          className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#1d4ed8] px-3 text-[13px] leading-5 font-medium text-[#ffffff] hover:bg-[#1e40af] disabled:opacity-45 transition-colors duration-150 ease-craft"
                        >
                          <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
                          <span>Resolve</span>
                        </button>

                        <button
                          type="button"
                          disabled={isBusy || issue.status === "DISMISSED_SPAM"}
                          onClick={() =>
                            onUpdateStatus(issue.id, "DISMISSED_SPAM")
                          }
                          className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] px-3 text-[13px] leading-5 font-normal text-[#dc2626] hover:bg-[#dc2626]/[0.06] disabled:opacity-45 transition-colors duration-150 ease-craft"
                        >
                          <Ban className="h-4 w-4" strokeWidth={1.5} />
                          <span>Spam (-20)</span>
                        </button>
                      </div>
                    </div>

                    {/* Inline Reassign Department & Override Priority Form */}
                    {overrideOpen && (
                      <div className="mt-4 rounded-[8px] border border-[#111827]/[0.08] bg-[#f5f7fa] p-4">
                        <div className="mb-3 text-[13px] leading-5 font-medium text-[#111827]">
                          Audited department reassignment &amp; priority override
                        </div>
                        <div className="grid gap-3 sm:grid-cols-4">
                          <div>
                            <label className="mb-1 block text-[12px] leading-4 text-[#6b7487]">
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
                              className="h-9 w-full rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] px-3 text-[13px] leading-5 text-[#111827]"
                            >
                              {DEPARTMENTS.map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-1 block text-[12px] leading-4 text-[#6b7487]">
                              Priority override
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
                              className="h-9 w-full rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] px-3 text-[13px] leading-5 text-[#111827]"
                            >
                              <option value="">Keep computed priority</option>
                              <option value="CRITICAL">Critical (98)</option>
                              <option value="HIGH">High (78)</option>
                              <option value="MEDIUM">Medium (52)</option>
                              <option value="LOW">Low (25)</option>
                              <option value="CLEAR">
                                Revert to computed score
                              </option>
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="mb-1 block text-[12px] leading-4 text-[#6b7487]">
                              Mandatory audit reason
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
                                placeholder="State why department or priority is overridden"
                                className="h-9 flex-1 rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] px-3 text-[13px] leading-5 text-[#111827] placeholder:text-[#6b7487]"
                              />
                              <button
                                type="button"
                                disabled={
                                  isBusy ||
                                  !(overrideReason[issue.id] ?? "").trim()
                                }
                                onClick={() => handleOverrideSubmit(issue)}
                                className="h-9 rounded-[8px] bg-[#111827] px-4 text-[13px] leading-5 font-medium text-[#ffffff] hover:bg-[#1f2937] disabled:opacity-45 transition-colors duration-150 ease-craft"
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: CONFIDENTIAL SAFETY VAULT */}
      {activeSection === "vault" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-[28px] leading-[1.15] font-medium tracking-tight text-[#111827]">
              Confidential safety vault
            </h1>
            <p className="mt-1 flex items-center gap-2 text-[14px] leading-5 text-[#4b5565]">
              <Lock
                className="h-4 w-4 shrink-0 text-[#6b7487]"
                strokeWidth={1.5}
              />
              <span>
                Harassment and ragging reports are isolated from public boards
                and department queues. Reporter identity is stripped at the API
                layer
              </span>
            </p>
          </div>

          {confidentialIssues.length === 0 ? (
            <div className="rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff] p-10 text-center text-[14px] leading-5 text-[#4b5565]">
              No confidential harassment or ragging cases in the vault
            </div>
          ) : (
            <div className="space-y-3">
              {confidentialIssues.map((issue) => {
                const roomCode = formatRoomCode(
                  issue.locationId,
                  issue.locationName
                );
                return (
                  <article
                    key={issue.id}
                    className="rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff] p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-[12px] leading-4">
                          <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#eceff4] px-2 py-1 font-mono font-medium text-[#111827] tabular-nums">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${priorityDotColor(
                                issue.priority
                              )}`}
                            />
                            <span>
                              {issue.priorityScore} ·{" "}
                              {formatPriorityLabel(issue.priority)}
                            </span>
                          </span>

                          <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#eceff4] px-2 py-1 font-medium text-[#111827]">
                            <Lock
                              className="h-3.5 w-3.5 text-[#4b5565]"
                              strokeWidth={1.5}
                            />
                            <span>Reporter: Anonymous</span>
                          </span>

                          <span className="inline-flex items-center rounded-[6px] border border-[#111827]/[0.08] bg-[#ffffff] px-2 py-1 text-[#4b5565]">
                            {formatStatusLabel(issue.status)}
                          </span>

                          <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#f5f7fa] px-2 py-1 font-mono text-[#4b5565]">
                            <span className="font-medium text-[#111827]">
                              {roomCode}
                            </span>
                            <span className="text-[#6b7487]">·</span>
                            <span className="font-sans">
                              {issue.locationName}
                            </span>
                          </span>
                        </div>

                        <h4 className="text-[15px] leading-[22px] font-medium text-[#111827]">
                          {issue.cleanSummary}
                        </h4>
                        <p className="text-[13px] leading-5 text-[#4b5565]">
                          {issue.oneLineReason}
                        </p>
                        <div className="font-mono text-[12px] leading-4 text-[#6b7487] tabular-nums">
                          Ticket {issue.id} · Logged{" "}
                          {formatTime(issue.createdAt)}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={isBusy || issue.status === "IN_PROGRESS"}
                          onClick={() =>
                            onUpdateStatus(issue.id, "IN_PROGRESS")
                          }
                          className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[#111827]/[0.08] bg-[#eceff4] px-3 text-[13px] leading-5 font-medium text-[#111827] hover:bg-[#e2e6ee] disabled:opacity-45 transition-colors duration-150 ease-craft"
                        >
                          <PlayCircle
                            className="h-4 w-4 text-[#4b5565]"
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
                          className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#1d4ed8] px-3 text-[13px] leading-5 font-medium text-[#ffffff] hover:bg-[#1e40af] disabled:opacity-45 transition-colors duration-150 ease-craft"
                        >
                          <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
                          <span>Mark resolved</span>
                        </button>

                        <button
                          type="button"
                          disabled={isBusy || issue.status === "DISMISSED_SPAM"}
                          onClick={() =>
                            onUpdateStatus(issue.id, "DISMISSED_SPAM")
                          }
                          className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] px-3 text-[13px] leading-5 font-normal text-[#4b5565] hover:bg-[#f5f7fa] disabled:opacity-45 transition-colors duration-150 ease-craft"
                        >
                          <Ban className="h-4 w-4" strokeWidth={1.5} />
                          <span>Close case</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: SECURITY & BRIGADING QUEUE */}
      {activeSection === "security" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-[28px] leading-[1.15] font-medium tracking-tight text-[#111827]">
              Security &amp; brigading queue
            </h1>
            <p className="mt-1 text-[14px] leading-5 text-[#4b5565]">
              Coordinated new-account voting bursts (3+ new accounts on one
              ticket within 10 minutes) and prompt injection attempts
            </p>
          </div>

          {securityAlerts.length === 0 ? (
            <div className="rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff] p-10 text-center text-[14px] leading-5 text-[#4b5565]">
              No security or brigading alerts logged yet
            </div>
          ) : (
            <div className="space-y-3">
              {securityAlerts.map((alert) => {
                const linkedIssue = alert.issueId
                  ? issueById.get(alert.issueId)
                  : undefined;
                const isOpenBrigade =
                  alert.type === "BRIGADING_SUSPECTED" &&
                  alert.status === "OPEN";

                return (
                  <article
                    key={alert.id}
                    className={`rounded-[12px] border bg-[#ffffff] p-5 ${
                      alert.status === "OPEN"
                        ? "border-[#d97706]/30"
                        : "border-[#111827]/[0.08]"
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-[12px] leading-4">
                          <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#eceff4] px-2.5 py-1 font-medium text-[#111827]">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                alert.severity === "HIGH"
                                  ? "bg-[#dc2626]"
                                  : "bg-[#d97706]"
                              }`}
                            />
                            <span>{formatAlertType(alert.type)}</span>
                          </span>

                          <span className="rounded-[6px] border border-[#111827]/[0.08] bg-[#ffffff] px-2 py-1 font-mono text-[#4b5565]">
                            {formatAlertStatus(alert.status)}
                          </span>

                          <span className="font-mono text-[#6b7487] tabular-nums">
                            {formatTime(alert.createdAt)}
                          </span>
                        </div>

                        <h4 className="text-[15px] leading-[22px] font-medium text-[#111827]">
                          {alert.title}
                        </h4>
                        <p className="text-[13px] leading-5 text-[#4b5565]">
                          {alert.detail}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[12px] leading-4 text-[#6b7487]">
                          <span>
                            Accounts involved:{" "}
                            <strong className="font-medium text-[#111827]">
                              {alert.involvedUserIds
                                .map((uid) => userNameMap.get(uid) ?? uid)
                                .join(", ") || "None"}
                            </strong>
                          </span>
                          {linkedIssue && (
                            <span className="tabular-nums">
                              · Ticket:{" "}
                              <span className="font-medium text-[#111827]">
                                {linkedIssue.cleanSummary}
                              </span>{" "}
                              ({linkedIssue.heldBrigadeActions.length} held
                              actions)
                            </span>
                          )}
                        </div>
                      </div>

                      {isOpenBrigade ? (
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => onResolveBrigade(alert.id, "confirm")}
                            className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-[#dc2626] px-3.5 text-[13px] leading-5 font-medium text-[#ffffff] hover:bg-[#b91c1c] disabled:opacity-50 transition-colors duration-150 ease-craft"
                          >
                            <X className="h-4 w-4" strokeWidth={1.5} />
                            <span>Confirm brigade (-10 trust)</span>
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => onResolveBrigade(alert.id, "dismiss")}
                            className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#111827]/[0.08] bg-[#eceff4] px-3.5 text-[13px] leading-5 font-medium text-[#111827] hover:bg-[#e2e6ee] disabled:opacity-50 transition-colors duration-150 ease-craft"
                          >
                            <Check className="h-4 w-4" strokeWidth={1.5} />
                            <span>Release held votes</span>
                          </button>
                        </div>
                      ) : (
                        alert.status === "OPEN" && (
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                onResolveBrigade(alert.id, "confirm")
                              }
                              className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] px-3.5 text-[13px] leading-5 font-medium text-[#111827] hover:bg-[#f5f7fa] disabled:opacity-50 transition-colors duration-150 ease-craft"
                            >
                              <Check className="h-4 w-4" strokeWidth={1.5} />
                              <span>Acknowledge alert</span>
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: TRUST SCORE INSPECTOR */}
      {activeSection === "trust" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-[28px] leading-[1.15] font-medium tracking-tight text-[#111827]">
              Trust score inspector
            </h1>
            <p className="mt-1 text-[14px] leading-5 text-[#4b5565]">
              Select any student row to inspect their deterministic trust ledger.
              Confidential reports never appear in trust history
            </p>
          </div>

          <div className="overflow-hidden rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] leading-5">
                <thead className="border-b border-[#111827]/[0.08] bg-[#f5f7fa] text-[12px] leading-4 font-normal text-[#6b7487]">
                  <tr>
                    <th className="px-5 py-3 font-normal">Student</th>
                    <th className="px-5 py-3 font-normal">Account standing</th>
                    <th className="px-5 py-3 font-normal">Trust score</th>
                    <th className="px-5 py-3 font-normal">Vote weight</th>
                    <th className="px-5 py-3 font-normal">Why score is what it is</th>
                    <th className="px-5 py-3 text-right font-normal">
                      Audit events
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#111827]/[0.08]">
                  {students.map((stu) => {
                    const isExpanded = !!expandedStudents[stu.id];
                    const meta = getTrustWeightLabel(stu.trustScore);
                    return (
                      <React.Fragment key={stu.id}>
                        <tr
                          onClick={() =>
                            setExpandedStudents((prev) => ({
                              ...prev,
                              [stu.id]: !prev[stu.id],
                            }))
                          }
                          className="cursor-pointer hover:bg-[#f5f7fa] transition-colors duration-150 ease-craft"
                        >
                          <td className="px-5 py-3.5 font-medium text-[#111827]">
                            <div className="flex items-center gap-2.5">
                              {isExpanded ? (
                                <ChevronUp
                                  className="h-4 w-4 text-[#6b7487]"
                                  strokeWidth={1.5}
                                />
                              ) : (
                                <ChevronDown
                                  className="h-4 w-4 text-[#6b7487]"
                                  strokeWidth={1.5}
                                />
                              )}
                              <span>{stu.name}</span>
                              <span className="font-mono text-[12px] font-normal text-[#6b7487]">
                                {stu.id}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-[#4b5565]">
                            {stu.isNewAccount
                              ? "New account (<15m)"
                              : "Established"}
                          </td>
                          <td className="px-5 py-3.5 font-mono font-medium text-[#111827] tabular-nums">
                            {stu.trustScore} / 100
                          </td>
                          <td className="px-5 py-3.5 tabular-nums">
                            <span className="inline-flex items-center gap-2 font-mono text-[#111827]">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${meta.dotColor}`}
                              />
                              <span>
                                {meta.weight} · {meta.tier}
                              </span>
                            </span>
                          </td>
                          <td className="max-w-md px-5 py-3.5 text-[12px] leading-4 text-[#4b5565]">
                            {stu.trustExplanation ?? "No explanation available"}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-[#4b5565] tabular-nums">
                            {stu.trustHistory.length}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td
                              colSpan={6}
                              className="bg-[#f5f7fa] px-6 py-4 space-y-3"
                            >
                              {stu.trustExplanation && (
                                <div className="rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] px-4 py-3 text-[13px] leading-5 text-[#111827]">
                                  <span className="font-medium">
                                    Why {stu.name}&apos;s score is {stu.trustScore}:
                                  </span>{" "}
                                  <span className="text-[#4b5565]">
                                    {stu.trustExplanation}
                                  </span>
                                </div>
                              )}
                              {stu.trustHistory.length === 0 ? (
                                <div className="text-[13px] leading-5 text-[#6b7487]">
                                  No trust audit events recorded for {stu.name}
                                </div>
                              ) : (
                                <div className="overflow-hidden rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff]">
                                  <table className="w-full text-left text-[13px] leading-5">
                                    <thead className="border-b border-[#111827]/[0.08] bg-[#f5f7fa] text-[12px] leading-4 text-[#6b7487]">
                                      <tr>
                                        <th className="px-4 py-2.5 font-normal">
                                          Timestamp
                                        </th>
                                        <th className="px-4 py-2.5 font-normal">
                                          Reason
                                        </th>
                                        <th className="px-4 py-2.5 font-normal">
                                          Ticket
                                        </th>
                                        <th className="px-4 py-2.5 text-right font-normal">
                                          Delta
                                        </th>
                                        <th className="px-4 py-2.5 text-right font-normal">
                                          Score
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#111827]/[0.08]">
                                      {stu.trustHistory.map((ev) => (
                                        <tr key={ev.id}>
                                          <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[12px] text-[#6b7487] tabular-nums">
                                            {formatTime(ev.timestamp)}
                                          </td>
                                          <td className="px-4 py-2.5 text-[#111827]">
                                            {ev.reason}
                                          </td>
                                          <td className="px-4 py-2.5 font-mono text-[12px] text-[#4b5565]">
                                            {ev.issueId ?? "—"}
                                          </td>
                                          <td
                                            className={`whitespace-nowrap px-4 py-2.5 text-right font-mono font-medium tabular-nums ${
                                              ev.delta > 0
                                                ? "text-[#16a34a]"
                                                : ev.delta < 0
                                                ? "text-[#dc2626]"
                                                : "text-[#4b5565]"
                                            }`}
                                          >
                                            {ev.delta > 0
                                              ? `+${ev.delta}`
                                              : ev.delta}
                                          </td>
                                          <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono font-medium text-[#111827] tabular-nums">
                                            {ev.newScore}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
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

      {/* SECTION 5: EXECUTIVE BRIEFING */}
      {activeSection === "briefing" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-[28px] leading-[1.15] font-medium tracking-tight text-[#111827]">
              Executive briefing
            </h1>
            <p className="mt-1 text-[14px] leading-5 text-[#4b5565]">
              Registrar summary of verified safety hazards, department queue
              bottlenecks, and community verification signals
            </p>
          </div>
          {renderExecutiveBriefingCard()}
        </div>
      )}
    </div>
  );
}
