"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  AreaChart,
  Area,
  ReferenceLine,
} from "recharts";
import type { Department, TrustEvent } from "@/lib/types";
import { formatShortDate, formatTime } from "@/lib/format-ui";

export interface DeptWorkloadDatum {
  dept: Department;
  activeCount: number;
  criticalCount: number;
  avgScore: number;
  peakScore: number;
}

interface DepartmentWorkloadChartProps {
  rows: DeptWorkloadDatum[];
  leadDept: Department;
  selectedDept: string;
  onSelectDept: (dept: Department) => void;
}

function WorkloadTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: DeptWorkloadDatum }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-[10px] border border-[#171717]/[0.1] bg-[#171717] px-3 py-2.5 text-[#fafafa] shadow-[0_10px_28px_rgba(0,0,0,0.16)]">
      <div className="flex items-center justify-between gap-4 text-[12px] font-medium">
        <span>{d.dept}</span>
        <span className="font-mono text-[#a3a3a3] tabular-nums">
          {d.activeCount} {d.activeCount === 1 ? "ticket" : "tickets"}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-3 font-mono text-[11px] text-[#d4d4d4] tabular-nums">
        <span>Peak {d.peakScore}</span>
        <span className="text-[#737373]">·</span>
        <span>Avg {d.avgScore}</span>
        {d.criticalCount > 0 && (
          <>
            <span className="text-[#737373]">·</span>
            <span className="text-[#f87171]">{d.criticalCount} critical</span>
          </>
        )}
      </div>
    </div>
  );
}

