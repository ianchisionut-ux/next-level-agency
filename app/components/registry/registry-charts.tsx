"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const COLOR_PAID = "#16A34A";
const COLOR_UNPAID = "#D97706";

export function PaidStatusDonut({ paid, unpaid }: { paid: number; unpaid: number }) {
  const total = paid + unpaid;
  const data = [
    { name: "Achitat", value: paid },
    { name: "Neachitat", value: unpaid },
  ];

  if (total === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-sm text-mist-500">
        Niciun proiect încă.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={2}
              stroke="none"
            >
              <Cell fill={COLOR_PAID} />
              <Cell fill={COLOR_UNPAID} />
            </Pie>
            <Tooltip
              contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12 }}
              formatter={(value: number) => `${value.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} lei`}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-base font-semibold text-mist-100">
            {total.toLocaleString("ro-RO", { minimumFractionDigits: 0 })}
          </span>
          <span className="text-[10px] text-mist-500 uppercase tracking-wide">lei total</span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_PAID }} />
          <span className="text-sm text-mist-300">
            Achitat — <span className="font-mono text-mist-100">{paid.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} lei</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_UNPAID }} />
          <span className="text-sm text-mist-300">
            Neachitat — <span className="font-mono text-mist-100">{unpaid.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} lei</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export interface MonthlyTotal {
  month: string;
  total: number;
}

export function MonthlyTotalsBarChart({ data }: { data: MonthlyTotal[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-mist-500">
        Niciun proiect încă.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid stroke="#E5E7EB" vertical={false} />
        <XAxis dataKey="month" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12 }}
          formatter={(value: number) => `${value.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} lei`}
        />
        <Bar dataKey="total" fill="#3B66F6" radius={[6, 6, 0, 0]} name="Sumă totală" />
      </BarChart>
    </ResponsiveContainer>
  );
}
