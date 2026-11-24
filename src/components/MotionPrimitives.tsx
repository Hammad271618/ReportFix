"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

export const CRAFT_EASE = [0.22, 1, 0.36, 1] as const;

export const CRAFT_TRANSITION = {
  duration: 0.24,
  ease: CRAFT_EASE,
};

export const FAST_TRANSITION = {
  duration: 0.16,
  ease: CRAFT_EASE,
};

/**
 * Flat geometric brand emblem for ReportFix:
 * An architectural campus quad grid with one verified spruce signal corner.
 */
export function BrandMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect x="2" y="2" width="9" height="9" rx="2" fill="#171717" />
      <rect x="13" y="2" width="9" height="9" rx="2" fill="#0f766e" />
      <rect x="2" y="13" width="9" height="9" rx="2" fill="#171717" fillOpacity="0.22" />
      <rect x="13" y="13" width="9" height="9" rx="2" fill="#171717" />
    </svg>
  );
}

/**
 * Smoothly tweens numeric figures when personas switch or live data updates.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  className = "",
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    if (start === end) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const duration = prefersReduced ? 0 : 340;
    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - startTime) / duration);
      // Quartic ease-out matching cubic-bezier(0.22, 1, 0.36, 1)
      const eased = 1 - Math.pow(1 - t, 3.2);
      const current = start + (end - start) * eased;
      setDisplay(current);
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        prevRef.current = end;
        setDisplay(end);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      prevRef.current = end;
    };
  }, [value]);

  const formatted =
    decimals > 0
      ? display.toFixed(decimals)
      : Math.round(display).toLocaleString();

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

/**
 * Page / section container with a restrained 8px fade-and-rise entrance.
 */
export function SectionStage({
  stageKey,
  children,
  className = "space-y-6",
}: {
  stageKey: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      key={stageKey}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: CRAFT_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggered card item capped at 6 stagger steps (40ms each) to keep dense lists snappy.
 */
export function StaggerCard({
  index,
  children,
  className = "",
}: {
  index: number;
  children: React.ReactNode;
  className?: string;
}) {
  const delay = Math.min(index, 5) * 0.04;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, delay, ease: CRAFT_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Smooth accordion / reveal panel using opacity & subtle rise (no height jitter).
 */
export function RevealPanel({
  open,
  children,
  className = "",
}: {
  open: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: CRAFT_EASE }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
