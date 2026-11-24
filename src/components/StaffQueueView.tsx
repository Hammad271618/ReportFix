"use client";

import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  CheckCircle2,
  PlayCircle,
  Ban,
  ChevronDown,
  Lock,
} from "lucide-react";
import type { Issue, IssueStatus, User } from "@/lib/types";
import type { StaffNavId } from "@/components/AppSidebar";
import {
  formatPriorityLabel,
  formatRoomCode,
  formatStatusLabel,
  formatTime,
  priorityScoreStyle,
  statusDotColor,
  stripTrailingPeriod,
} from "@/lib/format-ui";
import {
  AnimatedNumber,
  CRAFT_EASE,
  RevealPanel,
  SectionStage,
  StaggerCard,
} from "@/components/MotionPrimitives";

interface StaffQueueViewProps {
  activeUser: User;
  issues: Issue[];
  busyAction: string | null;
  activeFilter?: StaffNavId;
  onSelectFilter?: (filter: StaffNavId) => void;
  onUpdateStatus: (
    issueId: string,
    status: IssueStatus,
    note?: string
  ) => Promise<void>;
}

const SUB_FILTERS = [
  { id: "ALL_IN_VIEW", label: "All" },
  { id: "OPEN", label: "Open" },
  { id: "IN_PROGRESS", label: "In progress" },
  { id: "REOPENED", label: "Reopened" },
  { id: "RESOLVED", label: "Awaiting votes" },
  { id: "VERIFIED_RESOLVED", label: "Verified" },
  { id: "DISMISSED_SPAM", label: "Dismissed" },
] as const;

