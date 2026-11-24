"use client";

import React, { useState } from "react";
import {
  UserPlus,
  RotateCcw,
  RefreshCw,
  Menu,
  Pencil,
  Check,
  X,
} from "lucide-react";
import type { User } from "@/lib/types";

interface JudgeBarProps {
  activeUser: User;
  users: User[];
  busyAction: string | null;
  onOpenMobileNav: () => void;
  onSwitchUser: (userId: string) => void;
  onCreateStudent: () => Promise<void>;
  onRenameStudent: (userId: string, name: string) => Promise<void>;
  onReset: (mode: "clean" | "samples") => Promise<void>;
  onRefresh: () => Promise<void>;
}

function trustDotColor(score: number): string {
  if (score >= 80) return "bg-[#16a34a]";
  if (score >= 60) return "bg-[#1d4ed8]";
  if (score >= 45) return "bg-[#d97706]";
  return "bg-[#dc2626]";
}

export function JudgeBar({
  activeUser,
  users,
  busyAction,
  onOpenMobileNav,
  onSwitchUser,
  onCreateStudent,
  onRenameStudent,
  onReset,
  onRefresh,
}: JudgeBarProps) {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const students = users.filter((u) => u.role === "student");
  const staff = users.filter((u) => u.role === "staff");
  const admins = users.filter((u) => u.role === "admin");

  const isBusy = busyAction !== null;

  const submitRename = async (e: React.FormEvent, userId: string) => {
    e.preventDefault();
    const trimmed = draftName.trim();
    if (!trimmed || isBusy) return;
    await onRenameStudent(userId, trimmed);
    setEditingUserId(null);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[#111827]/[0.08] bg-[#ffffff]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5">
        {/* Left: Mobile menu button + 1-click persona switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="Open navigation menu"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] text-[#4b5565] hover:bg-[#eceff4] hover:text-[#111827] lg:hidden transition-colors duration-150 ease-craft"
          >
            <Menu className="h-4 w-4" strokeWidth={1.5} />
          </button>

          {/* Students group */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-[12px] leading-4 text-[#6b7487]">
              Students
            </span>
            {students.map((u) => {
              const selected = u.id === activeUser.id;
              const isNewStudent = u.isNewAccount || u.id.startsWith("stu-new-");
              const isEditingThis = editingUserId === u.id;

              if (isEditingThis) {
                return (
                  <form
                    key={u.id}
                    onSubmit={(e) => void submitRename(e, u.id)}
                    className="inline-flex h-8 items-center gap-1 rounded-[8px] border border-[#1d4ed8] bg-[#ffffff] px-1.5"
                  >
                    <input
                      type="text"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      maxLength={60}
                      autoFocus
                      placeholder="Student name"
                      className="h-6 w-28 bg-transparent px-1 text-[13px] leading-5 text-[#111827] focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isBusy || !draftName.trim()}
                      aria-label="Save name"
                      className="inline-flex h-6 w-6 items-center justify-center rounded-[5px] bg-[#1d4ed8] text-[#ffffff] hover:bg-[#1e40af] disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingUserId(null)}
                      aria-label="Cancel rename"
                      className="inline-flex h-6 w-6 items-center justify-center rounded-[5px] text-[#6b7487] hover:bg-[#eceff4] hover:text-[#111827]"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                  </form>
                );
              }

              return (
                <div key={u.id} className="inline-flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => onSwitchUser(u.id)}
                    title={u.trustExplanation || `${u.name} · Trust ${u.trustScore}`}
                    className={`inline-flex h-8 items-center gap-1.5 border px-2.5 text-[13px] leading-5 transition-colors duration-150 ease-craft tabular-nums ${
                      isNewStudent ? "rounded-l-[8px]" : "rounded-[8px]"
                    } ${
                      selected
                        ? "border-[#1d4ed8] bg-[#1d4ed8] text-[#ffffff] font-medium"
                        : "border-[#111827]/[0.08] bg-[#f5f7fa] text-[#4b5565] font-normal hover:bg-[#eceff4] hover:text-[#111827]"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        selected ? "bg-[#ffffff]" : trustDotColor(u.trustScore)
                      }`}
                    />
                    <span>{u.name}</span>
                    <span
                      className={`font-mono text-[12px] ${
                        selected ? "text-[#ffffff]/90" : "text-[#6b7487]"
                      }`}
                    >
                      {u.trustScore}
                    </span>
                    {u.isNewAccount && (
                      <span
                        className={`rounded-[4px] px-1 font-mono text-[12px] leading-4 ${
                          selected
                            ? "bg-[#ffffff]/20 text-[#ffffff]"
                            : "bg-[#eceff4] text-[#4b5565]"
                        }`}
                      >
                        New
                      </span>
                    )}
                  </button>
                  {isNewStudent && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        setDraftName(u.name);
                        setEditingUserId(u.id);
                      }}
                      title={`Rename ${u.name}`}
                      aria-label={`Rename ${u.name}`}
                      className={`inline-flex h-8 w-7 items-center justify-center rounded-r-[8px] border border-l-0 transition-colors duration-150 ease-craft ${
                        selected
                          ? "border-[#1d4ed8] bg-[#1e40af] text-[#ffffff] hover:bg-[#1d4ed8]"
                          : "border-[#111827]/[0.08] bg-[#f5f7fa] text-[#6b7487] hover:bg-[#eceff4] hover:text-[#111827]"
                      }`}
                    >
                      <Pencil className="h-3 w-3" strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <span className="hidden h-4 w-px bg-[#111827]/[0.08] xl:inline-block" />

          {/* Department Staff group */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-[12px] leading-4 text-[#6b7487]">
              Staff
            </span>
            {staff.map((u) => {
              const selected = u.id === activeUser.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => onSwitchUser(u.id)}
                  className={`inline-flex h-8 items-center rounded-[8px] border px-2.5 text-[13px] leading-5 transition-colors duration-150 ease-craft ${
                    selected
                      ? "border-[#1d4ed8] bg-[#1d4ed8] text-[#ffffff] font-medium"
                      : "border-[#111827]/[0.08] bg-[#f5f7fa] text-[#4b5565] font-normal hover:bg-[#eceff4] hover:text-[#111827]"
                  }`}
                >
                  {u.department || u.name}
                </button>
              );
            })}
          </div>

          <span className="hidden h-4 w-px bg-[#111827]/[0.08] sm:inline-block" />

          {/* Registrar Admin */}
          <div className="flex items-center gap-1">
            {admins.map((u) => {
              const selected = u.id === activeUser.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => onSwitchUser(u.id)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-[8px] border px-2.5 text-[13px] leading-5 transition-colors duration-150 ease-craft ${
                    selected
                      ? "border-[#1d4ed8] bg-[#1d4ed8] text-[#ffffff] font-medium"
                      : "border-[#111827]/[0.08] bg-[#f5f7fa] text-[#111827] font-normal hover:bg-[#eceff4]"
                  }`}
                >
                  <span>{u.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Simulation & Judge Controls (all 32px tall, 8px radius, 16px icons) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={onCreateStudent}
            className="inline-flex h-8 items-center gap-2 rounded-[8px] border border-[#111827]/[0.08] bg-[#eceff4] px-3 text-[13px] leading-5 font-medium text-[#111827] hover:bg-[#e2e6ee] disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150 ease-craft"
          >
            <UserPlus className="h-4 w-4 text-[#4b5565]" strokeWidth={1.5} />
            <span>
              {busyAction === "create-student" ? "Creating" : "New student"}
            </span>
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={() => onReset("clean")}
            className="inline-flex h-8 items-center gap-2 rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] px-3 text-[13px] leading-5 font-normal text-[#4b5565] hover:bg-[#eceff4] hover:text-[#111827] disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150 ease-craft"
          >
            <RotateCcw className="h-4 w-4 text-[#6b7487]" strokeWidth={1.5} />
            <span>
              {busyAction === "reset-clean" ? "Resetting" : "Reset clean"}
            </span>
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={() => onReset("samples")}
            className="inline-flex h-8 items-center gap-2 rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] px-3 text-[13px] leading-5 font-normal text-[#4b5565] hover:bg-[#eceff4] hover:text-[#111827] disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150 ease-craft"
          >
            <RotateCcw className="h-4 w-4 text-[#6b7487]" strokeWidth={1.5} />
            <span>
              {busyAction === "reset-samples" ? "Resetting" : "Reset samples"}
            </span>
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={onRefresh}
            title="Refresh state from server"
            aria-label="Refresh state from server"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#111827]/[0.08] bg-[#ffffff] text-[#4b5565] hover:bg-[#eceff4] hover:text-[#111827] disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150 ease-craft"
          >
            <RefreshCw
              className={`h-4 w-4 text-[#6b7487] ${
                busyAction === "refresh" ? "animate-spin" : ""
              }`}
              strokeWidth={1.5}
            />
          </button>
        </div>
      </div>
    </header>
  );
}
