"use client";

import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  PlayCircle,
  Ban,
  ChevronDown,
  ChevronUp,
  Info,
  Lock,
} from "lucide-react";
import type { Issue, IssueStatus, PriorityLevel, User } from "@/lib/types";
import type { StaffNavId } from "@/components/AppSidebar";

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
    if (onSelectFilter) {
      onSelectFilter(next);
    }
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

  return (
    <div className="space-y-6 animate-enter">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-[1.15] font-medium tracking-tight text-[#111827]">
            {dept} department dispatch queue
          </h1>
          <p className="mt-1 flex items-center gap-2 text-[14px] leading-5 text-[#4b5565]">
            <Lock
              className="h-4 w-4 shrink-0 text-[#6b7487]"
              strokeWidth={1.5}
            />
            <span>
              Strictly scoped to {dept}. Reporter identities, raw student text,
              and confidential vault cases are excluded at the API layer
            </span>
          </p>
        </div>
        <span className="font-mono text-[12px] leading-4 text-[#6b7487]">
          Ordered by priority score
        </span>
      </div>

      {/* 4 Compact Stat Cards — numbers only, no corner icons */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => handlePrimaryFilter("ACTIVE")}
          className={`rounded-[12px] border p-5 text-left transition-colors duration-150 ease-craft ${
            activeFilter === "ACTIVE"
              ? "border-[#1d4ed8] bg-[#ffffff]"
              : "border-[#111827]/[0.08] bg-[#ffffff] hover:bg-[#f5f7fa]"
          }`}
        >
          <div className="text-[12px] leading-4 text-[#6b7487]">
            Active department queue
          </div>
          <div className="mt-2 font-mono text-[32px] leading-none font-medium text-[#111827] tabular-nums">
            {counts.active}
          </div>
          <div className="mt-2 text-[12px] leading-4 text-[#4b5565] tabular-nums">
            {counts.total} total scoped to {dept}
          </div>
        </button>

        <button
          type="button"
          onClick={() => handlePrimaryFilter("CRITICAL")}
          className={`rounded-[12px] border p-5 text-left transition-colors duration-150 ease-craft ${
            activeFilter === "CRITICAL"
              ? "border-[#1d4ed8] bg-[#ffffff]"
              : "border-[#111827]/[0.08] bg-[#ffffff] hover:bg-[#f5f7fa]"
          }`}
        >
          <div className="flex items-center gap-2 text-[12px] leading-4 text-[#6b7487]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#dc2626]" />
            <span>Critical safety (98)</span>
          </div>
          <div className="mt-2 font-mono text-[32px] leading-none font-medium text-[#111827] tabular-nums">
            {counts.critical}
          </div>
          <div className="mt-2 text-[12px] leading-4 text-[#4b5565]">
            Verified verbatim safety hazards
          </div>
        </button>

        <button
          type="button"
          onClick={() => handlePrimaryFilter("RESOLVED")}
          className={`rounded-[12px] border p-5 text-left transition-colors duration-150 ease-craft ${
            activeFilter === "RESOLVED"
              ? "border-[#1d4ed8] bg-[#ffffff]"
              : "border-[#111827]/[0.08] bg-[#ffffff] hover:bg-[#f5f7fa]"
          }`}
        >
          <div className="text-[12px] leading-4 text-[#6b7487]">
            Awaiting student verification
          </div>
          <div className="mt-2 font-mono text-[32px] leading-none font-medium text-[#111827] tabular-nums">
            {counts.awaitingVotes}
          </div>
          <div className="mt-2 text-[12px] leading-4 text-[#4b5565]">
            Pending confirm or dispute votes
          </div>
        </button>

        <button
          type="button"
          onClick={() => handlePrimaryFilter("REOPENED")}
          className={`rounded-[12px] border p-5 text-left transition-colors duration-150 ease-craft ${
            activeFilter === "REOPENED"
              ? "border-[#1d4ed8] bg-[#ffffff]"
              : "border-[#111827]/[0.08] bg-[#ffffff] hover:bg-[#f5f7fa]"
          }`}
        >
          <div className="text-[12px] leading-4 text-[#6b7487]">
            Reopened by students
          </div>
          <div className="mt-2 font-mono text-[32px] leading-none font-medium text-[#111827] tabular-nums">
            {counts.reopened}
          </div>
          <div className="mt-2 text-[12px] leading-4 text-[#4b5565]">
            Dispute weight crossed threshold
          </div>
        </button>
      </section>

      {/* Status Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff] px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "ALL_IN_VIEW", label: "Current view" },
            { id: "OPEN", label: "Open" },
            { id: "IN_PROGRESS", label: "In progress" },
            { id: "REOPENED", label: "Reopened" },
            { id: "RESOLVED", label: "Awaiting verification" },
            { id: "VERIFIED_RESOLVED", label: "Verified resolved" },
            { id: "DISMISSED_SPAM", label: "Dismissed" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubFilter(tab.id)}
              className={`h-8 rounded-[8px] px-3 text-[13px] leading-5 transition-colors duration-150 ease-craft ${
                subFilter === tab.id
                  ? "bg-[#111827] text-[#ffffff] font-medium"
                  : "bg-[#f5f7fa] text-[#4b5565] font-normal hover:bg-[#eceff4] hover:text-[#111827]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="font-mono text-[12px] leading-4 text-[#6b7487] tabular-nums">
          Showing {sortedIssues.length} of {issues.length} tickets
        </span>
      </div>

      {/* Queue Cards */}
      {sortedIssues.length === 0 ? (
        <div className="rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff] p-10 text-center text-[14px] leading-5 text-[#4b5565]">
          No tickets match this filter in the {dept} department queue
        </div>
      ) : (
        <div className="space-y-3">
          {sortedIssues.map((issue) => {
            const pb = issue.priorityBreakdown;
            const vp = issue.votingProgress;
            const showBreakdown = !!expandedBreakdown[issue.id];
            const isCritical = issue.priority === "CRITICAL";
            const roomCode = formatRoomCode(
              issue.locationId,
              issue.locationName
            );

            return (
              <article
                key={issue.id}
                className={`rounded-[12px] border bg-[#ffffff] p-5 transition-colors duration-150 ease-craft ${
                  isCritical
                    ? "border-[#dc2626]/30"
                    : "border-[#111827]/[0.08]"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2 min-w-0 flex-1">
                    {/* Signature detail: tabular mono priority tag + status + canonical room code */}
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
                        <span className="font-sans">{issue.locationName}</span>
                      </span>

                      <span className="font-mono text-[#6b7487] tabular-nums">
                        {issue.meTooCount} supporter
                        {issue.meTooCount === 1 ? "" : "s"}
                      </span>

                      {issue.reopenCount > 0 && (
                        <span className="font-mono font-medium text-[#dc2626] tabular-nums">
                          Reopened {issue.reopenCount}x
                        </span>
                      )}
                    </div>

                    <h3 className="text-[15px] leading-[22px] font-medium text-[#111827]">
                      {issue.cleanSummary}
                    </h3>
                    <p className="text-[13px] leading-5 text-[#4b5565]">
                      {issue.oneLineReason}
                    </p>
                  </div>

                  {/* 1-Click Staff Status Actions (all 36px tall, 8px radius, 16px icons) */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
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
                      className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#111827]/[0.08] bg-[#eceff4] px-3 text-[13px] leading-5 font-medium text-[#111827] hover:bg-[#e2e6ee] disabled:cursor-not-allowed disabled:opacity-45 transition-colors duration-150 ease-craft"
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
                        issue.status === "VERIFIED_RESOLVED" ||
                        (staffNotes[issue.id]?.trim().length ?? 0) < 3
                      }
                      title={
                        (staffNotes[issue.id]?.trim().length ?? 0) < 3
                          ? "Enter a resolution note below (at least 3 characters) before marking resolved"
                          : "Mark ticket resolved for student verification"
                      }
                      onClick={() =>
                        onUpdateStatus(
                          issue.id,
                          "RESOLVED",
                          staffNotes[issue.id]?.trim() || undefined
                        )
                      }
                      className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-[#1d4ed8] px-3 text-[13px] leading-5 font-medium text-[#ffffff] hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-45 transition-colors duration-150 ease-craft"
                    >
                      <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
                      <span>Mark resolved</span>
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
                      className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] px-3 text-[13px] leading-5 font-normal text-[#dc2626] hover:bg-[#dc2626]/[0.06] disabled:cursor-not-allowed disabled:opacity-45 transition-colors duration-150 ease-craft"
                    >
                      <Ban className="h-4 w-4" strokeWidth={1.5} />
                      <span>Dismiss spam (-20)</span>
                    </button>
                  </div>
                </div>

                {/* Staff Note + Voting Progress + Breakdown Toggle */}
                <div className="mt-4 flex flex-col gap-3 border-t border-[#111827]/[0.08] pt-3 sm:flex-row sm:items-center sm:justify-between">
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
                      placeholder="Resolution note (required to mark resolved, min 3 characters)"
                      className="h-8 min-w-[240px] flex-1 rounded-[8px] border border-[#111827]/[0.08] bg-[#f5f7fa] px-3 text-[13px] leading-5 text-[#111827] placeholder:text-[#6b7487] focus:bg-[#ffffff]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedBreakdown((prev) => ({
                          ...prev,
                          [issue.id]: !prev[issue.id],
                        }))
                      }
                      className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] px-3 text-[13px] leading-5 font-normal text-[#4b5565] hover:bg-[#f5f7fa] hover:text-[#111827] transition-colors duration-150 ease-craft"
                    >
                      <Info
                        className="h-4 w-4 text-[#6b7487]"
                        strokeWidth={1.5}
                      />
                      <span>Evidence &amp; votes</span>
                      {showBreakdown ? (
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
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-[12px] leading-4 text-[#6b7487] tabular-nums">
                    <span className="font-mono">
                      Confirm {vp.confirmWeight.toFixed(2)} · Dispute{" "}
                      {vp.disputeWeight.toFixed(2)} /{" "}
                      {vp.reopenThreshold.toFixed(2)}
                    </span>
                    <span className="font-mono">{formatTime(issue.updatedAt)}</span>
                  </div>
                </div>

                {showBreakdown && (
                  <div className="mt-3 space-y-3 rounded-[8px] border border-[#111827]/[0.08] bg-[#f5f7fa] p-4 text-[13px] leading-5 text-[#4b5565]">
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="rounded-[6px] border border-[#111827]/[0.08] bg-[#ffffff] p-3">
                        <div className="text-[12px] leading-4 text-[#6b7487]">
                          Impact / safety
                        </div>
                        <div className="mt-1 font-mono font-medium text-[#111827] tabular-nums">
                          {pb.isSafetyHazard
                            ? `Safety (${pb.hazardType.replaceAll("_", " ")})`
                            : `${pb.factualImpact.replaceAll("_", " ")} (Base ${
                                pb.baseScore
                              })`}
                        </div>
                      </div>
                      <div className="rounded-[6px] border border-[#111827]/[0.08] bg-[#ffffff] p-3">
                        <div className="text-[12px] leading-4 text-[#6b7487]">
                          Crowd weight
                        </div>
                        <div className="mt-1 font-mono font-medium text-[#111827] tabular-nums">
                          {pb.effectiveCrowdWeight.toFixed(2)} (+{pb.crowdBonus})
                        </div>
                      </div>
                      <div className="rounded-[6px] border border-[#111827]/[0.08] bg-[#ffffff] p-3">
                        <div className="text-[12px] leading-4 text-[#6b7487]">
                          Eligible voters
                        </div>
                        <div className="mt-1 font-mono font-medium text-[#111827] tabular-nums">
                          {vp.eligibleCount} ({vp.eligibleWeight.toFixed(2)} wt)
                        </div>
                      </div>
                      <div className="rounded-[6px] border border-[#111827]/[0.08] bg-[#ffffff] p-3">
                        <div className="text-[12px] leading-4 text-[#6b7487]">
                          Ticket ID
                        </div>
                        <div className="mt-1 font-mono font-medium text-[#111827]">
                          {issue.id}
                        </div>
                      </div>
                    </div>
                    {pb.safetyQuote && (
                      <div className="rounded-[6px] border border-[#dc2626]/20 bg-[#ffffff] px-3 py-2 text-[12px] leading-4 text-[#111827]">
                        <span className="font-medium text-[#dc2626]">
                          Verified safety quote:
                        </span>{" "}
                        &quot;{pb.safetyQuote}&quot;
                      </div>
                    )}
                    {issue.adminNotes.length > 0 && (
                      <div className="rounded-[6px] border border-[#111827]/[0.08] bg-[#ffffff] px-3 py-2 text-[12px] leading-4">
                        <span className="font-medium text-[#111827]">
                          Audit log:
                        </span>{" "}
                        {issue.adminNotes.join(" · ")}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
