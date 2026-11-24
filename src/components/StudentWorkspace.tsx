"use client";

import React, { useMemo, useState } from "react";
import {
  Send,
  MapPin,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lock,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  Cpu,
  Scale,
  Search,
  ArrowUpRight,
} from "lucide-react";
import {
  DEPARTMENTS,
  type CampusLocation,
  type Department,
  type Issue,
  type IssueStatus,
  type PendingClarification,
  type PriorityLevel,
  type SubmitReportResponse,
  type TriageItemTrace,
  type User,
} from "@/lib/types";
import type { StudentNavId } from "@/components/AppSidebar";

interface StudentWorkspaceProps {
  activeUser: User;
  issues: Issue[];
  trendingIssues: Issue[];
  myIssues: Issue[];
  pendingClarifications: PendingClarification[];
  campusLocations: CampusLocation[];
  lastSubmission: SubmitReportResponse | null;
  busyAction: string | null;
  activeSection?: StudentNavId;
  onSelectSection?: (section: StudentNavId) => void;
  onSubmitReport: (text: string) => Promise<void>;
  onClarify: (clarificationId: string, locationId: string) => Promise<void>;
  onJoinIssue: (issueId: string) => Promise<void>;
  onVoteIssue: (
    issueId: string,
    choice: "CONFIRM" | "DISPUTE",
    comment?: string
  ) => Promise<void>;
}

const PRESET_PROMPTS: Array<{ label: string; text: string }> = [
  {
    label: "Roman Urdu AC",
    text: "Library Main Room ka AC bilkul thanda nahi kar raha, garmi bohot zyada hai",
  },
  {
    label: "Calm electrical spark",
    text: "Please check the socket near the wall in CR 20, there were faint sparks and a slight burning smell earlier.",
  },
  {
    label: "Caps-lock minor chair",
    text: "URGENT EMERGENCY!!! ONE CHAIR IN CR 32 HAS A LOOSE SCREW FIX IT NOW!!!",
  },
  {
    label: "Compound ragging + AC",
    text: "Seniors are ragging and intimidating first year students in Qasid Complex, and the AC in IS 215 is also leaking water.",
  },
  {
    label: "Unlisted CR 99",
    text: "The projector in CR 99 is flickering badly and needs repair.",
  },
  {
    label: "Ambiguous lab",
    text: "The main router in the lab keeps disconnecting during class.",
  },
];

const TRUST_TIERS = [
  { range: "80 – 100", label: "Trusted", weight: "1.00x", min: 80, max: 100 },
  { range: "60 – 79", label: "Standard", weight: "0.80x", min: 60, max: 79 },
  { range: "45 – 59", label: "Developing", weight: "0.55x", min: 45, max: 59 },
  { range: "25 – 44", label: "Low trust", weight: "0.35x", min: 25, max: 44 },
  { range: "0 – 24", label: "Restricted", weight: "0.15x", min: 0, max: 24 },
];

