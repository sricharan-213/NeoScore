import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { RadarAxis } from "@/lib/derive";
import { cn } from "@/lib/utils";

interface Props {
  axes: RadarAxis[];
  riskColor: string;
  height?: number;
  className?: string;
}

function RadarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const axis = payload[0]?.payload as RadarAxis | undefined;
  if (!axis) return null;
  return (
    <div className="rounded-lg border border-line bg-panel/95 px-3 py-2 shadow-panel backdrop-blur">
      <div className="text-[11px] font-semibold">{axis.axis}</div>
      <div className="tnum text-[11px] text-muted">
        {axis.raw} · S = {axis.subScore}
      </div>
    </div>
  );
}

export function RadarBreakdown({ axes, riskColor, height = 220, className }: Props) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={axes} outerRadius="70%" margin={{ top: 8, right: 24, bottom: 4, left: 24 }}>
          <PolarGrid stroke="rgb(var(--line))" strokeOpacity={0.7} />
          <PolarAngleAxis
            dataKey="short"
            tick={{ fill: "rgb(var(--muted))", fontSize: 10 }}
          />
          <PolarRadiusAxis domain={[0, 1]} tick={false} axisLine={false} />
          <Tooltip content={<RadarTooltip />} />
          <Radar
            dataKey="value"
            stroke={riskColor}
            fill={riskColor}
            fillOpacity={0.28}
            strokeWidth={2}
            isAnimationActive={false}
            dot={{ r: 2.5, fill: riskColor, strokeWidth: 0 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
