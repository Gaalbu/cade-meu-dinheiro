"use client";

import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/format";

type TrendPoint = { month: string; total: number };
type CategoryPoint = { name: string; total: number; color: string };

const tooltipStyle = {
  background: "#1d201c",
  border: "0",
  borderRadius: 0,
  color: "#f4f0e5",
  fontFamily: "var(--mono)",
  fontSize: "0.7rem",
};

export function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer height={260} width="100%">
      <LineChart data={data} margin={{ left: -15, right: 10, top: 12 }}>
        <CartesianGrid stroke="#aaa38f" strokeDasharray="2 5" vertical={false} />
        <XAxis axisLine={{ stroke: "#777466" }} dataKey="month" fontFamily="var(--mono)" fontSize={10} tickLine={false} />
        <YAxis axisLine={false} fontFamily="var(--mono)" fontSize={9} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatCurrency(Number(value)), "gasto"]} />
        <Line animationDuration={700} dataKey="total" dot={{ fill: "#e9e4d6", r: 3, stroke: "#175c54", strokeWidth: 2 }} stroke="#175c54" strokeWidth={3} type="linear" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CategoryChart({ data }: { data: CategoryPoint[] }) {
  return (
    <ResponsiveContainer height={260} width="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 8, top: 12 }}>
        <CartesianGrid horizontal={false} stroke="#aaa38f" strokeDasharray="2 5" />
        <XAxis axisLine={{ stroke: "#777466" }} fontFamily="var(--mono)" fontSize={9} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} type="number" />
        <YAxis axisLine={false} dataKey="name" fontFamily="var(--mono)" fontSize={9} tickLine={false} type="category" width={82} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatCurrency(Number(value)), "gasto"]} />
        <Bar animationDuration={700} dataKey="total" radius={0}>
          {data.map((item) => <Cell fill={item.color} key={item.name} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
