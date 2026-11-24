import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildTrustExplanation } from "@/lib/rules-engine";
import { mutateDb } from "@/lib/store";
import type { User } from "@/lib/types";
import { jsonError, parseJsonBody } from "../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CreateUserSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
});

const RenameUserSchema = z.object({
  userId: z.string().trim().min(1, "userId is required"),
  name: z
    .string()
    .trim()
    .min(1, "Name cannot be empty")
    .max(60, "Name must be 60 characters or fewer"),
});

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, CreateUserSchema);
  if (!parsed.ok) return parsed.response;

  const user = await mutateDb(async (db) => {
    const nowIso = new Date().toISOString();
    const existingNewCount = db.users.filter((u) => u.isNewAccount).length;
    const displayName =
      parsed.data.name && parsed.data.name.length > 0
        ? parsed.data.name
        : `New Student ${existingNewCount + 1}`;

    const newUser: User = {
      id: `stu-new-${randomUUID().slice(0, 6)}`,
      name: displayName,
      role: "student",
      trustScore: 35,
      isNewAccount: true,
      createdAt: nowIso,
      trustHistory: [
        {
          id: `te-${randomUUID().slice(0, 8)}`,
          timestamp: nowIso,
          delta: 0,
          newScore: 35,
          reason: "Brand-new student account created (starter trust 35)",
        },
      ],
    };

    db.users.push(newUser);
    return {
      ...newUser,
      trustExplanation: buildTrustExplanation(newUser),
    };
  });

  return NextResponse.json({ ok: true, user });
}

export async function PATCH(req: Request) {
  const parsed = await parseJsonBody(req, RenameUserSchema);
  if (!parsed.ok) return parsed.response;

  const { userId, name } = parsed.data;

  const result = await mutateDb(async (db) => {
    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return { status: 404, body: { ok: false, message: "Student not found." } };
    }
    if (user.role !== "student") {
      return {
        status: 403,
        body: { ok: false, message: "Only student accounts can be renamed." },
      };
    }

    user.name = name;
    for (const issue of db.issues) {
      for (const vote of issue.votes) {
        if (vote.userId === user.id) {
          vote.userName = name;
        }
      }
      for (const held of issue.heldBrigadeActions ?? []) {
        if (held.userId === user.id) {
          held.userName = name;
        }
      }
    }

    return {
      status: 200,
      body: {
        ok: true,
        user: {
          ...user,
          trustExplanation: buildTrustExplanation(user),
        },
        message: `Renamed student to ${name}.`,
      },
    };
  });

  if (!result.body.ok && result.status >= 400) {
    return jsonError(result.body.message, result.status);
  }
  return NextResponse.json(result.body, { status: result.status });
}