export function StaffQueueView({
  activeUser,
  issues,
  busyAction,
  activeFilter = "ACTIVE",
  onSelectFilter,
  onUpdateStatus,
}: StaffQueueViewProps) {
  const [subFilter, setSubFilter] = useState<string>("ALL_IN_VIEW");
  const [expandedBreakdown, setExpandedBreakdown] = useState<
    Record<string, boolean>
  >({});
  const [staffNotes, setStaffNotes] = useState<Record<string, string>>({});

  const dept = activeUser.department ?? "Department";
  const isBusy = busyAction !== null;

  const handlePrimaryFilter = (next: StaffNavId) => {
    setSubFilter("ALL_IN_VIEW");
    onSelectFilter?.(next);
  };

  const sortedIssues = useMemo(() => {
    const filtered = issues.filter((issue) => {
      if (subFilter !== "ALL_IN_VIEW") {
        return issue.status === subFilter;
      }
      if (activeFilter === "ACTIVE") {
        return (
          issue.status === "OPEN" ||
          issue.status === "IN_PROGRESS" ||
          issue.status === "REOPENED" ||
          issue.status === "RESOLVED"
        );
      }
      if (activeFilter === "CRITICAL") {
        return (
          issue.priority === "CRITICAL" &&
          issue.status !== "VERIFIED_RESOLVED" &&
          issue.status !== "DISMISSED_SPAM"
        );
      }
      if (activeFilter === "RESOLVED") {
        return issue.status === "RESOLVED";
      }
      if (activeFilter === "REOPENED") {
        return issue.status === "REOPENED";
      }
      return true;
    });
    return [...filtered].sort((a, b) => b.priorityScore - a.priorityScore);
  }, [issues, activeFilter, subFilter]);

  const counts = useMemo(() => {
    return {
      total: issues.length,
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
      reopened: issues.filter((i) => i.status === "REOPENED").length,
      awaitingVotes: issues.filter((i) => i.status === "RESOLVED").length,
    };
  }, [issues]);

  const kpiCards: Array<{
    id: StaffNavId;
    label: string;
    value: number;
    meta?: string;
    dot?: string;
  }> = [
    {
      id: "ACTIVE",
      label: "Active",
      value: counts.active,
      meta: `of ${counts.total}`,
    },
    {
      id: "CRITICAL",
      label: "Critical",
      value: counts.critical,
      meta: "Priority 98",
      dot: counts.critical > 0 ? "bg-[#dc2626]" : undefined,
    },
    {
      id: "RESOLVED",
      label: "Awaiting votes",
      value: counts.awaitingVotes,
      meta: "Pending check",
    },
    {
      id: "REOPENED",
      label: "Reopened",
      value: counts.reopened,
      meta: "Disputed",
      dot: counts.reopened > 0 ? "bg-[#dc2626]" : undefined,
    },
  ];

  return (
    <SectionStage stageKey={`staff-${activeUser.id}-${activeFilter}`}>
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-[1.15] font-medium tracking-[-0.02em] text-[#171717]">
            {dept} queue
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-[14px] leading-5 text-[#525252]">
            <Lock className="h-3.5 w-3.5 text-[#737373]" strokeWidth={1.5} />
            <span>Scoped to {dept} · sorted by priority</span>
          </p>
        </div>
        <span className="font-mono text-[12px] text-[#737373] tabular-nums">
          {sortedIssues.length} / {issues.length} tickets
        </span>
      </div>

      {/* 4 Compact Stat Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => {
          const selected = activeFilter === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handlePrimaryFilter(card.id)}
              className={`surface-card rounded-[12px] p-4 text-left transition-colors duration-150 ease-craft press-tactile ${
                selected
                  ? "border-[#0f766e]/50 ring-1 ring-[#0f766e]/20"
                  : "hover:border-[#171717]/[0.15]"
              }`}
            >
              <div className="flex items-center justify-between text-[12px] leading-4 text-[#737373]">
                <span className="flex items-center gap-1.5">
                  {card.dot && (
                    <span className={`h-1.5 w-1.5 rounded-full ${card.dot}`} />
                  )}
                  <span>{card.label}</span>
                </span>
                {card.meta && (
                  <span className="font-mono text-[11px] text-[#737373]">
                    {card.meta}
                  </span>
                )}
              </div>
              <div className="mt-2 font-mono text-[28px] leading-none font-medium text-[#171717]">
                <AnimatedNumber value={card.value} />
              </div>
            </button>
          );
        })}
      </section>

      {/* Status Filter Bar with sliding active pill */}
      <div className="surface-card flex flex-wrap items-center justify-between gap-3 rounded-[12px] px-3 py-2">
        <div className="flex flex-wrap items-center gap-1">
          {SUB_FILTERS.map((tab) => {
            const active = subFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubFilter(tab.id)}
                className={`relative h-8 rounded-[7px] px-3 text-[13px] leading-5 transition-colors duration-150 ${
                  active
                    ? "text-[#ffffff] font-medium"
                    : "text-[#525252] hover:bg-[#f3f3f2] hover:text-[#171717]"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="staff-subfilter-pill"
                    transition={{ duration: 0.2, ease: CRAFT_EASE }}
                    className="absolute inset-0 rounded-[7px] bg-[#171717]"
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Queue Cards */}
      {sortedIssues.length === 0 ? (
        <div className="surface-card rounded-[14px] p-10 text-center text-[14px] text-[#525252]">
          No tickets in this view
        </div>
      ) : (
        <div className="space-y-3">
          {sortedIssues.map((issue, idx) => {
            const pb = issue.priorityBreakdown;
            const vp = issue.votingProgress;
            const showBreakdown = !!expandedBreakdown[issue.id];
            const isCritical = issue.priority === "CRITICAL";
            const roomCode = formatRoomCode(
              issue.locationId,
              issue.locationName
            );
            const noteLen = staffNotes[issue.id]?.trim().length ?? 0;

            return (
              <StaggerCard key={issue.id} index={idx}>
                <article
                  className={`surface-card rounded-[12px] p-5 transition-colors duration-150 ease-craft hover:border-[#171717]/[0.14] ${
                    isCritical ? "border-[#dc2626]/30" : ""
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                      {/* Priority plaque */}
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

                          <span className="font-mono tabular-nums">
                            {issue.meTooCount}{" "}
                            {issue.meTooCount === 1 ? "supporter" : "supporters"}
                          </span>

                          {issue.reopenCount > 0 && (
                            <span className="font-mono font-medium text-[#dc2626] tabular-nums">
                              Reopened {issue.reopenCount}x
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-[13px] leading-5 text-[#525252]">
                          {stripTrailingPeriod(issue.oneLineReason)}
                        </p>
                      </div>
                    </div>

                    {/* 1-Click Actions */}
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={isBusy || issue.status === "IN_PROGRESS"}
                        onClick={() =>
                          onUpdateStatus(
                            issue.id,
                            "IN_PROGRESS",
                            staffNotes[issue.id]?.trim() || undefined
                          )
                        }
                        className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#171717]/[0.1] bg-[#ffffff] px-3 text-[13px] font-medium text-[#171717] hover:bg-[#f3f3f2] disabled:cursor-not-allowed disabled:opacity-40 press-tactile"
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
                          issue.status === "VERIFIED_RESOLVED" ||
                          noteLen < 3
                        }
                        title={
                          noteLen < 3
                            ? "Add a resolution note below first"
                            : "Mark resolved"
                        }
                        onClick={() =>
                          onUpdateStatus(
                            issue.id,
                            "RESOLVED",
                            staffNotes[issue.id]?.trim() || undefined
                          )
                        }
                        className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-[#171717] px-3 text-[13px] font-medium text-[#ffffff] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-35 press-tactile"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        <span>Resolve</span>
                      </button>

                      <button
                        type="button"
                        disabled={isBusy || issue.status === "DISMISSED_SPAM"}
                        onClick={() =>
                          onUpdateStatus(
                            issue.id,
                            "DISMISSED_SPAM",
                            staffNotes[issue.id]?.trim() || undefined
                          )
                        }
                        className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#171717]/[0.09] bg-[#ffffff] px-3 text-[13px] text-[#dc2626] hover:bg-[#dc2626]/[0.06] disabled:cursor-not-allowed disabled:opacity-40 press-tactile"
                      >
                        <Ban className="h-3.5 w-3.5" strokeWidth={1.5} />
                        <span>Spam</span>
                      </button>
                    </div>
                  </div>

                  {/* Resolution Note + Details Toggle */}
                  <div className="mt-4 flex flex-col gap-3 border-t border-[#171717]/[0.07] pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={staffNotes[issue.id] ?? ""}
                        onChange={(e) =>
                          setStaffNotes((prev) => ({
                            ...prev,
                            [issue.id]: e.target.value,
                          }))
                        }
                        placeholder="Add resolution note (required to resolve)"
                        className="h-8 min-w-[220px] flex-1 rounded-[8px] border border-[#171717]/[0.09] bg-[#fafafa] px-3 text-[13px] leading-5 text-[#171717] placeholder:text-[#737373] focus:border-[#0f766e]/50 focus:bg-[#ffffff] focus:outline-none transition-colors duration-150"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedBreakdown((prev) => ({
                            ...prev,
                            [issue.id]: !prev[issue.id],
                          }))
                        }
                        className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#171717]/[0.09] bg-[#ffffff] px-2.5 text-[12px] font-medium text-[#525252] hover:bg-[#f3f3f2] hover:text-[#171717] press-tactile"
                      >
                        <span>Details</span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-[#737373] transition-transform duration-150 ${
                            showBreakdown ? "rotate-180" : ""
                          }`}
                          strokeWidth={1.5}
                        />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px] text-[#737373] tabular-nums">
                      <span>
                        Confirm {vp.confirmWeight.toFixed(2)} · Dispute{" "}
                        {vp.disputeWeight.toFixed(2)}/{vp.reopenThreshold.toFixed(2)}
                      </span>
                      <span>{formatTime(issue.updatedAt)}</span>
                    </div>
                  </div>

                  <RevealPanel open={showBreakdown}>
                    <div className="mt-3 space-y-3 rounded-[10px] border border-[#171717]/[0.07] bg-[#fafafa] p-4 text-[13px]">
                      <div className="grid gap-3 sm:grid-cols-4">
                        <div className="rounded-[8px] border border-[#171717]/[0.06] bg-[#ffffff] p-3">
                          <div className="text-[11px] text-[#737373]">
                            Impact
                          </div>
                          <div className="mt-1 font-mono text-[12px] font-medium text-[#171717]">
                            {pb.isSafetyHazard
                              ? pb.hazardType.replaceAll("_", " ")
                              : `${pb.factualImpact.replaceAll("_", " ")} (${
                                  pb.baseScore
                                })`}
                          </div>
                        </div>
                        <div className="rounded-[8px] border border-[#171717]/[0.06] bg-[#ffffff] p-3">
                          <div className="text-[11px] text-[#737373]">
                            Crowd weight
                          </div>
                          <div className="mt-1 font-mono text-[12px] font-medium text-[#171717] tabular-nums">
                            {pb.effectiveCrowdWeight.toFixed(2)} (+
                            {pb.crowdBonus})
                          </div>
                        </div>
                        <div className="rounded-[8px] border border-[#171717]/[0.06] bg-[#ffffff] p-3">
                          <div className="text-[11px] text-[#737373]">
                            Eligible voters
                          </div>
                          <div className="mt-1 font-mono text-[12px] font-medium text-[#171717] tabular-nums">
                            {vp.eligibleCount} ({vp.eligibleWeight.toFixed(2)} wt)
                          </div>
                        </div>
                        <div className="rounded-[8px] border border-[#171717]/[0.06] bg-[#ffffff] p-3">
                          <div className="text-[11px] text-[#737373]">
                            Ticket ID
                          </div>
                          <div className="mt-1 font-mono text-[12px] font-medium text-[#171717]">
                            {issue.id}
                          </div>
                        </div>
                      </div>

                      {pb.safetyQuote && (
                        <div className="rounded-[8px] border border-[#dc2626]/20 bg-[#ffffff] px-3 py-2 text-[12px] text-[#171717]">
                          <span className="font-medium text-[#dc2626]">
                            Safety quote:
                          </span>{" "}
                          &quot;{pb.safetyQuote}&quot;
                        </div>
                      )}

                      {issue.adminNotes.length > 0 && (
                        <div className="rounded-[8px] border border-[#171717]/[0.06] bg-[#ffffff] px-3 py-2 text-[12px] text-[#525252]">
                          <span className="font-medium text-[#171717]">
                            Log:
                          </span>{" "}
                          {issue.adminNotes.join(" · ")}
                        </div>
                      )}
                    </div>
                  </RevealPanel>
                </article>
              </StaggerCard>
            );
          })}
        </div>
      )}
    </SectionStage>
  );
}
