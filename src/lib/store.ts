import { promises as fs } from "fs";
import path from "path";
import { recomputeIssuePriority } from "./rules-engine";
import type { DatabaseState, Department, Issue, User } from "./types";

const DB_PATH = path.join(process.cwd(), "data", "reportfix-db.json");

const globalLockRef = globalThis as unknown as {
  __reportfixWriteLock?: Promise<unknown>;
};

function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = globalLockRef.__reportfixWriteLock ?? Promise.resolve();
  const next = prev.then(fn, fn);
  globalLockRef.__reportfixWriteLock = next.catch(() => undefined);
  return next;
}

function buildSeedUsers(nowIso: string): User[] {
  const nowMs = Date.parse(nowIso);
  const daysAgo = (d: number) => new Date(nowMs - d * 24 * 60 * 60 * 1000).toISOString();
  const establishedCreatedAt = daysAgo(45);

  const students: User[] = [
    {
      id: "stu-ayesha",
      name: "Ayesha",
      role: "student",
      trustScore: 88,
      isNewAccount: false,
      createdAt: establishedCreatedAt,
      trustHistory: [
        {
          id: "te-init-stu-ayesha-4",
          timestamp: daysAgo(2),
          delta: 6,
          newScore: 88,
          reason: "Reported issue verified resolved by campus community",
        },
        {
          id: "te-init-stu-ayesha-3",
          timestamp: daysAgo(7),
          delta: 6,
          newScore: 82,
          reason: "Reported issue verified resolved by campus community",
        },
        {
          id: "te-init-stu-ayesha-2",
          timestamp: daysAgo(15),
          delta: 6,
          newScore: 76,
          reason: "Confirmed fixes worked across campus tickets",
        },
        {
          id: "te-init-stu-ayesha-1",
          timestamp: daysAgo(28),
          delta: 10,
          newScore: 70,
          reason: "Consistent verified facility reports",
        },
        {
          id: "te-init-stu-ayesha-0",
          timestamp: establishedCreatedAt,
          delta: 0,
          newScore: 60,
          reason: "Established campus student baseline (60)",
        },
      ],
    },
    {
      id: "stu-zainab",
      name: "Zainab",
      role: "student",
      trustScore: 82,
      isNewAccount: false,
      createdAt: establishedCreatedAt,
      trustHistory: [
        {
          id: "te-init-stu-zainab-3",
          timestamp: daysAgo(3),
          delta: 6,
          newScore: 82,
          reason: "Accurate post-resolution verification votes",
        },
        {
          id: "te-init-stu-zainab-2",
          timestamp: daysAgo(12),
          delta: 6,
          newScore: 76,
          reason: "Reported issue verified resolved by campus community",
        },
        {
          id: "te-init-stu-zainab-1",
          timestamp: daysAgo(25),
          delta: 10,
          newScore: 70,
          reason: "Consistent verified facility reports",
        },
        {
          id: "te-init-stu-zainab-0",
          timestamp: establishedCreatedAt,
          delta: 0,
          newScore: 60,
          reason: "Established campus student baseline (60)",
        },
      ],
    },
    {
      id: "stu-usman",
      name: "Usman",
      role: "student",
      trustScore: 72,
      isNewAccount: false,
      createdAt: establishedCreatedAt,
      trustHistory: [
        {
          id: "te-init-stu-usman-2",
          timestamp: daysAgo(6),
          delta: 6,
          newScore: 72,
          reason: "Confirmed fixes on resolved campus tickets",
        },
        {
          id: "te-init-stu-usman-1",
          timestamp: daysAgo(18),
          delta: 6,
          newScore: 66,
          reason: "Reported issue verified resolved by campus community",
        },
        {
          id: "te-init-stu-usman-0",
          timestamp: establishedCreatedAt,
          delta: 0,
          newScore: 60,
          reason: "Established campus student baseline (60)",
        },
      ],
    },
    {
      id: "stu-bilal",
      name: "Bilal",
      role: "student",
      trustScore: 64,
      isNewAccount: false,
      createdAt: establishedCreatedAt,
      trustHistory: [
        {
          id: "te-init-stu-bilal-1",
          timestamp: daysAgo(9),
          delta: 4,
          newScore: 64,
          reason: "Confirmed fix worked on resolved issue",
        },
        {
          id: "te-init-stu-bilal-0",
          timestamp: establishedCreatedAt,
          delta: 0,
          newScore: 60,
          reason: "Established campus student baseline (60)",
        },
      ],
    },
    {
      id: "stu-hina",
      name: "Hina",
      role: "student",
      trustScore: 60,
      isNewAccount: false,
      createdAt: establishedCreatedAt,
      trustHistory: [
        {
          id: "te-init-stu-hina-0",
          timestamp: establishedCreatedAt,
          delta: 0,
          newScore: 60,
          reason: "Established campus student baseline (60)",
        },
      ],
    },
    {
      id: "stu-saad",
      name: "Saad",
      role: "student",
      trustScore: 48,
      isNewAccount: false,
      createdAt: establishedCreatedAt,
      trustHistory: [
        {
          id: "te-init-stu-saad-2",
          timestamp: daysAgo(5),
          delta: -6,
          newScore: 48,
          reason: "Dispute votes overruled by community verification",
        },
        {
          id: "te-init-stu-saad-1",
          timestamp: daysAgo(14),
          delta: -6,
          newScore: 54,
          reason: "Confirm votes overruled by reopened disputes",
        },
        {
          id: "te-init-stu-saad-0",
          timestamp: establishedCreatedAt,
          delta: 0,
          newScore: 60,
          reason: "Established campus student baseline (60)",
        },
      ],
    },
    {
      id: "stu-hamza",
      name: "Hamza",
      role: "student",
      trustScore: 22,
      isNewAccount: false,
      createdAt: establishedCreatedAt,
      trustHistory: [
        {
          id: "te-init-stu-hamza-2",
          timestamp: daysAgo(4),
          delta: -18,
          newScore: 22,
          reason: "Repeated low-quality / unverified reports",
        },
        {
          id: "te-init-stu-hamza-1",
          timestamp: daysAgo(11),
          delta: -20,
          newScore: 40,
          reason: "Report dismissed as fake/spam by staff/admin",
        },
        {
          id: "te-init-stu-hamza-0",
          timestamp: establishedCreatedAt,
          delta: 0,
          newScore: 60,
          reason: "Established campus student baseline (60)",
        },
      ],
    },
  ];

  const staffDepts: Array<{ id: string; name: string; department: Department }> = [
    { id: "staff-ee", name: "EE Dept Staff", department: "EE" },
    { id: "staff-cse", name: "CSE Dept Staff", department: "CSE" },
    { id: "staff-is", name: "IS Dept Staff", department: "IS" },
    { id: "staff-library", name: "Library Dept Staff", department: "Library" },
    { id: "staff-cafeteria", name: "Cafeteria Dept Staff", department: "Cafeteria" },
    { id: "staff-labs", name: "Labs Dept Staff", department: "Labs" },
  ];

  return [
    ...students,
    ...staffDepts.map((st) => ({
      id: st.id,
      name: st.name,
      role: "staff" as const,
      department: st.department,
      trustScore: 100,
      isNewAccount: false,
      createdAt: establishedCreatedAt,
      trustHistory: [],
    })),
    {
      id: "admin-registrar",
      name: "Registrar Admin",
      role: "admin" as const,
      trustScore: 100,
      isNewAccount: false,
      createdAt: establishedCreatedAt,
      trustHistory: [],
    },
  ];
}

