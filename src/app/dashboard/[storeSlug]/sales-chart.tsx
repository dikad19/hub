"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { rupiah } from "@/lib/format";

export type ChartPoint = {
  short: string; // label sumbu X, contoh "Sel"
  label: string; // label tooltip, contoh "Sel, 20 Okt"
  revenue: number;
  profit?: number; // hanya dikirim untuk OWNER
};

const config = {
  revenue: { label: "Penjualan", color: "var(--chart-1)" },
  profit: { label: "Laba kotor", color: "var(--chart-2)" },
} satisfies ChartConfig;

const compact = (v: number) =>
  v >= 1_000_000
    ? `${+(v / 1_000_000).toFixed(1)}jt`
    : v >= 1_000
      ? `${Math.round(v / 1_000)}rb`
      : String(v);

export function SalesChart({
  data,
  showProfit,
}: {
  data: ChartPoint[];
  showProfit: boolean;
}) {
  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full sm:h-64">
      <BarChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="short"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={compact}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => payload?.[0]?.payload?.label}
              formatter={(value, name, item) => (
                <>
                  <span
                    className="size-2.5 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground">
                    {config[name as keyof typeof config]?.label ?? name}
                  </span>
                  <span className="ml-auto font-mono font-medium tabular-nums">
                    {rupiah(Number(value))}
                  </span>
                </>
              )}
            />
          }
        />
        {showProfit && <ChartLegend content={<ChartLegendContent />} />}
        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
        {showProfit && (
          <Bar dataKey="profit" fill="var(--color-profit)" radius={4} />
        )}
      </BarChart>
    </ChartContainer>
  );
}
