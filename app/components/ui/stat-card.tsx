import type { ReactNode } from "react";

interface Props {
  label: string;
  value: string;
  trend?: { value: string; positive: boolean };
  accent?: "signal" | "success" | "warning" | "error";
  icon?: ReactNode;
}

const ACCENT_TEXT = {
  signal: "text-signal-bright",
  success: "text-state-success",
  warning: "text-state-warning",
  error: "text-state-error",
};

const ACCENT_GRADIENT = {
  signal: "bg-gradient-to-br from-[#4F7CFF] to-[#2451E0]",
  success: "bg-gradient-to-br from-[#34D399] to-[#059669]",
  warning: "bg-gradient-to-br from-[#FBBF24] to-[#D97706]",
  error: "bg-gradient-to-br from-[#F87171] to-[#DC2626]",
};

export function StatCard({ label, value, trend, accent = "signal", icon }: Props) {
  return (
    <div className="glass-card rounded-2xl p-4 flex items-center gap-3.5">
      {icon && (
        <div
          className={`icon-badge-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white ${ACCENT_GRADIENT[accent]}`}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0">
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
  );
}

export function StatIconLink({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M9 15 15 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M10.5 6.5 12 5a4 4 0 0 1 5.66 5.66L16 12.16M13.5 17.5 12 19a4 4 0 0 1-5.66-5.66L7.84 11.84"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StatIconClock({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StatIconCheck({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="m5 12 5 5 9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StatIconWarning({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 4 3 20h18L12 4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 10v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}

export function StatIconEye({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function StatIconCursor({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M5 3.5 19 10l-6.2 1.8L10.5 18 5 3.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StatIconPercent({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M5 19 19 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="7" cy="7" r="2.25" stroke="currentColor" strokeWidth="2" />
      <circle cx="17" cy="17" r="2.25" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