function buildSampleIssues(nowIso: string): Issue[] {
  const nowMs = Date.parse(nowIso);
  const hoursAgo = (h: number) => new Date(nowMs - h * 60 * 60 * 1000).toISOString();

  const emptyVoting = {
    eligibleCount: 0,
    eligibleWeight: 0,
    confirmWeight: 0,
    disputeWeight: 0,
    reopenThreshold: 0,
    heldBrigadeCount: 0,
  };

  return [
    {
      id: "iss-sample-1",
      cleanSummary: "Air conditioning unit not cooling in Library Main Room",
      oneLineReason: "",
      category: "hvac_ac",
      department: "Library",
      locationId: "lib-main-room",
      locationName: "Library Main Room",
      status: "RESOLVED",
      priority: "MEDIUM",
      priorityScore: 53,
      priorityBreakdown: {
        isSafetyHazard: false,
        hazardType: "none",
        factualImpact: "moderate",
        baseScore: 38,
        activeSupporterCount: 2,
        effectiveCrowdWeight: 1.8,
        crowdBonus: 24,
        computedScore: 62,
        computedPriority: "HIGH",
      },
      isConfidential: false,
      reporterId: "stu-ayesha",
      activeSupporterIds: ["stu-ayesha", "stu-bilal"],
      meTooCount: 2,
      eligibleVoterIds: ["stu-ayesha", "stu-bilal"],
      votes: [],
      heldBrigadeActions: [],
      votingProgress: emptyVoting,
      reopenCount: 0,
      createdAt: hoursAgo(6),
      updatedAt: hoursAgo(1),
      resolvedAt: hoursAgo(1),
      adminNotes: ["Library maintenance replaced condenser fuse and marked resolved."],
    },
    {
      id: "iss-sample-2",
      cleanSummary: "Overhead projector HDMI signal dropping intermittently in CR 32",
      oneLineReason: "",
      category: "projector_av",
      department: "CSE",
      locationId: "cse-cr-32",
      locationName: "CR 32",
      status: "OPEN",
      priority: "HIGH",
      priorityScore: 76,
      priorityBreakdown: {
        isSafetyHazard: false,
        hazardType: "none",
        factualImpact: "high_functional",
        baseScore: 56,
        activeSupporterCount: 3,
        effectiveCrowdWeight: 2.32,
        crowdBonus: 28,
        computedScore: 84,
        computedPriority: "HIGH",
      },
      isConfidential: false,
      reporterId: "stu-zainab",
      activeSupporterIds: ["stu-zainab", "stu-usman", "stu-hina"],
      meTooCount: 3,
      eligibleVoterIds: [],
      votes: [],
      heldBrigadeActions: [],
      votingProgress: emptyVoting,
      reopenCount: 0,
      createdAt: hoursAgo(4),
      updatedAt: hoursAgo(2),
      adminNotes: [],
    },
    {
      id: "iss-sample-3",
      cleanSummary: "Drinking water dispenser leaking onto floor near Main Cafe Inner",
      oneLineReason: "",
      category: "plumbing_water",
      department: "Cafeteria",
      locationId: "cafe-main-inner",
      locationName: "Main Cafe Inner",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      priorityScore: 53,
      priorityBreakdown: {
        isSafetyHazard: false,
        hazardType: "none",
        factualImpact: "moderate",
        baseScore: 38,
        activeSupporterCount: 2,
        effectiveCrowdWeight: 1.35,
        crowdBonus: 20,
        computedScore: 58,
        computedPriority: "MEDIUM",
      },
      isConfidential: false,
      reporterId: "stu-usman",
      activeSupporterIds: ["stu-usman", "stu-saad"],
      meTooCount: 2,
      eligibleVoterIds: [],
      votes: [],
      heldBrigadeActions: [],
      votingProgress: emptyVoting,
      reopenCount: 0,
      createdAt: hoursAgo(5),
      updatedAt: hoursAgo(1.5),
      adminNotes: [],
    },
    {
      id: "iss-sample-4",
      cleanSummary: "Flickering ceiling tube light above workbench in CR 21",
      oneLineReason: "",
      category: "power_lighting",
      department: "EE",
      locationId: "ee-cr-21",
      locationName: "CR 21",
      status: "OPEN",
      priority: "LOW",
      priorityScore: 18,
      priorityBreakdown: {
        isSafetyHazard: false,
        hazardType: "none",
        factualImpact: "minor",
        baseScore: 18,
        activeSupporterCount: 1,
        effectiveCrowdWeight: 0.8,
        crowdBonus: 0,
        computedScore: 18,
        computedPriority: "LOW",
      },
      isConfidential: false,
      reporterId: "stu-bilal",
      activeSupporterIds: ["stu-bilal"],
      meTooCount: 1,
      eligibleVoterIds: [],
      votes: [],
      heldBrigadeActions: [],
      votingProgress: emptyVoting,
      reopenCount: 0,
      createdAt: hoursAgo(3),
      updatedAt: hoursAgo(3),
      adminNotes: [],
    },
  ];
}