export function DepartmentWorkloadChart({
  rows,
  leadDept,
  selectedDept,
  onSelectDept,
}: DepartmentWorkloadChartProps) {
  const [metric, setMetric] = useState<"peakScore" | "activeCount">("peakScore");

  const maxActive = Math.max(3, ...rows.map((r) => r.activeCount));

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[15px] leading-5 font-medium text-[#171717]">
            Department workload
          </h2>
          {selectedDept !== "ALL" && (
            <button
              type="button"
              onClick={() => onSelectDept(selectedDept as Department)}
              className="rounded-[6px] border border-[#0f766e]/25 bg-[#0f766e]/[0.08] px-2 py-0.5 font-mono text-[11px] leading-4 text-[#0f766e] hover:bg-[#0f766e]/[0.14] press-tactile"
            >
              {selectedDept} ×
            </button>
          )}
        </div>

        <div className="inline-flex h-8 items-center rounded-[8px] border border-[#171717]/[0.08] bg-[#f3f3f2] p-0.5 text-[12px]">
          <button
            type="button"
            onClick={() => setMetric("peakScore")}
            className={`h-7 rounded-[6px] px-2.5 transition-colors duration-150 ease-craft ${
              metric === "peakScore"
                ? "bg-[#ffffff] text-[#171717] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                : "text-[#525252] hover:text-[#171717]"
            }`}
          >
            Peak priority
          </button>
          <button
            type="button"
            onClick={() => setMetric("activeCount")}
            className={`h-7 rounded-[6px] px-2.5 transition-colors duration-150 ease-craft ${
              metric === "activeCount"
                ? "bg-[#ffffff] text-[#171717] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                : "text-[#525252] hover:text-[#171717]"
            }`}
          >
            Ticket volume
          </button>
        </div>
      </div>

      <div className="mt-5 h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
            barCategoryGap="26%"
          >
            <CartesianGrid
              vertical={false}
              stroke="rgba(23,23,23,0.07)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="dept"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "#525252",
                fontSize: 12,
                fontFamily: "var(--font-jetbrains-mono), monospace",
              }}
              dy={6}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              domain={metric === "peakScore" ? [0, 100] : [0, maxActive]}
              allowDecimals={false}
              tick={{
                fill: "#737373",
                fontSize: 11,
                fontFamily: "var(--font-jetbrains-mono), monospace",
              }}
            />
            <Tooltip
              content={<WorkloadTooltip />}
              cursor={{ fill: "rgba(23,23,23,0.03)", radius: 6 }}
            />
            <Bar
              dataKey={metric}
              radius={[6, 6, 2, 2]}
              maxBarSize={44}
              animationDuration={480}
              animationEasing="ease-out"
              onClick={(entry) => {
                const dept = (entry as unknown as { dept?: Department })?.dept;
                if (dept) onSelectDept(dept);
              }}
              className="cursor-pointer"
            >
              {rows.map((entry) => {
                const isSelected = selectedDept === entry.dept;
                const isLead =
                  selectedDept === "ALL" &&
                  entry.dept === leadDept &&
                  entry.activeCount > 0;
                const hasCritical = entry.criticalCount > 0;

                let fill = "#c7c7c5";
                if (isSelected) {
                  fill = hasCritical ? "#dc2626" : "#0f766e";
                } else if (selectedDept !== "ALL") {
                  fill = "#e2e2df";
                } else if (hasCritical) {
                  fill = "#dc2626";
                } else if (isLead) {
                  fill = "#0f766e";
                }

                return <Cell key={entry.dept} fill={fill} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Compact interactive department strip so even 0-ticket depts are 1-click filterable */}
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#171717]/[0.06] pt-3 sm:grid-cols-6">
        {rows.map((r) => {
          const active = selectedDept === r.dept;
          return (
            <button
              key={r.dept}
              type="button"
              onClick={() => onSelectDept(r.dept)}
              className={`flex flex-col items-start rounded-[8px] border px-2.5 py-1.5 text-left transition-colors duration-150 ease-craft press-tactile ${
                active
                  ? "border-[#0f766e]/40 bg-[#0f766e]/[0.07]"
                  : "border-transparent bg-[#f7f7f6] hover:bg-[#efefed]"
              }`}
            >
              <span className="flex w-full items-center justify-between text-[11px] font-medium text-[#525252]">
                <span>{r.dept}</span>
                {r.criticalCount > 0 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#dc2626]" />
                )}
              </span>
              <span className="mt-0.5 font-mono text-[13px] font-medium text-[#171717] tabular-nums">
                {r.activeCount}
                <span className="ml-1 text-[11px] font-normal text-[#737373]">
                  /{r.peakScore}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface TrustTrajectoryPoint {
  label: string;
  timestamp: string;
  score: number;
  delta: number;
  reason: string;
}

function TrustTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: TrustTrajectoryPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="max-w-[240px] rounded-[10px] border border-[#171717]/[0.1] bg-[#171717] px-3 py-2.5 text-[#fafafa] shadow-[0_10px_28px_rgba(0,0,0,0.16)]">
      <div className="flex items-center justify-between gap-3 font-mono text-[12px] tabular-nums">
        <span className="font-medium">Score {p.score}</span>
        {p.delta !== 0 && (
          <span
            className={p.delta > 0 ? "text-[#4ade80]" : "text-[#f87171]"}
          >
            {p.delta > 0 ? `+${p.delta}` : p.delta}
          </span>
        )}
      </div>
      <p className="mt-1 text-[11px] leading-4 text-[#d4d4d4]">{p.reason}</p>
      <div className="mt-1 font-mono text-[10px] text-[#a3a3a3]">
        {formatTime(p.timestamp)}
      </div>
    </div>
  );
}

export function TrustTrajectoryChart({
  history,
  currentScore,
}: {
  history: TrustEvent[];
  currentScore: number;
}) {
  const chronological: TrustTrajectoryPoint[] = [...history]
    .reverse()
    .map((ev) => ({
      label: formatShortDate(ev.timestamp),
      timestamp: ev.timestamp,
      score: ev.newScore,
      delta: ev.delta,
      reason: ev.reason,
    }));

  const data: TrustTrajectoryPoint[] =
    chronological.length >= 2
      ? chronological
      : chronological.length === 1
      ? [
          { ...chronological[0], label: "Start" },
          { ...chronological[0], label: "Now", score: currentScore },
        ]
      : [
          {
            label: "Start",
            timestamp: new Date().toISOString(),
            score: currentScore,
            delta: 0,
            reason: "Initial standing",
          },
          {
            label: "Now",
            timestamp: new Date().toISOString(),
            score: currentScore,
            delta: 0,
            reason: "Current standing",
          },
        ];

  return (
    <div className="h-[184px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 24, left: -16, bottom: 4 }}
        >
          <defs>
            <linearGradient id="trustFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f766e" stopOpacity={0.16} />
              <stop offset="100%" stopColor="#0f766e" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="rgba(23,23,23,0.06)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            padding={{ left: 10, right: 18 }}
            tick={{
              fill: "#737373",
              fontSize: 11,
              fontFamily: "var(--font-jetbrains-mono), monospace",
            }}
            dy={6}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 60, 80, 100]}
            axisLine={false}
            tickLine={false}
            tick={{
              fill: "#737373",
              fontSize: 11,
              fontFamily: "var(--font-jetbrains-mono), monospace",
            }}
          />
          <ReferenceLine
            y={60}
            stroke="rgba(23,23,23,0.16)"
            strokeDasharray="3 3"
          />
          <Tooltip content={<TrustTooltip />} />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#0f766e"
            strokeWidth={2}
            fill="url(#trustFill)"
            dot={{ r: 3, fill: "#ffffff", stroke: "#0f766e", strokeWidth: 2 }}
            activeDot={{ r: 5, fill: "#0f766e", stroke: "#ffffff", strokeWidth: 2 }}
            animationDuration={460}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
