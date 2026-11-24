"use client";

import React, { useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Send,
  MapPin,
  ChevronDown,
  AlertTriangle,
  Lock,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  Search,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  DEPARTMENTS,
  type CampusLocation,
  type Department,
  type Issue,
  type PendingClarification,
  type SubmitReportResponse,
  type User,
} from "@/lib/types";
import type { StudentNavId } from "@/components/AppSidebar";
import {
  TRUST_TIERS,
  formatCategoryName,
  formatClarificationStatus,
  formatOutcomeLabel,
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
  CRAFT_EASE,
  RevealPanel,
  SectionStage,
  StaggerCard,
} from "@/components/MotionPrimitives";
import { TrustTrajectoryChart } from "@/components/Charts";

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
    label: "Electrical spark",
    text: "Please check the socket near the wall in CR 20, there were faint sparks and a slight burning smell earlier.",
  },
  {
    label: "Caps-lock chair",
    text: "URGENT EMERGENCY!!! ONE CHAIR IN CR 32 HAS A LOOSE SCREW FIX IT NOW!!!",
  },
  {
    label: "Ragging + AC",
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
  const [rulesOpen, setRulesOpen] = useState(false);
  const [clarifySelections, setClarifySelections] = useState<
    Record<string, string>
  >({});
  const [voteComments, setVoteComments] = useState<Record<string, string>>({});

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const switchSection = (sec: StudentNavId) => {
    onSelectSection?.(sec);
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
      map[loc.ownerDepartment]?.push(loc);
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

  const previewIssues = useMemo(
    () => (trendingIssues.length > 0 ? trendingIssues : issues).slice(0, 3),
    [trendingIssues, issues]
  );

  const isBusy = busyAction !== null;

  const submitCurrentReport = async () => {
    if (!reportText.trim() || isBusy) return;
    await onSubmitReport(reportText);
    setReportText("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitCurrentReport();
  };

  const renderIssueCard = (
    issue: Issue,
    mode: "my" | "board",
    index: number
  ) => {
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
      <StaggerCard key={issue.id} index={index}>
        <article
          className={`surface-card rounded-[12px] p-5 transition-colors duration-150 ease-craft hover:border-[#171717]/[0.14] ${
            issue.priority === "CRITICAL" ? "border-[#dc2626]/30" : ""
          }`}
        >
          <div className="flex items-start gap-4">
            {/* Signature priority plaque — fixed aligned column */}
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
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] leading-[22px] font-medium text-[#171717]">
                    {issue.cleanSummary}
                  </h3>

                  {/* Clean aligned metadata row — no pill clutter */}
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

                    <span>
                      {issue.department === "CONFIDENTIAL_VAULT"
                        ? "Safety vault"
                        : issue.department}
                    </span>

                    {issue.isConfidential && (
                      <span className="inline-flex items-center gap-1 text-[#171717] font-medium">
                        <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
                        <span>Private</span>
                      </span>
                    )}

                    {issue.reopenCount > 0 && (
                      <span className="font-mono text-[#dc2626] tabular-nums">
                        Reopened {issue.reopenCount}x
                      </span>
                    )}
                  </div>
                </div>

                {/* Right action */}
                <div className="flex shrink-0 items-center gap-2">
                  {mode === "board" && !issue.isConfidential ? (
                    <button
                      type="button"
                      disabled={isBusy || isTerminal || !!issue.userHasJoined}
                      onClick={() => onJoinIssue(issue.id)}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-[8px] border px-3 text-[13px] leading-5 font-medium tabular-nums press-tactile ${
                        issue.userHasJoined
                          ? "border-[#15803d]/25 bg-[#15803d]/[0.08] text-[#15803d]"
                          : isTerminal
                          ? "border-[#171717]/[0.07] bg-[#f3f3f2] text-[#737373] cursor-not-allowed"
                          : "border-[#171717]/[0.1] bg-[#ffffff] text-[#171717] hover:bg-[#f3f3f2]"
                      }`}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span>
                        {issue.userHasJoined ? "Joined" : "Me too"}
                      </span>
                      <span className="font-mono text-[12px] opacity-80">
                        {issue.meTooCount}
                      </span>
                    </button>
                  ) : (
                    <span className="font-mono text-[12px] text-[#737373] tabular-nums">
                      {formatTime(issue.updatedAt)}
                    </span>
                  )}
                </div>
              </div>

              <p className="mt-2 text-[13px] leading-5 text-[#525252]">
                {stripTrailingPeriod(issue.oneLineReason)}
              </p>

              {/* Resolution Verification Meter */}
              {(isResolved ||
                vp.confirmWeight > 0 ||
                vp.disputeWeight > 0 ||
                vp.heldBrigadeCount > 0) && (
                <div className="mt-4 rounded-[10px] border border-[#171717]/[0.07] bg-[#fafafa] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] leading-4">
                    <span className="font-medium text-[#171717]">
                      Verification
                    </span>
                    <div className="flex flex-wrap items-center gap-3 font-mono text-[#737373] tabular-nums">
                      <span>
                        Confirm {vp.confirmWeight.toFixed(2)}
                      </span>
                      <span>
                        Dispute {vp.disputeWeight.toFixed(2)} /{" "}
                        {vp.reopenThreshold.toFixed(2)}
                      </span>
                      <span>{vp.eligibleCount} voters</span>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="mb-1 flex justify-between text-[12px] leading-4 text-[#525252]">
                        <span>Confirmed</span>
                        <span className="font-mono tabular-nums">
                          {Math.round(confirmRatio * 100)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e7e7e5]">
                        <div
                          className="h-full w-full origin-left rounded-full bg-[#15803d] transition-transform duration-300 ease-craft"
                          style={{ transform: `scaleX(${confirmRatio})` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-[12px] leading-4 text-[#525252]">
                        <span>Disputed</span>
                        <span className="font-mono tabular-nums">
                          {Math.round(disputeRatio * 100)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e7e7e5]">
                        <div
                          className="h-full w-full origin-left rounded-full bg-[#dc2626] transition-transform duration-300 ease-craft"
                          style={{ transform: `scaleX(${disputeRatio})` }}
                        />
                      </div>
                    </div>
                  </div>

                  {vp.heldBrigadeCount > 0 && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-[6px] border border-[#b45309]/25 bg-[#ffffff] px-2.5 py-1 text-[12px] leading-4 text-[#b45309] tabular-nums">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#b45309]" />
                      <span>{vp.heldBrigadeCount} held for brigade review</span>
                    </div>
                  )}

                  {isResolved && vp.userCanVote && (
                    <div className="mt-3 flex flex-col gap-2 border-t border-[#171717]/[0.07] pt-3 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        value={voteComments[issue.id] ?? ""}
                        onChange={(e) =>
                          setVoteComments((prev) => ({
                            ...prev,
                            [issue.id]: e.target.value,
                          }))
                        }
                        placeholder="Add note (optional)"
                        className="h-8 flex-1 rounded-[8px] border border-[#171717]/[0.09] bg-[#ffffff] px-3 text-[13px] leading-5 text-[#171717] placeholder:text-[#737373]"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            onVoteIssue(
                              issue.id,
                              "CONFIRM",
                              voteComments[issue.id]
                            )
                          }
                          className={`inline-flex h-8 items-center gap-1.5 rounded-[8px] border px-3 text-[13px] leading-5 font-medium press-tactile ${
                            vp.userCurrentVote === "CONFIRM"
                              ? "border-[#15803d] bg-[#15803d] text-[#ffffff]"
                              : "border-[#171717]/[0.1] bg-[#ffffff] text-[#171717] hover:bg-[#f3f3f2]"
                          } disabled:opacity-50`}
                        >
                          <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
                          <span>Confirm fix</span>
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            onVoteIssue(
                              issue.id,
                              "DISPUTE",
                              voteComments[issue.id]
                            )
                          }
                          className={`inline-flex h-8 items-center gap-1.5 rounded-[8px] border px-3 text-[13px] leading-5 font-medium press-tactile ${
                            vp.userCurrentVote === "DISPUTE"
                              ? "border-[#dc2626] bg-[#dc2626] text-[#ffffff]"
                              : "border-[#171717]/[0.1] bg-[#ffffff] text-[#dc2626] hover:bg-[#dc2626]/[0.06]"
                          } disabled:opacity-50`}
                        >
                          <XCircle className="h-4 w-4" strokeWidth={1.5} />
                          <span>Dispute</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {isResolved && !vp.userCanVote && (
                    <p className="mt-2.5 text-[12px] leading-4 text-[#737373]">
                      Only reporters and prior supporters can vote
                    </p>
                  )}
                </div>
              )}

              {/* Subtle footer metadata */}
              {mode === "board" && (
                <div className="mt-3 flex items-center justify-between text-[11px] leading-4 text-[#737373] font-mono tabular-nums">
                  <span>{issue.id}</span>
                  <span>{formatTime(issue.updatedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </article>
      </StaggerCard>
    );
  };

  return (
    <SectionStage stageKey={`student-${activeUser.id}-${activeSection}`}>
      {/* SECTION 1: REPORT */}
      {activeSection === "report" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[28px] leading-[1.15] font-medium tracking-[-0.02em] text-[#171717]">
                Report an issue
              </h1>
              <p className="mt-1 text-[14px] leading-5 text-[#525252]">
                Facility, medical, or safety issues and confidential harassment/bullying reports · unrelated personal complaints are not accepted
              </p>
            </div>

            <button
              type="button"
              onClick={() => setInlineDirectoryOpen((v) => !v)}
              className={`inline-flex h-9 items-center gap-2 rounded-[8px] border px-3 text-[13px] leading-5 font-medium press-tactile ${
                inlineDirectoryOpen
                  ? "border-[#0f766e]/40 bg-[#0f766e]/[0.07] text-[#0f766e]"
                  : "border-[#171717]/[0.09] bg-[#ffffff] text-[#525252] hover:bg-[#f3f3f2] hover:text-[#171717]"
              }`}
            >
              <MapPin className="h-4 w-4" strokeWidth={1.5} />
              <span className="tabular-nums">
                Rooms ({campusLocations.length})
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-150 ease-craft ${
                  inlineDirectoryOpen ? "rotate-180" : ""
                }`}
                strokeWidth={1.5}
              />
            </button>
          </div>

          {/* Composer Card */}
          <section className="surface-card rounded-[14px] p-6">
            <RevealPanel open={inlineDirectoryOpen} className="mb-5">
              <div className="rounded-[10px] border border-[#171717]/[0.07] bg-[#fafafa] p-4">
                <div className="mb-3 flex items-center justify-between text-[12px] text-[#737373]">
                  <span className="font-medium text-[#171717]">
                    Pick a room to insert
                  </span>
                  <span className="font-mono tabular-nums">
                    {campusLocations.length} locations
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {DEPARTMENTS.map((dept) => (
                    <div
                      key={dept}
                      className="rounded-[8px] border border-[#171717]/[0.07] bg-[#ffffff] p-3"
                    >
                      <div className="mb-2 text-[12px] font-medium text-[#171717]">
                        {dept}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {locationsByDept[dept].map((loc) => (
                          <button
                            key={loc.id}
                            type="button"
                            title={loc.description}
                            onClick={() => {
                              setReportText((prev) =>
                                prev.trim()
                                  ? `${prev.trim()} (${loc.name})`
                                  : `Issue in ${loc.name}: `
                              );
                              textareaRef.current?.focus();
                            }}
                            className="rounded-[5px] border border-[#171717]/[0.08] bg-[#fafafa] px-2 py-1 text-[12px] leading-4 text-[#525252] hover:border-[#0f766e]/50 hover:text-[#171717] press-tactile"
                          >
                            {loc.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </RevealPanel>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <textarea
                  ref={textareaRef}
                  id="issue-report-input"
                  rows={3}
                  maxLength={2000}
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      e.preventDefault();
                      void submitCurrentReport();
                    }
                  }}
                  placeholder="Describe the issue and room (e.g. Library Main Room AC not cooling)"
                  className="w-full resize-none rounded-[10px] border border-[#171717]/[0.1] bg-[#fafafa] p-3.5 text-[14px] leading-6 text-[#171717] placeholder:text-[#737373] focus:border-[#0f766e]/60 focus:bg-[#ffffff] focus:outline-none transition-colors duration-150 ease-craft"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[12px] text-[#737373]">
                  Samples
                </span>
                {PRESET_PROMPTS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setReportText(preset.text);
                      textareaRef.current?.focus();
                    }}
                    className="h-7 rounded-[6px] border border-[#171717]/[0.08] bg-[#fafafa] px-2.5 text-[12px] leading-4 text-[#525252] hover:border-[#171717]/[0.16] hover:bg-[#efefed] hover:text-[#171717] press-tactile"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#171717]/[0.07] pt-4">
                <div className="flex items-center gap-2 text-[13px] leading-5 text-[#525252] tabular-nums">
                  <span
                    className={`h-2 w-2 rounded-full ${trustMeta.dotColor}`}
                  />
                  <span className="font-medium text-[#171717]">
                    {activeUser.name}
                  </span>
                  <span className="text-[#737373]">·</span>
                  <span className="font-mono text-[12px] text-[#525252]">
                    {activeUser.trustScore} ({trustMeta.weight})
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="hidden items-center gap-1 text-[11px] text-[#737373] sm:inline-flex">
                    <kbd className="kbd-cap">⌘</kbd>
                    <kbd className="kbd-cap">↵</kbd>
                  </span>
                  <button
                    type="submit"
                    disabled={isBusy || !reportText.trim()}
                    className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-[#171717] px-4 text-[13px] leading-5 font-medium text-[#ffffff] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-40 press-tactile"
                  >
                    <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>
                      {busyAction === "submit-report"
                        ? "Triaging"
                        : "Submit report"}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </section>

          {/* Pending Clarifications */}
          {pendingClarifications.length > 0 && (
            <section className="surface-card space-y-3 rounded-[14px] border-[#b45309]/30 p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#b45309]" />
                  <h2 className="text-[15px] leading-5 font-medium text-[#171717] tabular-nums">
                    Confirm room ({pendingClarifications.length})
                  </h2>
                </div>
                <span className="text-[12px] text-[#737373]">
                  Select the exact location to finish routing
                </span>
              </div>

              <div className="space-y-3 pt-1">
                {pendingClarifications.map((clr) => {
                  const selectedLocId =
                    clarifySelections[clr.id] ??
                    clr.suggestedLocations[0]?.id ??
                    campusLocations[0]?.id ??
                    "";

                  return (
                    <div
                      key={clr.id}
                      className="rounded-[10px] border border-[#171717]/[0.07] bg-[#fafafa] p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-[12px] leading-4">
                        <span className="rounded-[5px] bg-[#efefed] px-2 py-0.5 font-medium text-[#171717]">
                          {formatClarificationStatus(clr.status)}
                        </span>
                        {clr.extractedMention && (
                          <span className="font-mono text-[#525252]">
                            &quot;{clr.extractedMention}&quot;
                          </span>
                        )}
                        {clr.isVerifiedSafetyHazard && (
                          <span className="inline-flex items-center gap-1 rounded-[5px] bg-[#dc2626]/[0.08] px-2 py-0.5 font-medium text-[#dc2626]">
                            <AlertTriangle
                              className="h-3.5 w-3.5"
                              strokeWidth={1.5}
                            />
                            <span>Safety preserved</span>
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-[14px] leading-5 font-medium text-[#171717]">
                        {clr.cleanSummary}
                      </p>
                      <p className="mt-0.5 text-[13px] leading-5 text-[#525252]">
                        {stripTrailingPeriod(clr.reason)}
                      </p>

                      {clr.suggestedLocations.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {clr.suggestedLocations.map((loc) => (
                            <button
                              key={loc.id}
                              type="button"
                              disabled={isBusy}
                              onClick={() => onClarify(clr.id, loc.id)}
                              className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#171717]/[0.1] bg-[#ffffff] px-3 text-[13px] leading-5 font-medium text-[#171717] hover:border-[#0f766e] hover:text-[#0f766e] disabled:opacity-50 press-tactile"
                            >
                              <MapPin
                                className="h-3.5 w-3.5 text-[#737373]"
                                strokeWidth={1.5}
                              />
                              <span>
                                {loc.name} · {loc.ownerDepartment}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#171717]/[0.07] pt-3">
                        <select
                          value={selectedLocId}
                          onChange={(e) =>
                            setClarifySelections((prev) => ({
                              ...prev,
                              [clr.id]: e.target.value,
                            }))
                          }
                          className="h-9 min-w-[220px] flex-1 rounded-[8px] border border-[#171717]/[0.1] bg-[#ffffff] px-3 text-[13px] leading-5 text-[#171717]"
                        >
                          {DEPARTMENTS.map((dept) => (
                            <optgroup key={dept} label={dept}>
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
                          className="h-9 rounded-[8px] bg-[#171717] px-4 text-[13px] leading-5 font-medium text-[#ffffff] hover:bg-[#262626] disabled:opacity-50 press-tactile"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Latest Triage Trace OR Live Campus Preview (eliminates dead space) */}
          {lastSubmission ? (
            <section className="surface-card rounded-[14px] p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[15px] leading-5 font-medium text-[#171717] tabular-nums">
                  Triage result ({lastSubmission.items.length})
                </h2>
                {lastSubmission.message && (
                  <span className="text-[13px] leading-5 text-[#525252]">
                    {stripTrailingPeriod(lastSubmission.message)}
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {lastSubmission.items.map((item) => {
                  const isRejectedOutcome =
                    item.outcome === "REJECTED_NO_ISSUE" ||
                    item.outcome === "REJECTED_INJECTION";
                  const priorityDisplay = item.codeDecision.priority
                    ? `${item.codeDecision.priorityScore ?? "-"} · ${formatPriorityLabel(
                        item.codeDecision.priority
                      )}`
                    : isRejectedOutcome
                    ? "Rejected"
                    : "Pending room";

                  return (
                    <div
                      key={item.itemIndex}
                      className="rounded-[10px] border border-[#171717]/[0.07] bg-[#fafafa] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="rounded-[6px] bg-[#171717] px-2 py-0.5 font-mono text-[11px] leading-4 font-medium text-[#ffffff]">
                            {formatOutcomeLabel(item.outcome)}
                          </span>
                          <span className="text-[14px] leading-5 font-medium text-[#171717]">
                            {item.cleanSummary}
                          </span>
                        </div>
                        {item.codeDecision.trustDelta !== 0 && (
                          <span
                            className={`font-mono text-[12px] font-medium tabular-nums ${
                              item.codeDecision.trustDelta > 0
                                ? "text-[#15803d]"
                                : "text-[#dc2626]"
                            }`}
                          >
                            Trust {item.codeDecision.trustDelta > 0 ? "+" : ""}
                            {item.codeDecision.trustDelta}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="rounded-[8px] border border-[#171717]/[0.07] bg-[#ffffff] p-4 text-[13px] leading-5">
                          <div className="mb-2.5 flex items-center justify-between">
                            <span className="font-medium text-[#171717]">
                              Extracted
                            </span>
                            <span className="font-mono text-[11px] text-[#737373]">
                              {item.aiExtracted.usedFallback
                                ? "Fallback"
                                : "Gemini"}
                            </span>
                          </div>
                          <dl className="space-y-1.5">
                            <div className="flex justify-between gap-2">
                              <dt className="text-[#737373]">Category</dt>
                              <dd className="font-mono text-[#171717]">
                                {formatCategoryName(item.aiExtracted.category)}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-[#737373]">Impact</dt>
                              <dd className="font-mono text-[#171717]">
                                {formatCategoryName(
                                  item.aiExtracted.factualImpact
                                )}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-[#737373]">Location</dt>
                              <dd className="font-mono text-[#171717]">
                                {item.aiExtracted.rawLocationMention || "None"}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-[#737373]">Sensitivity</dt>
                              <dd className="text-right text-[#171717]">
                                {item.aiExtracted.isHarassmentOrRagging
                                  ? "Confidential"
                                  : item.aiExtracted.safetyClaimed
                                  ? "Safety hazard"
                                  : "Standard"}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div className="rounded-[8px] border border-[#171717]/[0.07] bg-[#ffffff] p-4 text-[13px] leading-5">
                          <div className="mb-2.5 flex items-center justify-between">
                            <span className="font-medium text-[#171717]">
                              Routing decision
                            </span>
                            {item.codeDecision.safetyVerified && (
                              <span className="font-mono text-[11px] font-medium text-[#dc2626]">
                                Safety verified
                              </span>
                            )}
                          </div>
                          <dl className="space-y-1.5">
                            <div className="flex justify-between gap-2">
                              <dt className="text-[#737373]">Route</dt>
                              <dd className="font-medium text-[#171717]">
                                {item.codeDecision.locationName
                                  ? `${item.codeDecision.locationName} → ${item.codeDecision.department}`
                                  : isRejectedOutcome
                                  ? "Not routed (rejected)"
                                  : "Needs confirmation"}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-[#737373]">Priority</dt>
                              <dd className="font-mono font-medium text-[#171717] tabular-nums">
                                {priorityDisplay}
                              </dd>
                            </div>
                            {item.codeDecision.oneLineReason && (
                              <div className="flex justify-between gap-2">
                                <dt className="text-[#737373]">Reason</dt>
                                <dd className="text-right text-[#525252]">
                                  {stripTrailingPeriod(
                                    item.codeDecision.oneLineReason
                                  )}
                                </dd>
                              </div>
                            )}
                            {item.codeDecision.toneIgnoredNote && (
                              <div className="mt-1 rounded-[6px] bg-[#fafafa] px-2.5 py-1.5 text-[12px] text-[#525252]">
                                {stripTrailingPeriod(
                                  item.codeDecision.toneIgnoredNote
                                )}
                              </div>
                            )}
                            {item.codeDecision.injectionDetected && (
                              <div className="mt-1 rounded-[6px] bg-[#dc2626]/[0.08] px-2.5 py-1.5 text-[12px] text-[#dc2626]">
                                Injected directive ignored
                                {item.codeDecision.injectionPenalized
                                  ? " (-15 trust)"
                                  : " · safety preserved"}
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
            previewIssues.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-[14px] leading-5 font-medium text-[#171717]">
                    Active on campus
                  </h2>
                  <button
                    type="button"
                    onClick={() => switchSection("board")}
                    className="inline-flex items-center gap-1 text-[13px] text-[#525252] hover:text-[#171717] transition-colors"
                  >
                    <span>All tickets ({issues.length})</span>
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {previewIssues.map((issue, idx) =>
                    renderIssueCard(issue, "board", idx)
                  )}
                </div>
              </section>
            )
          )}
        </div>
      )}

      {/* SECTION 2: MY ISSUES */}
      {activeSection === "my" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[28px] leading-[1.15] font-medium tracking-[-0.02em] text-[#171717]">
                My issues
              </h1>
              <p className="mt-1 text-[14px] leading-5 text-[#525252]">
                Reported or joined by {activeUser.name}
              </p>
            </div>
            <button
              type="button"
              onClick={() => switchSection("report")}
              className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-[#171717] px-4 text-[13px] leading-5 font-medium text-[#ffffff] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-[#262626] press-tactile"
            >
              <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>New report</span>
            </button>
          </div>

          {myIssues.length === 0 ? (
            <div className="surface-card rounded-[14px] p-10 text-center">
              <p className="text-[14px] leading-5 text-[#525252]">
                No issues yet for {activeUser.name}
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => switchSection("report")}
                  className="inline-flex h-9 items-center rounded-[8px] bg-[#171717] px-4 text-[13px] font-medium text-[#ffffff] hover:bg-[#262626] press-tactile"
                >
                  Report an issue
                </button>
                <button
                  type="button"
                  onClick={() => switchSection("board")}
                  className="inline-flex h-9 items-center rounded-[8px] border border-[#171717]/[0.1] bg-[#ffffff] px-4 text-[13px] text-[#525252] hover:bg-[#f3f3f2] press-tactile"
                >
                  Campus board
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {myIssues.map((issue, idx) => renderIssueCard(issue, "my", idx))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: CAMPUS BOARD */}
      {activeSection === "board" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[28px] leading-[1.15] font-medium tracking-[-0.02em] text-[#171717]">
                Campus board
              </h1>
              <p className="mt-1 text-[14px] leading-5 text-[#525252]">
                Join open issues instead of filing duplicates
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={boardDeptFilter}
                onChange={(e) => setBoardDeptFilter(e.target.value)}
                aria-label="Filter by department"
                className="h-9 rounded-[8px] border border-[#171717]/[0.1] bg-[#ffffff] px-3 text-[13px] leading-5 text-[#171717]"
              >
                <option value="ALL">All departments</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              <div className="inline-flex h-9 items-center rounded-[8px] border border-[#171717]/[0.08] bg-[#efefed] p-0.5">
                {(
                  [
                    {
                      id: "trending",
                      label: `Trending (${trendingIssues.length})`,
                    },
                    { id: "all", label: `All (${issues.length})` },
                  ] as const
                ).map((tab) => {
                  const selected = boardMode === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setBoardMode(tab.id)}
                      className={`relative h-8 rounded-[6px] px-3 text-[13px] leading-5 tabular-nums transition-colors duration-150 ${
                        selected
                          ? "text-[#171717] font-medium"
                          : "text-[#525252] hover:text-[#171717]"
                      }`}
                    >
                      {selected && (
                        <motion.span
                          layoutId="board-mode-pill"
                          transition={{ duration: 0.2, ease: CRAFT_EASE }}
                          className="absolute inset-0 rounded-[6px] bg-[#ffffff] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                        />
                      )}
                      <span className="relative z-10">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {displayedBoardIssues.length === 0 ? (
            <div className="surface-card rounded-[14px] p-10 text-center text-[14px] leading-5 text-[#525252]">
              No public tickets match this filter
            </div>
          ) : (
            <div className="space-y-3">
              {displayedBoardIssues.map((issue, idx) =>
                renderIssueCard(issue, "board", idx)
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: TRUST LEDGER */}
      {activeSection === "trust" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[28px] leading-[1.15] font-medium tracking-[-0.02em] text-[#171717]">
                Trust ledger
              </h1>
              <p className="mt-1 text-[14px] leading-5 text-[#525252]">
                Standing and vote weight for {activeUser.name}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setRulesOpen((v) => !v)}
              className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#171717]/[0.09] bg-[#ffffff] px-3 text-[12px] font-medium text-[#525252] hover:bg-[#f3f3f2] hover:text-[#171717] press-tactile"
            >
              <Info className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Scoring rules</span>
            </button>
          </div>

          <RevealPanel open={rulesOpen}>
            <div className="surface-card grid gap-3 rounded-[12px] p-4 text-[12px] sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: "Baseline", val: "60 (new 35)", tone: "text-[#171717]" },
                { label: "Verified report", val: "+6", tone: "text-[#15803d]" },
                { label: "Accurate vote", val: "+4", tone: "text-[#15803d]" },
                { label: "Overruled vote", val: "-3", tone: "text-[#b45309]" },
                { label: "Brigade / flood", val: "-10", tone: "text-[#dc2626]" },
                { label: "Inject / spam", val: "-15 / -20", tone: "text-[#dc2626]" },
              ].map((r) => (
                <div key={r.label} className="rounded-[8px] bg-[#fafafa] px-3 py-2">
                  <div className="text-[#737373]">{r.label}</div>
                  <div className={`mt-0.5 font-mono font-medium ${r.tone}`}>
                    {r.val}
                  </div>
                </div>
              ))}
            </div>
          </RevealPanel>

          {/* 4 Compact Stat Cards — numbers only */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="surface-card rounded-[12px] p-5">
              <div className="text-[12px] leading-4 text-[#737373]">
                Trust score
              </div>
              <div className="mt-2 font-mono text-[30px] leading-none font-medium text-[#171717]">
                <AnimatedNumber value={activeUser.trustScore} />
                <span className="ml-1 text-[14px] font-normal text-[#737373]">
                  / 100
                </span>
              </div>
            </div>

            <div className="surface-card rounded-[12px] p-5">
              <div className="text-[12px] leading-4 text-[#737373]">
                Vote weight
              </div>
              <div className="mt-2 font-mono text-[30px] leading-none font-medium text-[#0f766e] tabular-nums">
                {trustMeta.weight}
              </div>
            </div>

            <div className="surface-card rounded-[12px] p-5">
              <div className="text-[12px] leading-4 text-[#737373]">
                Standing
              </div>
              <div className="mt-2 flex items-center gap-2 text-[22px] leading-none font-medium text-[#171717]">
                <span
                  className={`h-2 w-2 rounded-full ${trustMeta.dotColor}`}
                />
                <span>{trustMeta.tier}</span>
              </div>
            </div>

            <div className="surface-card rounded-[12px] p-5">
              <div className="text-[12px] leading-4 text-[#737373]">
                Audit events
              </div>
              <div className="mt-2 font-mono text-[30px] leading-none font-medium text-[#171717]">
                <AnimatedNumber value={activeUser.trustHistory.length} />
              </div>
            </div>
          </div>

          {/* Asymmetric 2/3 Chart + 1/3 Tier Ladder */}
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="surface-card lg:col-span-2 rounded-[14px] p-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[15px] leading-5 font-medium text-[#171717]">
                  Score trajectory
                </h2>
                <span className="font-mono text-[11px] text-[#737373]">
                  Baseline 60
                </span>
              </div>
              <TrustTrajectoryChart
                history={activeUser.trustHistory}
                currentScore={activeUser.trustScore}
              />
            </div>

            <div className="surface-card rounded-[14px] p-5">
              <h2 className="text-[15px] leading-5 font-medium text-[#171717]">
                Weight tiers
              </h2>
              <div className="mt-4 space-y-1.5">
                {TRUST_TIERS.map((t) => {
                  const isCurrent =
                    activeUser.trustScore >= t.min &&
                    activeUser.trustScore <= t.max;
                  return (
                    <div
                      key={t.label}
                      className={`flex items-center justify-between rounded-[8px] border px-3 py-2 text-[13px] leading-5 tabular-nums ${
                        isCurrent
                          ? "border-[#0f766e]/40 bg-[#0f766e]/[0.07] font-medium text-[#171717]"
                          : "border-transparent bg-[#fafafa] text-[#525252]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{t.label}</span>
                        <span className="font-mono text-[11px] text-[#737373]">
                          {t.range}
                        </span>
                      </div>
                      <span
                        className={`font-mono ${
                          isCurrent ? "text-[#0f766e]" : "text-[#171717]"
                        }`}
                      >
                        {t.weight}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Audit Event Log Table */}
          <div className="surface-card overflow-hidden rounded-[14px]">
            <div className="border-b border-[#171717]/[0.07] px-5 py-3.5">
              <h2 className="text-[15px] leading-5 font-medium text-[#171717]">
                History
              </h2>
            </div>
            {activeUser.trustHistory.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-[#737373]">
                No events recorded yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px] leading-5">
                  <thead className="border-b border-[#171717]/[0.07] bg-[#fafafa] text-[12px] text-[#737373]">
                    <tr>
                      <th className="px-5 py-2.5 font-normal">Date</th>
                      <th className="px-5 py-2.5 font-normal">Event</th>
                      <th className="px-5 py-2.5 font-normal">Ticket</th>
                      <th className="px-5 py-2.5 text-right font-normal">
                        Delta
                      </th>
                      <th className="px-5 py-2.5 text-right font-normal">
                        Score
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#171717]/[0.06]">
                    {activeUser.trustHistory.map((ev) => (
                      <tr
                        key={ev.id}
                        className="hover:bg-[#fafafa] transition-colors duration-150"
                      >
                        <td className="whitespace-nowrap px-5 py-3 font-mono text-[12px] text-[#737373] tabular-nums">
                          {formatTime(ev.timestamp)}
                        </td>
                        <td className="px-5 py-3 text-[#171717]">
                          {ev.reason}
                        </td>
                        <td className="px-5 py-3 font-mono text-[12px] text-[#525252]">
                          {ev.issueId ?? "—"}
                        </td>
                        <td
                          className={`whitespace-nowrap px-5 py-3 text-right font-mono font-medium tabular-nums ${
                            ev.delta > 0
                              ? "text-[#15803d]"
                              : ev.delta < 0
                              ? "text-[#dc2626]"
                              : "text-[#737373]"
                          }`}
                        >
                          {ev.delta > 0 ? `+${ev.delta}` : ev.delta}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-right font-mono font-medium text-[#171717] tabular-nums">
                          {ev.newScore}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 5: ROOM DIRECTORY */}
      {activeSection === "directory" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[28px] leading-[1.15] font-medium tracking-[-0.02em] text-[#171717]">
                Rooms
              </h1>
              <p className="mt-1 text-[14px] leading-5 text-[#525252] tabular-nums">
                {campusLocations.length} verified campus locations
              </p>
            </div>

            <div className="relative w-full sm:w-60">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#737373]"
                strokeWidth={1.5}
              />
              <input
                type="text"
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                placeholder="Search"
                className="h-9 w-full rounded-[8px] border border-[#171717]/[0.1] bg-[#ffffff] pl-9 pr-3 text-[13px] leading-5 text-[#171717] placeholder:text-[#737373]"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {DEPARTMENTS.map((dept, deptIdx) => {
              const locs = filteredLocationsByDept[dept];
              return (
                <StaggerCard key={dept} index={deptIdx}>
                  <div className="surface-card h-full rounded-[14px] p-5">
                    <div className="flex items-center justify-between border-b border-[#171717]/[0.07] pb-3">
                      <h2 className="text-[15px] leading-5 font-medium text-[#171717]">
                        {dept}
                      </h2>
                      <span className="font-mono text-[12px] text-[#737373] tabular-nums">
                        {locs.length}
                      </span>
                    </div>

                    {locs.length === 0 ? (
                      <p className="py-4 text-[13px] text-[#737373]">
                        No matches
                      </p>
                    ) : (
                      <div className="mt-3 space-y-1.5">
                        {locs.map((loc) => (
                          <div
                            key={loc.id}
                            className="group flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2 hover:bg-[#fafafa] transition-colors duration-150"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] text-[#737373]">
                                  {formatRoomCode(loc.id, loc.name)}
                                </span>
                                <span className="truncate text-[13px] leading-5 font-medium text-[#171717]">
                                  {loc.name}
                                </span>
                              </div>
                              <p className="truncate text-[12px] leading-4 text-[#737373]">
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
                              className="shrink-0 rounded-[6px] border border-[#171717]/[0.09] bg-[#ffffff] px-2.5 py-1 text-[12px] font-medium text-[#525252] hover:border-[#0f766e]/50 hover:text-[#0f766e] press-tactile"
                            >
                              Report
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </StaggerCard>
              );
            })}
          </div>
        </div>
      )}
    </SectionStage>
  );
}