function getTrustMeta(score: number): {
  tier: string;
  weight: string;
  dotColor: string;
} {
  if (score >= 80) {
    return { tier: "Trusted", weight: "1.00x", dotColor: "bg-[#16a34a]" };
  }
  if (score >= 60) {
    return { tier: "Standard", weight: "0.80x", dotColor: "bg-[#1d4ed8]" };
  }
  if (score >= 45) {
    return { tier: "Developing", weight: "0.55x", dotColor: "bg-[#d97706]" };
  }
  if (score >= 25) {
    return { tier: "Low trust", weight: "0.35x", dotColor: "bg-[#ea580c]" };
  }
  return { tier: "Restricted", weight: "0.15x", dotColor: "bg-[#dc2626]" };
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

function formatOutcomeLabel(outcome: TriageItemTrace["outcome"]): string {
  switch (outcome) {
    case "CREATED":
      return "Ticket created";
    case "MERGED_ME_TOO":
      return "Merged as supporter";
    case "DISPUTED_RESOLVED":
      return "Disputed resolved ticket";
    case "CONFIDENTIAL_CREATED":
      return "Isolated in confidential vault";
    case "NEEDS_CLARIFICATION":
      return "Location clarification required";
    case "HELD_BRIGADE":
      return "Held for brigade review";
    case "REJECTED_NO_ISSUE":
      return "No actionable issue";
    case "REJECTED_INJECTION":
      return "Prompt injection rejected";
  }
}

function formatClarificationStatus(
  status: PendingClarification["status"]
): string {
  switch (status) {
    case "AMBIGUOUS":
      return "Ambiguous location";
    case "NONEXISTENT":
      return "Unlisted location";
    case "MISSING":
      return "Missing location";
  }
}

function formatCategoryName(cat: string): string {
  return cat.replaceAll("_", " ");
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

export function StudentWorkspace({
  activeUser,
  issues,
  trendingIssues,
  myIssues,
  pendingClarifications,
  campusLocations,
  lastSubmission,
  busyAction,
  activeSection = "report",
  onSelectSection,
  onSubmitReport,
  onClarify,
  onJoinIssue,
  onVoteIssue,
}: StudentWorkspaceProps) {
  const [reportText, setReportText] = useState("");
  const [inlineDirectoryOpen, setInlineDirectoryOpen] = useState(false);
  const [boardMode, setBoardMode] = useState<"trending" | "all">("trending");
  const [boardDeptFilter, setBoardDeptFilter] = useState<string>("ALL");
  const [roomSearch, setRoomSearch] = useState("");
  const [clarifySelections, setClarifySelections] = useState<
    Record<string, string>
  >({});
  const [voteComments, setVoteComments] = useState<Record<string, string>>({});

  const switchSection = (sec: StudentNavId) => {
    if (onSelectSection) {
      onSelectSection(sec);
    }
  };

  const locationsByDept = useMemo(() => {
    const map: Record<Department, CampusLocation[]> = {
      EE: [],
      CSE: [],
      IS: [],
      Library: [],
      Cafeteria: [],
      Labs: [],
    };
    for (const loc of campusLocations) {
      if (map[loc.ownerDepartment]) {
        map[loc.ownerDepartment].push(loc);
      }
    }
    return map;
  }, [campusLocations]);

  const filteredLocationsByDept = useMemo(() => {
    const q = roomSearch.trim().toLowerCase();
    const map: Record<Department, CampusLocation[]> = {
      EE: [],
      CSE: [],
      IS: [],
      Library: [],
      Cafeteria: [],
      Labs: [],
    };
    for (const loc of campusLocations) {
      if (
        !q ||
        loc.name.toLowerCase().includes(q) ||
        loc.id.toLowerCase().includes(q) ||
        loc.ownerDepartment.toLowerCase().includes(q) ||
        loc.description.toLowerCase().includes(q)
      ) {
        map[loc.ownerDepartment]?.push(loc);
      }
    }
    return map;
  }, [campusLocations, roomSearch]);

  const trustMeta = getTrustMeta(activeUser.trustScore);

  const displayedBoardIssues = useMemo(() => {
    const base = boardMode === "trending" ? trendingIssues : issues;
    if (boardDeptFilter === "ALL") return base;
    return base.filter((i) => i.department === boardDeptFilter);
  }, [boardMode, trendingIssues, issues, boardDeptFilter]);

  const isBusy = busyAction !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportText.trim() || isBusy) return;
    await onSubmitReport(reportText);
    setReportText("");
  };

  const renderIssueCard = (issue: Issue, mode: "my" | "board") => {
    const vp = issue.votingProgress;
    const isResolved = issue.status === "RESOLVED";
    const isTerminal =
      issue.status === "RESOLVED" ||
      issue.status === "VERIFIED_RESOLVED" ||
      issue.status === "DISMISSED_SPAM";
    const disputeRatio =
      vp.reopenThreshold > 0
        ? Math.min(1, vp.disputeWeight / vp.reopenThreshold)
        : 0;
    const confirmRatio =
      vp.reopenThreshold > 0
        ? Math.min(1, vp.confirmWeight / vp.reopenThreshold)
        : 0;
    const roomCode = formatRoomCode(issue.locationId, issue.locationName);

    return (
      <article
        key={issue.id}
        className={`rounded-[12px] border bg-[#ffffff] p-5 transition-colors duration-150 ease-craft ${
          issue.priority === "CRITICAL"
            ? "border-[#dc2626]/30"
            : "border-[#111827]/[0.08]"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 min-w-0 flex-1">
            {/* Signature detail: tabular mono priority tag + status dot + canonical room code */}
            <div className="flex flex-wrap items-center gap-2 text-[12px] leading-4">
              <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#eceff4] px-2 py-1 font-mono font-medium text-[#111827] tabular-nums">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${priorityDotColor(
                    issue.priority
                  )}`}
                />
                <span>
                  {issue.priorityScore} · {formatPriorityLabel(issue.priority)}
                </span>
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-[6px] border border-[#111827]/[0.08] bg-[#ffffff] px-2 py-1 text-[#4b5565]">
                <span>{formatStatusLabel(issue.status)}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#f5f7fa] px-2 py-1 font-mono text-[#4b5565]">
                <span className="text-[#111827] font-medium">{roomCode}</span>
                <span className="text-[#6b7487]">·</span>
                <span className="font-sans">{issue.locationName}</span>
              </span>

              <span className="font-mono text-[#6b7487]">
                {issue.department === "CONFIDENTIAL_VAULT"
                  ? "Confidential vault"
                  : `${issue.department} dept`}
              </span>

              {issue.isConfidential && (
                <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#eceff4] px-2 py-1 font-medium text-[#111827]">
                  <Lock className="h-3.5 w-3.5 text-[#4b5565]" strokeWidth={1.5} />
                  <span>Private receipt</span>
                </span>
              )}

              {issue.reopenCount > 0 && (
                <span className="font-mono text-[#dc2626] tabular-nums">
                  Reopened {issue.reopenCount}x
                </span>
              )}
            </div>

            <h4 className="text-[15px] leading-[22px] font-medium text-[#111827]">
              {issue.cleanSummary}
            </h4>
            <p className="text-[13px] leading-5 text-[#4b5565]">
              {issue.oneLineReason}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {mode === "board" && !issue.isConfidential && (
              <button
                type="button"
                disabled={isBusy || isTerminal || !!issue.userHasJoined}
                onClick={() => onJoinIssue(issue.id)}
                className={`inline-flex h-8 items-center gap-2 rounded-[8px] border px-3 text-[13px] leading-5 font-medium tabular-nums transition-colors duration-150 ease-craft ${
                  issue.userHasJoined
                    ? "border-[#16a34a]/30 bg-[#16a34a]/[0.08] text-[#15803d]"
                    : isTerminal
                    ? "border-[#111827]/[0.08] bg-[#f5f7fa] text-[#6b7487] cursor-not-allowed"
                    : "border-[#111827]/[0.08] bg-[#eceff4] text-[#111827] hover:bg-[#e2e6ee]"
                }`}
              >
                <ThumbsUp className="h-4 w-4 text-[#4b5565]" strokeWidth={1.5} />
                <span>
                  {issue.userHasJoined
                    ? `Joined · ${issue.meTooCount}`
                    : `Me too · ${issue.meTooCount}`}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Moment 2: Resolution Verification Meter & Student Vote Controls */}
        {(isResolved ||
          vp.confirmWeight > 0 ||
          vp.disputeWeight > 0 ||
          vp.heldBrigadeCount > 0) && (
          <div className="mt-4 rounded-[8px] border border-[#111827]/[0.08] bg-[#f5f7fa] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] leading-4">
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-medium text-[#111827]">
                  Resolution verification
                </span>
                <span className="font-mono text-[#4b5565] tabular-nums">
                  Dispute {vp.disputeWeight.toFixed(2)} /{" "}
                  {vp.reopenThreshold.toFixed(2)} reopen threshold
                </span>
                <span className="font-mono text-[#4b5565] tabular-nums">
                  Confirm {vp.confirmWeight.toFixed(2)}
                </span>
              </div>
              <span className="font-mono text-[#6b7487] tabular-nums">
                {vp.eligibleCount} eligible voters ({vp.eligibleWeight.toFixed(2)}{" "}
                total wt)
              </span>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 flex justify-between text-[12px] leading-4 text-[#4b5565]">
                  <span>Confirmed fixed</span>
                  <span className="font-mono tabular-nums">
                    {Math.round(confirmRatio * 100)}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-[4px] bg-[#eceff4]">
                  <div
                    className="h-full w-full origin-left rounded-[4px] bg-[#16a34a] transition-transform duration-300 ease-craft"
                    style={{ transform: `scaleX(${confirmRatio})` }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-[12px] leading-4 text-[#4b5565]">
                  <span>Disputed (reopens at 100%)</span>
                  <span className="font-mono tabular-nums">
                    {Math.round(disputeRatio * 100)}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-[4px] bg-[#eceff4]">
                  <div
                    className="h-full w-full origin-left rounded-[4px] bg-[#dc2626] transition-transform duration-300 ease-craft"
                    style={{ transform: `scaleX(${disputeRatio})` }}
                  />
                </div>
              </div>
            </div>

            {vp.heldBrigadeCount > 0 && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-[6px] border border-[#d97706]/30 bg-[#ffffff] px-3 py-1.5 text-[12px] leading-4 text-[#b45309] tabular-nums">
                <span className="h-1.5 w-1.5 rounded-full bg-[#d97706]" />
                <span>
                  {vp.heldBrigadeCount} new-account action(s) held for registrar
                  brigade review
                </span>
              </div>
            )}

            {isResolved && vp.userCanVote && (
              <div className="mt-3 flex flex-col gap-2 border-t border-[#111827]/[0.08] pt-3 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={voteComments[issue.id] ?? ""}
                  onChange={(e) =>
                    setVoteComments((prev) => ({
                      ...prev,
                      [issue.id]: e.target.value,
                    }))
                  }
                  placeholder="Optional verification note (for example: AC still blowing warm air)"
                  className="h-9 flex-1 rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] px-3 text-[13px] leading-5 text-[#111827] placeholder:text-[#6b7487]"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() =>
                      onVoteIssue(issue.id, "CONFIRM", voteComments[issue.id])
                    }
                    className={`inline-flex h-9 items-center gap-2 rounded-[8px] border px-3 text-[13px] leading-5 font-medium transition-colors duration-150 ease-craft ${
                      vp.userCurrentVote === "CONFIRM"
                        ? "border-[#16a34a] bg-[#16a34a] text-[#ffffff]"
                        : "border-[#111827]/[0.08] bg-[#ffffff] text-[#111827] hover:bg-[#eceff4]"
                    } disabled:opacity-50`}
                  >
                    <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
                    <span>Confirm fix</span>
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() =>
                      onVoteIssue(issue.id, "DISPUTE", voteComments[issue.id])
                    }
                    className={`inline-flex h-9 items-center gap-2 rounded-[8px] border px-3 text-[13px] leading-5 font-medium transition-colors duration-150 ease-craft ${
                      vp.userCurrentVote === "DISPUTE"
                        ? "border-[#dc2626] bg-[#dc2626] text-[#ffffff]"
                        : "border-[#111827]/[0.08] bg-[#ffffff] text-[#dc2626] hover:bg-[#dc2626]/[0.06]"
                    } disabled:opacity-50`}
                  >
                    <XCircle className="h-4 w-4" strokeWidth={1.5} />
                    <span>Dispute — still broken</span>
                  </button>
                </div>
              </div>
            )}

            {isResolved && !vp.userCanVote && (
              <p className="mt-2 text-[12px] leading-4 text-[#6b7487]">
                Verification voting is restricted to students who reported or
                joined this issue before it was marked resolved
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#111827]/[0.08] pt-3 text-[12px] leading-4 text-[#6b7487] tabular-nums">
          <span>
            Ticket <span className="font-mono text-[#4b5565]">{issue.id}</span> ·{" "}
            {issue.meTooCount} supporter{issue.meTooCount === 1 ? "" : "s"}
          </span>
          <span className="font-mono">Updated {formatTime(issue.updatedAt)}</span>
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-6 animate-enter">
      {/* SECTION 1: REPORT & TRIAGE */}
      {activeSection === "report" && (
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[28px] leading-[1.15] font-medium tracking-tight text-[#111827]">
                Report &amp; triage
              </h1>
              <p className="mt-1 text-[14px] leading-5 text-[#4b5565]">
                Write in English or Roman Urdu. Compound reports split into
                separate tickets; harassment and ragging isolate automatically in
                the confidential vault
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setInlineDirectoryOpen((v) => !v)}
                className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] px-3 text-[13px] leading-5 font-normal text-[#4b5565] hover:bg-[#eceff4] hover:text-[#111827] transition-colors duration-150 ease-craft"
              >
                <MapPin className="h-4 w-4 text-[#6b7487]" strokeWidth={1.5} />
                <span className="tabular-nums">
                  Quick room picker ({campusLocations.length})
                </span>
                {inlineDirectoryOpen ? (
                  <ChevronUp className="h-4 w-4 text-[#6b7487]" strokeWidth={1.5} />
                ) : (
                  <ChevronDown
                    className="h-4 w-4 text-[#6b7487]"
                    strokeWidth={1.5}
                  />
                )}
              </button>
            </div>
          </div>

          {/* Intake Composer Card */}
          <section className="rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff] p-6">
            {inlineDirectoryOpen && (
              <div className="mb-5 rounded-[8px] border border-[#111827]/[0.08] bg-[#f5f7fa] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] leading-5 font-medium text-[#111827]">
                    Canonical campus rooms by owning department
                  </span>
                  <span className="text-[12px] leading-4 text-[#6b7487]">
                    Select a room to append its canonical name to your report
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {DEPARTMENTS.map((dept) => (
                    <div
                      key={dept}
                      className="rounded-[6px] border border-[#111827]/[0.08] bg-[#ffffff] p-3"
                    >
                      <div className="mb-2 text-[12px] leading-4 font-medium text-[#111827]">
                        {dept} department
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {locationsByDept[dept].map((loc) => (
                          <button
                            key={loc.id}
                            type="button"
                            title={loc.description}
                            onClick={() =>
                              setReportText((prev) =>
                                prev.trim()
                                  ? `${prev.trim()} (${loc.name})`
                                  : `Issue in ${loc.name}: `
                              )
                            }
                            className="rounded-[4px] border border-[#111827]/[0.08] bg-[#f5f7fa] px-2 py-1 text-[12px] leading-4 text-[#4b5565] hover:border-[#1d4ed8] hover:text-[#111827] transition-colors duration-150 ease-craft"
                          >
                            {loc.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="issue-report-input"
                  className="mb-2 block text-[13px] leading-5 font-medium text-[#111827]"
                >
                  Issue description &amp; room location
                </label>
                <textarea
                  id="issue-report-input"
                  rows={3}
                  maxLength={2000}
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  placeholder="Describe the facility or safety issue and exact room, lab, or floor"
                  className="w-full rounded-[8px] border border-[#111827]/[0.08] bg-[#f5f7fa] p-3 text-[14px] leading-5 text-[#111827] placeholder:text-[#6b7487] focus:bg-[#ffffff] transition-colors duration-150 ease-craft"
                />
              </div>

              {/* Sample scenarios */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[12px] leading-4 text-[#6b7487]">
                  Sample scenarios
                </span>
                {PRESET_PROMPTS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setReportText(preset.text)}
                    className="h-7 rounded-[6px] border border-[#111827]/[0.08] bg-[#f5f7fa] px-2.5 text-[12px] leading-4 font-normal text-[#4b5565] hover:bg-[#eceff4] hover:text-[#111827] transition-colors duration-150 ease-craft"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#111827]/[0.08] pt-4">
                <div className="flex items-center gap-2 text-[13px] leading-5 text-[#4b5565] tabular-nums">
                  <span
                    className={`h-2 w-2 rounded-full ${trustMeta.dotColor}`}
                  />
                  <span>
                    Reporting as{" "}
                    <strong className="font-medium text-[#111827]">
                      {activeUser.name}
                    </strong>{" "}
                    · Trust{" "}
                    <span className="font-mono text-[#111827]">
                      {activeUser.trustScore}
                    </span>{" "}
                    · Weight{" "}
                    <span className="font-mono text-[#111827]">
                      {trustMeta.weight}
                    </span>
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isBusy || !reportText.trim()}
                  className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-[#1d4ed8] px-4 text-[14px] leading-5 font-medium text-[#ffffff] hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150 ease-craft"
                >
                  <Send className="h-4 w-4" strokeWidth={1.5} />
                  <span>
                    {busyAction === "submit-report"
                      ? "Triaging report"
                      : "Submit report"}
                  </span>
                </button>
              </div>
            </form>
          </section>

          {/* Pending Location Clarifications */}
          {pendingClarifications.length > 0 && (
            <section className="space-y-3 rounded-[12px] border border-[#d97706]/30 bg-[#ffffff] p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#d97706]" />
                    <h2 className="text-[15px] leading-[22px] font-medium text-[#111827] tabular-nums">
                      Location clarification required (
                      {pendingClarifications.length})
                    </h2>
                  </div>
                  <p className="mt-1 text-[13px] leading-5 text-[#4b5565]">
                    Deterministic room validation blocked auto-guessing an
                    ambiguous or unlisted campus room. Choose the verified room
                    below to complete routing
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {pendingClarifications.map((clr) => {
                  const selectedLocId =
                    clarifySelections[clr.id] ??
                    clr.suggestedLocations[0]?.id ??
                    campusLocations[0]?.id ??
                    "";

                  return (
                    <div
                      key={clr.id}
                      className="rounded-[8px] border border-[#111827]/[0.08] bg-[#f5f7fa] p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-[12px] leading-4">
                        <span className="rounded-[4px] bg-[#eceff4] px-2 py-0.5 font-medium text-[#111827]">
                          {formatClarificationStatus(clr.status)}
                        </span>
                        {clr.extractedMention && (
                          <span className="font-mono text-[#4b5565]">
                            Mentioned: &quot;{clr.extractedMention}&quot;
                          </span>
                        )}
                        {clr.isVerifiedSafetyHazard && (
                          <span className="inline-flex items-center gap-1.5 rounded-[4px] bg-[#dc2626]/[0.08] px-2 py-0.5 font-medium text-[#dc2626]">
                            <AlertTriangle
                              className="h-3.5 w-3.5"
                              strokeWidth={1.5}
                            />
                            <span>Verified safety hazard preserved</span>
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-[14px] leading-5 font-medium text-[#111827]">
                        {clr.cleanSummary}
                      </p>
                      <p className="mt-1 text-[13px] leading-5 text-[#4b5565]">
                        {clr.reason}
                      </p>

                      {clr.suggestedLocations.length > 0 && (
                        <div className="mt-3">
                          <div className="mb-1.5 text-[12px] leading-4 text-[#6b7487]">
                            Suggested canonical rooms
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {clr.suggestedLocations.map((loc) => (
                              <button
                                key={loc.id}
                                type="button"
                                disabled={isBusy}
                                onClick={() => onClarify(clr.id, loc.id)}
                                className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] px-3 text-[13px] leading-5 font-medium text-[#111827] hover:border-[#1d4ed8] hover:text-[#1d4ed8] disabled:opacity-50 transition-colors duration-150 ease-craft"
                              >
                                <MapPin
                                  className="h-4 w-4 text-[#6b7487]"
                                  strokeWidth={1.5}
                                />
                                <span>
                                  {loc.name} ({loc.ownerDepartment})
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#111827]/[0.08] pt-3">
                        <select
                          value={selectedLocId}
                          onChange={(e) =>
                            setClarifySelections((prev) => ({
                              ...prev,
                              [clr.id]: e.target.value,
                            }))
                          }
                          className="h-9 min-w-[240px] flex-1 rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] px-3 text-[13px] leading-5 text-[#111827]"
                        >
                          {DEPARTMENTS.map((dept) => (
                            <optgroup key={dept} label={`${dept} department`}>
                              {locationsByDept[dept].map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                  {loc.name} ({loc.ownerDepartment})
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={isBusy || !selectedLocId}
                          onClick={() => onClarify(clr.id, selectedLocId)}
                          className="h-9 rounded-[8px] bg-[#111827] px-4 text-[13px] leading-5 font-medium text-[#ffffff] hover:bg-[#1f2937] disabled:opacity-50 transition-colors duration-150 ease-craft"
                        >
                          Confirm room
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Moment 1: AI-vs-Code Triage Trace & Priority Formula Ledger */}
          {lastSubmission ? (
            <section className="rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff] p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-[#4b5565]" strokeWidth={1.5} />
                  <h2 className="text-[15px] leading-[22px] font-medium text-[#111827] tabular-nums">
                    Latest triage trace ({lastSubmission.items.length}{" "}
                    {lastSubmission.items.length === 1 ? "item" : "items"})
                  </h2>
                </div>
                {lastSubmission.message && (
                  <span className="text-[13px] leading-5 text-[#4b5565]">
                    {lastSubmission.message}
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {lastSubmission.items.map((item) => {
                  const priorityDisplay = item.codeDecision.priority
                    ? `${item.codeDecision.priorityScore ?? "-"} · ${formatPriorityLabel(
                        item.codeDecision.priority
                      )}`
                    : "Pending room verification";

                  return (
                    <div
                      key={item.itemIndex}
                      className="rounded-[10px] border border-[#111827]/[0.08] bg-[#f5f7fa] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="rounded-[6px] bg-[#eceff4] px-2.5 py-1 font-mono text-[12px] leading-4 font-medium text-[#111827]">
                            {formatOutcomeLabel(item.outcome)}
                          </span>
                          <span className="text-[14px] leading-5 font-medium text-[#111827]">
                            {item.cleanSummary}
                          </span>
                        </div>
                        {item.codeDecision.trustDelta !== 0 && (
                          <span
                            className={`font-mono text-[12px] leading-4 font-medium tabular-nums ${
                              item.codeDecision.trustDelta > 0
                                ? "text-[#16a34a]"
                                : "text-[#dc2626]"
                            }`}
                          >
                            Trust {item.codeDecision.trustDelta > 0 ? "+" : ""}
                            {item.codeDecision.trustDelta}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        {/* Left: AI Semantic Extraction */}
                        <div className="rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] p-4 text-[13px] leading-5">
                          <div className="mb-3 flex items-center justify-between">
                            <span className="font-medium text-[#111827]">
                              Probabilistic semantic extraction
                            </span>
                            <span className="font-mono text-[12px] leading-4 text-[#6b7487]">
                              {item.aiExtracted.usedFallback
                                ? "Deterministic fallback"
                                : "Gemini pass"}
                            </span>
                          </div>
                          <dl className="space-y-2">
                            <div className="flex justify-between gap-2">
                              <dt className="text-[#6b7487]">Category</dt>
                              <dd className="font-mono text-[#111827]">
                                {formatCategoryName(item.aiExtracted.category)}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-[#6b7487]">Factual impact</dt>
                              <dd className="font-mono text-[#111827]">
                                {formatCategoryName(
                                  item.aiExtracted.factualImpact
                                )}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-[#6b7487]">
                                Location mention
                              </dt>
                              <dd className="font-mono text-[#111827]">
                                {item.aiExtracted.rawLocationMention || "None"}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-[#6b7487]">
                                Safety / sensitivity
                              </dt>
                              <dd className="text-right text-[#111827]">
                                {item.aiExtracted.isHarassmentOrRagging
                                  ? "Harassment / ragging"
                                  : item.aiExtracted.safetyClaimed
                                  ? `Hazard claimed${
                                      item.aiExtracted.safetyQuote
                                        ? ` ("${item.aiExtracted.safetyQuote}")`
                                        : ""
                                    }`
                                  : "Standard facility issue"}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        {/* Right: Deterministic Code Enforcement */}
                        <div className="rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] p-4 text-[13px] leading-5">
                          <div className="mb-3 flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 font-medium text-[#111827]">
                              <Scale
                                className="h-4 w-4 text-[#6b7487]"
                                strokeWidth={1.5}
                              />
                              <span>Deterministic rule decision</span>
                            </span>
                            {item.codeDecision.safetyVerified && (
                              <span className="font-mono text-[12px] leading-4 font-medium text-[#dc2626]">
                                Safety verified
                                {item.codeDecision.safetySecondPassUsed
                                  ? " (2nd pass)"
                                  : ""}
                              </span>
                            )}
                          </div>
                          <dl className="space-y-2">
                            <div className="flex justify-between gap-2">
                              <dt className="text-[#6b7487]">
                                Canonical route
                              </dt>
                              <dd className="font-medium text-[#111827]">
                                {item.codeDecision.locationName
                                  ? `${item.codeDecision.locationName} → ${item.codeDecision.department}`
                                  : "Awaiting room clarification"}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-[#6b7487]">Priority</dt>
                              <dd className="font-mono font-medium text-[#111827] tabular-nums">
                                {priorityDisplay}
                              </dd>
                            </div>
                            {item.codeDecision.oneLineReason && (
                              <div className="flex justify-between gap-2">
                                <dt className="text-[#6b7487]">Rule note</dt>
                                <dd className="text-right text-[#4b5565]">
                                  {item.codeDecision.oneLineReason}
                                </dd>
                              </div>
                            )}
                            {item.codeDecision.toneIgnoredNote && (
                              <div className="rounded-[6px] bg-[#f5f7fa] px-2.5 py-1.5 text-[12px] leading-4 text-[#4b5565]">
                                {item.codeDecision.toneIgnoredNote}
                              </div>
                            )}
                            {item.codeDecision.injectionDetected && (
                              <div className="rounded-[6px] bg-[#dc2626]/[0.08] px-2.5 py-1.5 text-[12px] leading-4 text-[#dc2626]">
                                Prompt injection directive ignored
                                {item.codeDecision.injectionPenalized
                                  ? " (-15 trust penalty applied)"
                                  : " (verified safety hazard preserved)"}
                              </div>
                            )}
                          </dl>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : (
            /* Preview summary of recent activity when no trace yet in this session */
            <section className="rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff] p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-[14px] leading-5 font-medium text-[#111827]">
                    Triage pipeline ready
                  </h2>
                  <p className="mt-0.5 text-[13px] leading-5 text-[#4b5565]">
                    Submit a report above or test one of the sample scenarios to
                    inspect the triage breakdown and routing decision
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => switchSection("my")}
                    className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#111827]/[0.08] bg-[#f5f7fa] px-3 text-[13px] leading-5 text-[#111827] hover:bg-[#eceff4] transition-colors duration-150 ease-craft tabular-nums"
                  >
                    <span>My issues ({myIssues.length})</span>
                    <ArrowUpRight
                      className="h-4 w-4 text-[#6b7487]"
                      strokeWidth={1.5}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => switchSection("board")}
                    className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#111827]/[0.08] bg-[#f5f7fa] px-3 text-[13px] leading-5 text-[#111827] hover:bg-[#eceff4] transition-colors duration-150 ease-craft tabular-nums"
                  >
                    <span>Campus board ({issues.length})</span>
                    <ArrowUpRight
                      className="h-4 w-4 text-[#6b7487]"
                      strokeWidth={1.5}
                    />
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* SECTION 2: MY ISSUES */}
      {activeSection === "my" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[28px] leading-[1.15] font-medium tracking-tight text-[#111827]">
                My issues
              </h1>
              <p className="mt-1 text-[14px] leading-5 text-[#4b5565]">
                Tickets reported or joined by {activeUser.name}, including
                private confidential receipts and post-resolution verification
              </p>
            </div>
            <button
              type="button"
              onClick={() => switchSection("report")}
              className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-[#1d4ed8] px-4 text-[13px] leading-5 font-medium text-[#ffffff] hover:bg-[#1e40af] transition-colors duration-150 ease-craft"
            >
              <Send className="h-4 w-4" strokeWidth={1.5} />
              <span>New report</span>
            </button>
          </div>

          {myIssues.length === 0 ? (
            <div className="rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff] p-8 text-center">
              <p className="text-[14px] leading-5 text-[#4b5565]">
                No tickets reported or supported by {activeUser.name} yet
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => switchSection("report")}
                  className="inline-flex h-9 items-center rounded-[8px] bg-[#111827] px-4 text-[13px] leading-5 font-medium text-[#ffffff] hover:bg-[#1f2937] transition-colors duration-150 ease-craft"
                >
                  Submit a report
                </button>
                <button
                  type="button"
                  onClick={() => switchSection("board")}
                  className="inline-flex h-9 items-center rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] px-4 text-[13px] leading-5 font-normal text-[#4b5565] hover:bg-[#eceff4] transition-colors duration-150 ease-craft"
                >
                  Browse campus board
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {myIssues.map((issue) => renderIssueCard(issue, "my"))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: CAMPUS & TRENDING BOARD */}
      {activeSection === "board" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[28px] leading-[1.15] font-medium tracking-tight text-[#111827]">
                Campus board
              </h1>
              <p className="mt-1 text-[14px] leading-5 text-[#4b5565]">
                Public facility and safety tickets across 6 campus departments.
                Confirm existing tickets with Me too instead of filing
                duplicates
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={boardDeptFilter}
                onChange={(e) => setBoardDeptFilter(e.target.value)}
                aria-label="Filter by department"
                className="h-9 rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] px-3 text-[13px] leading-5 text-[#111827]"
              >
                <option value="ALL">All departments</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept} department
                  </option>
                ))}
              </select>

              <div className="inline-flex h-9 items-center rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] p-1">
                <button
                  type="button"
                  onClick={() => setBoardMode("trending")}
                  className={`h-7 rounded-[6px] px-3 text-[13px] leading-5 transition-colors duration-150 ease-craft tabular-nums ${
                    boardMode === "trending"
                      ? "bg-[#111827] text-[#ffffff] font-medium"
                      : "text-[#4b5565] hover:text-[#111827]"
                  }`}
                >
                  Trending ({trendingIssues.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBoardMode("all")}
                  className={`h-7 rounded-[6px] px-3 text-[13px] leading-5 transition-colors duration-150 ease-craft tabular-nums ${
                    boardMode === "all"
                      ? "bg-[#111827] text-[#ffffff] font-medium"
                      : "text-[#4b5565] hover:text-[#111827]"
                  }`}
                >
                  All public ({issues.length})
                </button>
              </div>
            </div>
          </div>

          {displayedBoardIssues.length === 0 ? (
            <div className="rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff] p-8 text-center text-[14px] leading-5 text-[#4b5565]">
              No public issues match the current filter. Confidential reports
              never appear on the public board
            </div>
          ) : (
            <div className="space-y-3">
              {displayedBoardIssues.map((issue) =>
                renderIssueCard(issue, "board")
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: TRUST LEDGER */}
      {activeSection === "trust" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-[28px] leading-[1.15] font-medium tracking-tight text-[#111827]">
              Trust ledger
            </h1>
            <p className="mt-1 text-[14px] leading-5 text-[#4b5565]">
              Deterministic reputation score and vote weight for{" "}
              {activeUser.name}. Confidential harassment reports never appear in
              or alter this ledger
            </p>
          </div>

          {/* 4 compact stat cards — pure numbers, no corner icons */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff] p-5">
              <div className="text-[12px] leading-4 text-[#6b7487]">
                Live trust score
              </div>
              <div className="mt-2 font-mono text-[32px] leading-none font-medium text-[#111827] tabular-nums">
                {activeUser.trustScore}
              </div>
              <div className="mt-2 text-[12px] leading-4 text-[#4b5565] tabular-nums">
                Scale 0 to 100 · baseline 60 (new: 35)
              </div>
            </div>

            <div className="rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff] p-5">
              <div className="text-[12px] leading-4 text-[#6b7487]">
                Crowd &amp; vote weight
              </div>
              <div className="mt-2 font-mono text-[32px] leading-none font-medium text-[#111827] tabular-nums">
                {trustMeta.weight}
              </div>
              <div className="mt-2 text-[12px] leading-4 text-[#4b5565]">
                Applied to Me too &amp; verification votes
              </div>
            </div>

            <div className="rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff] p-5">
              <div className="text-[12px] leading-4 text-[#6b7487]">
                Standing tier
              </div>
              <div className="mt-2 flex items-center gap-2 text-[24px] leading-none font-medium text-[#111827]">
                <span
                  className={`h-2 w-2 rounded-full ${trustMeta.dotColor}`}
                />
                <span>{trustMeta.tier}</span>
              </div>
              <div className="mt-2 text-[12px] leading-4 text-[#4b5565]">
                {activeUser.isNewAccount
                  ? "New account (<15m burst guard active)"
                  : "Established campus account"}
              </div>
            </div>

            <div className="rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff] p-5">
              <div className="text-[12px] leading-4 text-[#6b7487]">
                Recorded audit events
              </div>
              <div className="mt-2 font-mono text-[32px] leading-none font-medium text-[#111827] tabular-nums">
                {activeUser.trustHistory.length}
              </div>
              <div className="mt-2 text-[12px] leading-4 text-[#4b5565]">
                Verified fixes +4 · spam -20 · hijack -15
              </div>
            </div>
          </div>

          {/* Why Trust Score Is What It Is */}
          <div className="rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[15px] leading-[22px] font-medium text-[#111827]">
                Why {activeUser.name}&apos;s trust score is {activeUser.trustScore}
              </h2>
              <span className="font-mono text-[12px] leading-4 text-[#6b7487] tabular-nums">
                {trustMeta.tier} · {trustMeta.weight} weight
              </span>
            </div>
            <p className="mt-2 text-[13px] leading-5 text-[#111827]">
              {activeUser.trustExplanation ||
                "Trust score reflects starting account standing plus verified community outcomes and rule penalties."}
            </p>
            <p className="mt-2 text-[12px] leading-4 text-[#6b7487]">
              Scoring rules: Established baseline 60 (new accounts start at 35) · Verified report +6 · Accurate confirmation or dispute vote +4 · Overruled vote -3 · Rate-limit or confirmed brigade -10 · Prompt injection -15 · Dismissed fake/spam report -20.
            </p>
          </div>

          {/* Asymmetric 2/3 + 1/3 layout: Audit ledger table next to Weight tier reference */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 overflow-hidden rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff]">
              <div className="border-b border-[#111827]/[0.08] px-5 py-4">
                <h2 className="text-[15px] leading-[22px] font-medium text-[#111827]">
                  Audit event log
                </h2>
              </div>
              {activeUser.trustHistory.length === 0 ? (
                <div className="p-8 text-center text-[13px] leading-5 text-[#6b7487]">
                  No trust adjustments recorded yet for {activeUser.name}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px] leading-5">
                    <thead className="border-b border-[#111827]/[0.08] bg-[#f5f7fa] text-[12px] leading-4 font-normal text-[#6b7487]">
                      <tr>
                        <th className="px-5 py-3 font-normal">Timestamp</th>
                        <th className="px-5 py-3 font-normal">Reason</th>
                        <th className="px-5 py-3 font-normal">Ticket</th>
                        <th className="px-5 py-3 text-right font-normal">
                          Delta
                        </th>
                        <th className="px-5 py-3 text-right font-normal">
                          Score
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#111827]/[0.08]">
                      {activeUser.trustHistory.map((ev) => (
                        <tr
                          key={ev.id}
                          className="hover:bg-[#f5f7fa] transition-colors duration-150 ease-craft"
                        >
                          <td className="whitespace-nowrap px-5 py-3 font-mono text-[12px] text-[#6b7487] tabular-nums">
                            {formatTime(ev.timestamp)}
                          </td>
                          <td className="px-5 py-3 text-[#111827]">
                            {ev.reason}
                          </td>
                          <td className="px-5 py-3 font-mono text-[12px] text-[#4b5565]">
                            {ev.issueId ?? "—"}
                          </td>
                          <td
                            className={`whitespace-nowrap px-5 py-3 text-right font-mono font-medium tabular-nums ${
                              ev.delta > 0
                                ? "text-[#16a34a]"
                                : ev.delta < 0
                                ? "text-[#dc2626]"
                                : "text-[#4b5565]"
                            }`}
                          >
                            {ev.delta > 0 ? `+${ev.delta}` : ev.delta}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-right font-mono font-medium text-[#111827] tabular-nums">
                            {ev.newScore}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right 1/3: Deterministic weight schedule */}
            <div className="rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff] p-5">
              <h2 className="text-[15px] leading-[22px] font-medium text-[#111827]">
                Weight tier schedule
              </h2>
              <p className="mt-1 text-[13px] leading-5 text-[#4b5565]">
                Vote weight scales deterministically with trust score to prevent
                low-trust flooding
              </p>
              <div className="mt-4 space-y-2">
                {TRUST_TIERS.map((t) => {
                  const isCurrent =
                    activeUser.trustScore >= t.min &&
                    activeUser.trustScore <= t.max;
                  return (
                    <div
                      key={t.label}
                      className={`flex items-center justify-between rounded-[8px] border px-3 py-2.5 text-[13px] leading-5 tabular-nums ${
                        isCurrent
                          ? "border-[#1d4ed8] bg-[#1d4ed8]/[0.06] text-[#111827] font-medium"
                          : "border-[#111827]/[0.08] bg-[#f5f7fa] text-[#4b5565]"
                      }`}
                    >
                      <div>
                        <span className="text-[#111827]">{t.label}</span>
                        <span className="ml-2 font-mono text-[12px] text-[#6b7487]">
                          ({t.range})
                        </span>
                      </div>
                      <span className="font-mono text-[#111827]">
                        {t.weight}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: ROOM DIRECTORY */}
      {activeSection === "directory" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[28px] leading-[1.15] font-medium tracking-tight text-[#111827]">
                Room directory
              </h1>
              <p className="mt-1 text-[14px] leading-5 text-[#4b5565]">
                Canonical registry of {campusLocations.length} verified campus
                rooms across 6 owning departments. Reports naming unlisted room
                numbers trigger a clarification check
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7487]"
                strokeWidth={1.5}
              />
              <input
                type="text"
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                placeholder="Search room or department"
                className="h-9 w-full rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] pl-9 pr-3 text-[13px] leading-5 text-[#111827] placeholder:text-[#6b7487]"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {DEPARTMENTS.map((dept) => {
              const locs = filteredLocationsByDept[dept];
              return (
                <div
                  key={dept}
                  className="rounded-[12px] border border-[#111827]/[0.08] bg-[#ffffff] p-5"
                >
                  <div className="flex items-center justify-between border-b border-[#111827]/[0.08] pb-3">
                    <h2 className="text-[15px] leading-[22px] font-medium text-[#111827]">
                      {dept} department
                    </h2>
                    <span className="font-mono text-[12px] leading-4 text-[#6b7487] tabular-nums">
                      {locs.length} rooms
                    </span>
                  </div>

                  {locs.length === 0 ? (
                    <p className="py-4 text-[13px] leading-5 text-[#6b7487]">
                      No matching rooms
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {locs.map((loc) => (
                        <div
                          key={loc.id}
                          className="flex items-center justify-between gap-2 rounded-[8px] bg-[#f5f7fa] px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[12px] leading-4 text-[#6b7487]">
                                {formatRoomCode(loc.id, loc.name)}
                              </span>
                              <span className="truncate text-[13px] leading-5 font-medium text-[#111827]">
                                {loc.name}
                              </span>
                            </div>
                            <p className="truncate text-[12px] leading-4 text-[#6b7487]">
                              {loc.description}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setReportText((prev) =>
                                prev.trim()
                                  ? `${prev.trim()} (${loc.name})`
                                  : `Issue in ${loc.name}: `
                              );
                              switchSection("report");
                            }}
                            className="shrink-0 rounded-[6px] border border-[#111827]/[0.08] bg-[#ffffff] px-2.5 py-1 text-[12px] leading-4 font-medium text-[#111827] hover:border-[#1d4ed8] hover:text-[#1d4ed8] transition-colors duration-150 ease-craft"
                          >
                            Report
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
