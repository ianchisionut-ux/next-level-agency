"use client";

import { ResponsiveContainer, AreaChart, Area } from "recharts";
import type { ReactNode } from "react";

type SparkPoint = { [key: string]: string | number };

interface Props {
  label: string;
  value: string;
  trend?: { value: string; positive: boolean };
  accent?: "signal" | "success" | "warning" | "error";
  icon?: ReactNode;
  data: SparkPoint[];
  dataKey: string;
}

const ACCENT_TEXT = {
  signal: "text-signal-bright",
  success: "text-state-success",
  warning: "text-state-warning",
  error: "text-state-error",
};

const ACCENT_BADGE = {
  signal: "bg-signal",
  success: "bg-state-success",
  warning: "bg-state-warning",
  error: "bg-state-error",
};

const ACCENT_STROKE = {
  signal: "#3B66F6",
  success: "#16A34A",
  warning: "#D97706",
  error: "#DC2626",
};

export function StatCardChart({ label, value, trend, accent = "signal", icon, data, dataKey }: Props) {
  const gradientId = `spark-${dataKey}-${accent}`;

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-800 shadow-card p-4 overflow-hidden">
      <div className="flex items-center gap-3.5">
        {icon && (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${ACCENT_BADGE[accent]}`}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className={`font-mono text-xl font-semibold ${ACCENT_TEXT[accent]}`}>{value}</span>
            {trend && (
              <span className={`text-xs font-mono ${trend.positive ? "text-state-success" : "text-state-error"}`}>
                {trend.positive ? "↑" : "↓"} {trend.value}
              </span>
            )}
          </div>
          <p className="text-xs text-mist-500 truncate">{label}</p>
        </div>
      </div>

      {data.length > 1 && (
        <div className="h-10 -mx-1 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT_STROKE[accent]} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={ACCENT_STROKE[accent]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={ACCENT_STROKE[accent]}
                strokeWidth={1.75}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
