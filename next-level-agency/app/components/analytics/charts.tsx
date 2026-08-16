"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { PLATFORM_META, PlatformKey } from "@/lib/platform-meta";

export interface EngagementPoint {
  date: string;
  impressions: number;
  engagement: number;
}

export function EngagementChart({ data }: { data: EngagementPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid stroke="#1E222B" vertical={false} />
        <XAxis dataKey="date" stroke="#5A5F6B" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#5A5F6B" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: "#161920", border: "1px solid #2A2F3B", borderRadius: 12 }}
          labelStyle={{ color: "#E7E9EE" }}
        />
        <Line type="monotone" dataKey="impressions" stroke="#4F7CFF" strokeWidth={2} dot={false} name="Afișări" />
        <Line type="monotone" dataKey="engagement" stroke="#3DD68C" strokeWidth={2} dot={false} name="Interacțiuni" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export interface PlatformTotal {
  platform: PlatformKey;
  posts: number;
  engagement: number;
}

export function PlatformBarChart({ data }: { data: PlatformTotal[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid stroke="#1E222B" vertical={false} />
        <XAxis
          dataKey="platform"
          stroke="#5A5F6B"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(p: PlatformKey) => PLATFORM_META[p].short}
        />
        <YAxis stroke="#5A5F6B" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: "#161920", border: "1px solid #2A2F3B", borderRadius: 12 }}
          labelFormatter={(p: PlatformKey) => PLATFORM_META[p].label}
        />
        <Bar dataKey="engagement" radius={[6, 6, 0, 0]} name="Interacțiuni">
          {data.map((entry) => (
            <Cell key={entry.platform} fill={PLATFORM_META[entry.platform].color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