export function createSeedState(mode: "clean" | "samples"): DatabaseState {
  const nowIso = new Date().toISOString();
  const users = buildSeedUsers(nowIso);
  const issues = mode === "samples" ? buildSampleIssues(nowIso) : [];

  const db: DatabaseState = {
    users,
    issues,
    pendingClarifications: [],
    securityAlerts: [],
    submissionTimestampsByUser: {},
    lastResetMode: mode,
    updatedAt: nowIso,
  };

  for (const issue of db.issues) {
    recomputeIssuePriority(db, issue);
  }

  return db;
}

async function writeDbAtomic(db: DatabaseState): Promise<void> {
  const dir = path.dirname(DB_PATH);
  await fs.mkdir(dir, { recursive: true });
  db.updatedAt = new Date().toISOString();
  const payload = JSON.stringify(db, null, 2);

  const tmpPath = `${DB_PATH}.${process.pid}.${Date.now()}.${Math.random()
    .toString(36)
    .slice(2, 7)}.tmp`;

  try {
    await fs.writeFile(tmpPath, payload, "utf8");
    let renamed = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await fs.rename(tmpPath, DB_PATH);
        renamed = true;
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 15));
      }
    }
    if (!renamed) {
      // Windows fallback when destination is briefly locked by AV/indexer
      await fs.writeFile(DB_PATH, payload, "utf8");
    }
  } finally {
    await fs.unlink(tmpPath).catch(() => undefined);
  }
}

async function readDbFromDiskUnlocked(): Promise<DatabaseState> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    const parsed = JSON.parse(raw) as DatabaseState;
    if (!parsed || !Array.isArray(parsed.users) || !Array.isArray(parsed.issues)) {
      throw new Error("Invalid DB structure");
    }
    return parsed;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException | undefined)?.code;
    if (code === "ENOENT" || err instanceof SyntaxError || (err as Error)?.message === "Invalid DB structure") {
      const seed = createSeedState("samples");
      await writeDbAtomic(seed);
      return seed;
    }
    throw err;
  }
}

export async function readDb(): Promise<DatabaseState> {
  return withWriteLock(async () => readDbFromDiskUnlocked());
}

export async function mutateDb<T>(
  mutator: (db: DatabaseState) => Promise<T> | T
): Promise<T> {
  return withWriteLock(async () => {
    const db = await readDbFromDiskUnlocked();
    const result = await mutator(db);
    await writeDbAtomic(db);
    return result;
  });
}

export async function resetDb(
  mode: "clean" | "samples" = "samples"
): Promise<DatabaseState> {
  return withWriteLock(async () => {
    const seed = createSeedState(mode);
    await writeDbAtomic(seed);
    return seed;
  });
}
