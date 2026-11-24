import type {
  IssueStatus,
  PendingClarification,
  PriorityLevel,
  SecurityAlert,
  TriageItemTrace,
} from "@/lib/types";

export interface TrustMeta {
  tier: string;
  weight: string;
  dotColor: string;
  textColor: string;
}

export const TRUST_TIERS = [
  { range: "80–100", label: "Trusted", weight: "1.00x", min: 80, max: 100 },
  { range: "60–79", label: "Standard", weight: "0.80x", min: 60, max: 79 },
  { range: "45–59", label: "Developing", weight: "0.55x", min: 45, max: 59 },
  { range: "25–44", label: "Low trust", weight: "0.35x", min: 25, max: 44 },
  { range: "0–24", label: "Restricted", weight: "0.15x", min: 0, max: 24 },
] as const;

export function getTrustMeta(score: number): TrustMeta {
  if (score >= 80) {
    return {
      tier: "Trusted",
      weight: "1.00x",
      dotColor: "bg-[#15803d]",
      textColor: "text-[#15803d]",
    };
  }
  if (score >= 60) {
    return {
      tier: "Standard",
      weight: "0.80x",
      dotColor: "bg-[#0f766e]",
      textColor: "text-[#0f766e]",
    };
  }
  if (score >= 45) {
    return {
      tier: "Developing",
      weight: "0.55x",
      dotColor: "bg-[#b45309]",
      textColor: "text-[#b45309]",
    };
  }
  if (score >= 25) {
    return {
      tier: "Low trust",
      weight: "0.35x",
      dotColor: "bg-[#c2410c]",
      textColor: "text-[#c2410c]",
    };
  }
  return {
    tier: "Restricted",
    weight: "0.15x",
    dotColor: "bg-[#dc2626]",
    textColor: "text-[#dc2626]",
  };
}

export function formatPriorityLabel(priority: PriorityLevel): string {
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

export function priorityDotColor(priority: PriorityLevel): string {
  switch (priority) {
    case "CRITICAL":
      return "bg-[#dc2626]";
    case "HIGH":
      return "bg-[#b45309]";
    case "MEDIUM":
      return "bg-[#0f766e]";
    case "LOW":
    default:
      return "bg-[#737373]";
  }
}

export function priorityScoreStyle(priority: PriorityLevel): string {
  switch (priority) {
    case "CRITICAL":
      return "bg-[#dc2626]/[0.08] text-[#dc2626] border-[#dc2626]/20";
    case "HIGH":
      return "bg-[#b45309]/[0.08] text-[#92400e] border-[#b45309]/20";
    case "MEDIUM":
      return "bg-[#0f766e]/[0.08] text-[#0f766e] border-[#0f766e]/20";
    case "LOW":
    default:
      return "bg-[#efefed] text-[#525252] border-[#171717]/[0.08]";
  }
}

export function formatStatusLabel(status: IssueStatus): string {
  switch (status) {
    case "OPEN":
      return "Open";
    case "IN_PROGRESS":
      return "In progress";
    case "RESOLVED":
      return "Awaiting votes";
    case "REOPENED":
      return "Reopened";
    case "VERIFIED_RESOLVED":
      return "Verified";
    case "DISMISSED_SPAM":
      return "Dismissed";
  }
}

export function statusDotColor(status: IssueStatus): string {
  switch (status) {
    case "OPEN":
      return "bg-[#737373]";
    case "IN_PROGRESS":
      return "bg-[#0f766e]";
    case "RESOLVED":
      return "bg-[#b45309]";
    case "REOPENED":
      return "bg-[#dc2626]";
    case "VERIFIED_RESOLVED":
      return "bg-[#15803d]";
    case "DISMISSED_SPAM":
      return "bg-[#a3a3a3]";
  }
}

export function formatOutcomeLabel(outcome: TriageItemTrace["outcome"]): string {
  switch (outcome) {
    case "CREATED":
      return "Created";
    case "MERGED_ME_TOO":
      return "Merged";
    case "DISPUTED_RESOLVED":
      return "Disputed";
    case "CONFIDENTIAL_CREATED":
      return "Vaulted";
    case "NEEDS_CLARIFICATION":
      return "Needs room";
    case "HELD_BRIGADE":
      return "Held for review";
    case "REJECTED_NO_ISSUE":
      return "No issue";
    case "REJECTED_INJECTION":
      return "Blocked";
  }
}

export function formatClarificationStatus(
  status: PendingClarification["status"]
): string {
  switch (status) {
    case "AMBIGUOUS":
      return "Ambiguous room";
    case "NONEXISTENT":
      return "Unlisted room";
    case "MISSING":
      return "Missing room";
  }
}

export function formatAlertType(type: SecurityAlert["type"]): string {
  switch (type) {
    case "PROMPT_INJECTION":
      return "Prompt injection";
    case "BRIGADING_SUSPECTED":
      return "Brigade burst";
    case "SPAM_FLOOD":
      return "Spam flood";
    case "SAFETY_UNROUTED":
      return "Unrouted safety";
  }
}

export function formatAlertStatus(status: SecurityAlert["status"]): string {
  switch (status) {
    case "OPEN":
      return "Open";
    case "CONFIRMED":
      return "Confirmed";
    case "DISMISSED":
      return "Dismissed";
  }
}

export function formatCategoryName(cat: string): string {
  return cat.replaceAll("_", " ");
}

export function formatRoomCode(locationId: string, locationName: string): string {
  if (locationId) {
    return locationId.toUpperCase().replaceAll("_", "-");
  }
  return locationName
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatTime(iso: string): string {
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

export function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function stripTrailingPeriod(text: string): string {
  return text.trim().replace(/\.+$/, "");
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
