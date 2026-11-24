"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  UserPlus,
  RotateCcw,
  RefreshCw,
  Menu,
  Pencil,
  Check,
  X,
  ChevronDown,
  Search,
  Database,
  Eraser,
} from "lucide-react";
import type { User, UserRole } from "@/lib/types";
import { getTrustMeta } from "@/lib/format-ui";
import { CRAFT_EASE } from "@/components/MotionPrimitives";

interface JudgeBarProps {
  activeUser: User;
  users: User[];
  busyAction: string | null;
  onOpenMobileNav: () => void;
  onSwitchUser: (userId: string) => void;
  onSwitchRole: (role: UserRole) => void;
  onCreateStudent: () => Promise<void>;
  onRenameStudent: (userId: string, name: string) => Promise<void>;
  onReset: (mode: "clean" | "samples") => Promise<void>;
  onRefresh: () => Promise<void>;
}

const ROLE_TABS: Array<{ role: UserRole; label: string }> = [
  { role: "student", label: "Student" },
  { role: "staff", label: "Staff" },
  { role: "admin", label: "Registrar" },
];

export function JudgeBar({
  activeUser,
  users,
  busyAction,
  onOpenMobileNav,
  onSwitchUser,
  onSwitchRole,
  onCreateStudent,
  onRenameStudent,
  onReset,
  onRefresh,
}: JudgeBarProps) {
  const [personaOpen, setPersonaOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const personaRef = useRef<HTMLDivElement>(null);
  const resetRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isBusy = busyAction !== null;

  const students = useMemo(
    () => users.filter((u) => u.role === "student"),
    [users]
  );
  const staff = useMemo(() => users.filter((u) => u.role === "staff"), [users]);
  const admins = useMemo(
    () => users.filter((u) => u.role === "admin"),
    [users]
  );

  const q = query.trim().toLowerCase();
  const filteredStudents = useMemo(
    () =>
      !q
        ? students
        : students.filter(
            (u) =>
              u.name.toLowerCase().includes(q) ||
              String(u.trustScore).includes(q)
          ),
    [students, q]
  );
  const filteredStaff = useMemo(
    () =>
      !q
        ? staff
        : staff.filter(
            (u) =>
              u.name.toLowerCase().includes(q) ||
              (u.department ?? "").toLowerCase().includes(q)
          ),
    [staff, q]
  );
  const filteredAdmins = useMemo(
    () =>
      !q
        ? admins
        : admins.filter((u) => u.name.toLowerCase().includes(q)),
    [admins, q]
  );

  // Close popovers on outside click or Escape; open persona switcher on Cmd/Ctrl+K
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setResetOpen(false);
        setPersonaOpen((prev) => {
          if (!prev) setQuery("");
          return !prev;
        });
      } else if (e.key === "Escape") {
        setPersonaOpen(false);
        setResetOpen(false);
        setEditingUserId(null);
      }
    };
    const onClickOutside = (e: MouseEvent) => {
      if (
        personaRef.current &&
        !personaRef.current.contains(e.target as Node)
      ) {
        setPersonaOpen(false);
        setEditingUserId(null);
      }
      if (resetRef.current && !resetRef.current.contains(e.target as Node)) {
        setResetOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!personaOpen) return;
    const id = setTimeout(() => searchInputRef.current?.focus(), 40);
    return () => clearTimeout(id);
  }, [personaOpen]);

  const submitRename = async (e: React.FormEvent, userId: string) => {
    e.preventDefault();
    const trimmed = draftName.trim();
    if (!trimmed || isBusy) return;
    await onRenameStudent(userId, trimmed);
    setEditingUserId(null);
  };

  const activeTrust = getTrustMeta(activeUser.trustScore);

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-[#171717]/[0.09] bg-[#f7f7f6]/90 backdrop-blur-md">
      <div className="flex h-full items-center justify-between gap-3 px-4 md:px-6 lg:px-8">
        {/* Left: Mobile drawer trigger + 1-click Role Tabs + Persona Command Switcher */}
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="Open navigation"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[#171717]/[0.08] bg-[#ffffff] text-[#525252] hover:bg-[#efefed] hover:text-[#171717] lg:hidden press-tactile"
          >
            <Menu className="h-4 w-4" strokeWidth={1.5} />
          </button>

          {/* 1-Click Role Switcher with silky sliding active pill */}
          <div
            role="tablist"
            aria-label="Workspace role"
            className="hidden sm:inline-flex h-8 items-center rounded-[8px] border border-[#171717]/[0.08] bg-[#efefed] p-0.5"
          >
            {ROLE_TABS.map((tab) => {
              const selected = activeUser.role === tab.role;
              return (
                <button
                  key={tab.role}
                  role="tab"
                  aria-selected={selected}
                  type="button"
                  disabled={isBusy}
                  onClick={() => onSwitchRole(tab.role)}
                  className={`relative h-7 rounded-[6px] px-3 text-[13px] leading-5 transition-colors duration-150 ease-craft ${
                    selected
                      ? "text-[#171717] font-medium"
                      : "text-[#525252] hover:text-[#171717]"
                  }`}
                >
                  {selected && (
                    <motion.span
                      layoutId="topbar-role-pill"
                      transition={{ duration: 0.2, ease: CRAFT_EASE }}
                      className="absolute inset-0 rounded-[6px] bg-[#ffffff] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <span className="hidden h-4 w-px bg-[#171717]/[0.1] sm:inline-block" />

          {/* Persona Selector Popover Trigger */}
          <div ref={personaRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setResetOpen(false);
                setPersonaOpen((v) => {
                  if (!v) setQuery("");
                  return !v;
                });
              }}
              aria-expanded={personaOpen}
              aria-haspopup="listbox"
              className={`inline-flex h-8 items-center gap-2 rounded-[8px] border bg-[#ffffff] px-2.5 text-[13px] leading-5 text-[#171717] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors duration-150 ease-craft press-tactile ${
                personaOpen
                  ? "border-[#0f766e]/50"
                  : "border-[#171717]/[0.09] hover:border-[#171717]/[0.18]"
              }`}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  activeUser.role === "student"
                    ? activeTrust.dotColor
                    : activeUser.role === "staff"
                    ? "bg-[#0f766e]"
                    : "bg-[#171717]"
                }`}
              />
              <span className="max-w-[140px] truncate font-medium">
                {activeUser.role === "staff"
                  ? `${activeUser.department} Desk`
                  : activeUser.name}
              </span>
              {activeUser.role === "student" && (
                <span className="font-mono text-[12px] text-[#737373] tabular-nums">
                  {activeUser.trustScore}
                </span>
              )}
              <ChevronDown
                className={`h-3.5 w-3.5 text-[#737373] transition-transform duration-150 ease-craft ${
                  personaOpen ? "rotate-180" : ""
                }`}
                strokeWidth={1.5}
              />
              <span className="hidden md:inline-flex items-center gap-0.5 pl-0.5">
                <kbd className="kbd-cap">⌘</kbd>
                <kbd className="kbd-cap">K</kbd>
              </span>
            </button>

            <AnimatePresence>
              {personaOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: CRAFT_EASE }}
                  className="absolute left-0 top-[calc(100%+8px)] z-50 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[12px] border border-[#171717]/[0.1] bg-[#ffffff] shadow-[0_14px_36px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.05)]"
                >
                  {/* Search input */}
                  <div className="flex items-center gap-2 border-b border-[#171717]/[0.08] px-3 py-2.5">
                    <Search
                      className="h-4 w-4 shrink-0 text-[#737373]"
                      strokeWidth={1.5}
                    />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Switch student, desk, or registrar"
                      className="w-full bg-transparent text-[13px] leading-5 text-[#171717] placeholder:text-[#737373] focus:outline-none focus-visible:outline-none"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        className="text-[#737373] hover:text-[#171717]"
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>

                  <div className="max-h-[480px] overflow-y-auto p-2 space-y-2.5">
                    {/* Students */}
                    {filteredStudents.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between px-2 pb-1.5">
                          <span className="text-[11px] font-medium text-[#737373]">
                            Students ({filteredStudents.length})
                          </span>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={async () => {
                              await onCreateStudent();
                              setPersonaOpen(false);
                            }}
                            className="inline-flex items-center gap-1 rounded-[5px] px-1.5 py-0.5 text-[11px] font-medium text-[#0f766e] hover:bg-[#0f766e]/[0.08] transition-colors duration-150"
                          >
                            <UserPlus className="h-3 w-3" strokeWidth={1.5} />
                            <span>Add new</span>
                          </button>
                        </div>
                        <div className="space-y-0.5">
                          {filteredStudents.map((u) => {
                            const selected = u.id === activeUser.id;
                            const trust = getTrustMeta(u.trustScore);
                            const isNew =
                              u.isNewAccount || u.id.startsWith("stu-new-");
                            const isEditing = editingUserId === u.id;

                            if (isEditing) {
                              return (
                                <form
                                  key={u.id}
                                  onSubmit={(e) => void submitRename(e, u.id)}
                                  className="flex items-center gap-1.5 rounded-[8px] border border-[#0f766e] bg-[#fafafa] px-2 py-1"
                                >
                                  <input
                                    type="text"
                                    value={draftName}
                                    onChange={(e) =>
                                      setDraftName(e.target.value)
                                    }
                                    maxLength={60}
                                    autoFocus
                                    placeholder="Student name"
                                    className="h-6 min-w-0 flex-1 bg-transparent text-[13px] text-[#171717] focus:outline-none"
                                  />
                                  <button
                                    type="submit"
                                    disabled={isBusy || !draftName.trim()}
                                    aria-label="Save name"
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-[5px] bg-[#171717] text-[#ffffff]"
                                  >
                                    <Check
                                      className="h-3.5 w-3.5"
                                      strokeWidth={1.75}
                                    />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingUserId(null)}
                                    aria-label="Cancel"
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-[5px] text-[#737373] hover:bg-[#efefed]"
                                  >
                                    <X
                                      className="h-3.5 w-3.5"
                                      strokeWidth={1.75}
                                    />
                                  </button>
                                </form>
                              );
                            }

                            return (
                              <div
                                key={u.id}
                                className={`group flex items-center justify-between rounded-[8px] px-2.5 py-1.5 text-[13px] transition-colors duration-150 ${
                                  selected
                                    ? "bg-[#0f766e]/[0.08] text-[#171717]"
                                    : "text-[#525252] hover:bg-[#f3f3f2] hover:text-[#171717]"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSwitchUser(u.id);
                                    setPersonaOpen(false);
                                  }}
                                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                >
                                  <span
                                    className={`h-2 w-2 shrink-0 rounded-full ${trust.dotColor}`}
                                  />
                                  <span
                                    className={`truncate ${
                                      selected ? "font-medium" : "font-normal"
                                    }`}
                                  >
                                    {u.name}
                                  </span>
                                  {u.isNewAccount && (
                                    <span className="rounded-[4px] bg-[#efefed] px-1.5 py-0.5 font-mono text-[10px] leading-3 text-[#525252]">
                                      New
                                    </span>
                                  )}
                                </button>
                                <div className="flex items-center gap-1.5">
                                  {isNew && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDraftName(u.name);
                                        setEditingUserId(u.id);
                                      }}
                                      aria-label={`Rename ${u.name}`}
                                      className="inline-flex h-6 w-6 items-center justify-center rounded-[5px] text-[#737373] opacity-70 hover:bg-[#e7e7e5] hover:text-[#171717] hover:opacity-100"
                                    >
                                      <Pencil
                                        className="h-3 w-3"
                                        strokeWidth={1.5}
                                      />
                                    </button>
                                  )}
                                  <span className="w-7 text-right font-mono text-[12px] text-[#737373] tabular-nums">
                                    {u.trustScore}
                                  </span>
                                  {selected && (
                                    <Check
                                      className="h-3.5 w-3.5 text-[#0f766e]"
                                      strokeWidth={2}
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Department Staff */}
                    {filteredStaff.length > 0 && (
                      <div>
                        <div className="px-2 pb-1.5 text-[11px] font-medium text-[#737373]">
                          Department desks
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {filteredStaff.map((u) => {
                            const selected = u.id === activeUser.id;
                            return (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => {
                                  onSwitchUser(u.id);
                                  setPersonaOpen(false);
                                }}
                                className={`flex h-8 items-center justify-center rounded-[7px] border text-[12px] transition-colors duration-150 press-tactile ${
                                  selected
                                    ? "border-[#0f766e]/40 bg-[#0f766e]/[0.09] font-medium text-[#0f766e]"
                                    : "border-[#171717]/[0.07] bg-[#fafafa] text-[#525252] hover:bg-[#efefed] hover:text-[#171717]"
                                }`}
                              >
                                {u.department || u.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Registrar Admin */}
                    {filteredAdmins.length > 0 && (
                      <div>
                        <div className="px-2 pb-1.5 text-[11px] font-medium text-[#737373]">
                          Administration
                        </div>
                        {filteredAdmins.map((u) => {
                          const selected = u.id === activeUser.id;
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                onSwitchUser(u.id);
                                setPersonaOpen(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-[8px] px-2.5 py-2 text-[13px] transition-colors duration-150 ${
                                selected
                                  ? "bg-[#0f766e]/[0.08] font-medium text-[#171717]"
                                  : "text-[#525252] hover:bg-[#f3f3f2] hover:text-[#171717]"
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-[#171717]" />
                                <span>{u.name}</span>
                              </span>
                              {selected && (
                                <Check
                                  className="h-3.5 w-3.5 text-[#0f766e]"
                                  strokeWidth={2}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Compact utility actions (all 32px tall, never wraps) */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={onCreateStudent}
            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#171717]/[0.09] bg-[#ffffff] px-2.5 text-[13px] leading-5 font-medium text-[#171717] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:bg-[#f3f3f2] disabled:cursor-not-allowed disabled:opacity-50 press-tactile"
          >
            <UserPlus className="h-4 w-4 text-[#525252]" strokeWidth={1.5} />
            <span className="hidden sm:inline">
              {busyAction === "create-student" ? "Adding" : "New student"}
            </span>
          </button>

          {/* Consolidated Reset dropdown menu */}
          <div ref={resetRef} className="relative">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                setPersonaOpen(false);
                setResetOpen((v) => !v);
              }}
              aria-expanded={resetOpen}
              className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#171717]/[0.09] bg-[#ffffff] px-2.5 text-[13px] leading-5 font-normal text-[#525252] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:bg-[#f3f3f2] hover:text-[#171717] disabled:cursor-not-allowed disabled:opacity-50 press-tactile"
            >
              <RotateCcw className="h-3.5 w-3.5 text-[#737373]" strokeWidth={1.5} />
              <span className="hidden sm:inline">
                {busyAction?.startsWith("reset-") ? "Resetting" : "Reset"}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-[#737373] transition-transform duration-150 ${
                  resetOpen ? "rotate-180" : ""
                }`}
                strokeWidth={1.5}
              />
            </button>

            <AnimatePresence>
              {resetOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: CRAFT_EASE }}
                  className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 overflow-hidden rounded-[10px] border border-[#171717]/[0.1] bg-[#ffffff] p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.1)]"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setResetOpen(false);
                      void onReset("samples");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-left text-[13px] text-[#171717] hover:bg-[#f3f3f2] transition-colors duration-150"
                  >
                    <Database
                      className="h-4 w-4 text-[#737373]"
                      strokeWidth={1.5}
                    />
                    <div>
                      <div className="leading-4 font-medium">Sample tickets</div>
                      <div className="mt-0.5 text-[11px] leading-3.5 text-[#737373]">
                        Seed demo issues
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResetOpen(false);
                      void onReset("clean");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-left text-[13px] text-[#171717] hover:bg-[#f3f3f2] transition-colors duration-150"
                  >
                    <Eraser
                      className="h-4 w-4 text-[#737373]"
                      strokeWidth={1.5}
                    />
                    <div>
                      <div className="leading-4 font-medium">Clean baseline</div>
                      <div className="mt-0.5 text-[11px] leading-3.5 text-[#737373]">
                        Empty ticket queue
                      </div>
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            disabled={isBusy}
            onClick={onRefresh}
            title="Refresh"
            aria-label="Refresh state"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#171717]/[0.09] bg-[#ffffff] text-[#525252] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:bg-[#f3f3f2] hover:text-[#171717] disabled:cursor-not-allowed disabled:opacity-50 press-tactile"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-[#737373] ${
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
