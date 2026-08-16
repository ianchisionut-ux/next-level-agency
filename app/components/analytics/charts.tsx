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
  PieChart,
  Pie,
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

export function ChannelShareDonut({ data }: { data: PlatformTotal[] }) {
  const total = data.reduce((sum, d) => sum + d.engagement, 0);

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="engagement"
              nameKey="platform"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.platform} fill={PLATFORM_META[entry.platform].color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#161920", border: "1px solid #2A2F3B", borderRadius: 12 }}
              labelFormatter={(p: PlatformKey) => PLATFORM_META[p].label}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-lg font-semibold text-mist-100">
            {total.toLocaleString("ro-RO")}
          </span>
          <span className="text-[10px] text-mist-500 uppercase tracking-wide">Total</span>
        </div>
      </div>

      <div className="flex-1 space-y-2.5">
        {data
          .slice()
          .sort((a, b) => b.engagement - a.engagement)
          .map((entry) => (
            <div key={entry.platform} className="flex items-center gap-2.5 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: PLATFORM_META[entry.platform].color }}
              />
              <span className="text-mist-300">{PLATFORM_META[entry.platform].label}</span>
              <span className="ml-auto font-mono text-mist-500">
                {total > 0 ? Math.round((entry.engagement / total) * 100) : 0}%
              </span>
            </div>
          ))}
      </div>
    </div>
  );
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
