import { useMemo } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ClinicalEvent, TrendPoint } from "@/lib/types";
import { NIPS_ALARM_THRESHOLD, NIPS_MAX } from "@/lib/risk";
import { formatDateTime, formatTimeShort } from "@/lib/utils";
import { EVENT_GLYPH } from "./eventGlyphs";

interface Props {
  trend: TrendPoint[];
  events: ClinicalEvent[];
  riskColor: string;
  height?: number;
}

interface Row {
  t: number;
  score: number | null;
  bridge: number | null;
  confidence: number;
  gap: boolean;
}

/** Build the series, converting gap runs into dotted "bridge" segments. */
function buildRows(trend: TrendPoint[]): Row[] {
  const rows: Row[] = trend.map((p) => ({
    t: p.t,
    score: p.gap ? null : p.score,
    bridge: null,
    confidence: p.confidence,
    gap: p.gap,
  }));

  let i = 0;
  while (i < rows.length) {
    if (!rows[i].gap) {
      i++;
      continue;
    }
    const start = i;
    while (i < rows.length && rows[i].gap) i++;
    const end = i; // exclusive
    // Span the dashed segment across the gap, including its endpoints.
    for (let k = Math.max(0, start - 1); k < Math.min(rows.length, end + 1); k++) {
      rows[k].bridge = trend[k].score;
    }
  }
  return rows;
}

function scoreAt(trend: TrendPoint[], t: number): number {
  if (!trend.length) return 0;
  let lo = 0;
  let hi = trend.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (trend[mid].t < t) lo = mid + 1;
    else hi = mid;
  }
  const cand = [trend[lo], trend[Math.max(0, lo - 1)]].filter((p) => !p.gap);
  if (!cand.length) return trend[lo].score;
  return cand.reduce((best, p) =>
    Math.abs(p.t - t) < Math.abs(best.t - t) ? p : best,
  ).score;
}

function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const rows: Row[] = payload.map((p: any) => p.payload as Row);
  const row = rows.find((r) => r && !r.gap) ?? rows[0];
  const event = payload.find((p: any) => p.dataKey === "eventScore")?.payload;
  const gapRow = rows.find((r) => r?.gap);
  return (
    <div className="min-w-[190px] rounded-lg border border-line bg-panel/95 px-3 py-2 text-ink shadow-panel backdrop-blur">
      <div className="mb-1 text-[11px] font-semibold tabular-nums">
        {formatDateTime(Number(label))}
      </div>
      {row && !row.gap && (
        <div className="flex items-center justify-between gap-4 text-[12px]">
          <span className="text-muted">NIPS composite</span>
          <span className="tnum font-semibold">{row.score}/7</span>
        </div>
      )}
      {row && (
        <div className="flex items-center justify-between gap-4 text-[11px] text-muted">
          <span>Confidence</span>
          <span className="tnum">{(row.confidence * 100).toFixed(0)}%</span>
        </div>
      )}
      {(row?.gap || gapRow) && (
        <div className="mt-1 rounded border border-line bg-canvas/60 px-2 py-1 text-[10px] uppercase tracking-wide text-muted">
          Gap · edge offline, no backfill
        </div>
      )}
      {event && (
        <div className="mt-1.5 border-t border-line pt-1.5">
          <div className="text-[11px] font-medium">{event.label}</div>
          <div className="tnum text-[10px] text-muted">
            {event.nurse_id} · {formatTimeShort(event.t)}
          </div>
        </div>
      )}
    </div>
  );
}

export function TrendChart({ trend, events, riskColor, height = 256 }: Props) {
  const rows = useMemo(() => buildRows(trend), [trend]);

  const eventPoints = useMemo(
    () =>
      events.map((e) => ({
        t: e.timestamp,
        eventScore: scoreAt(trend, e.timestamp),
        type: e.type,
        label: e.label,
        nurse_id: e.nurse_id,
      })),
    [events, trend],
  );

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="rgb(var(--line))" strokeOpacity={0.5} vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t) => formatTimeShort(Number(t))}
            tick={{ fill: "rgb(var(--muted))", fontSize: 10 }}
            stroke="rgb(var(--line))"
            minTickGap={48}
          />
          <YAxis
            domain={[0, NIPS_MAX]}
            ticks={[0, 1, 2, 3, 4, 5, 6, 7]}
            tick={{ fill: "rgb(var(--muted))", fontSize: 10 }}
            stroke="rgb(var(--line))"
            width={26}
            allowDecimals={false}
          />
          <ReferenceLine
            y={NIPS_ALARM_THRESHOLD}
            stroke="var(--risk-moderate)"
            strokeDasharray="6 4"
            strokeOpacity={0.8}
            label={{
              value: "alarm threshold",
              position: "insideTopRight",
              fill: "rgb(var(--muted))",
              fontSize: 10,
            }}
          />
          <Tooltip content={<TrendTooltip />} cursor={{ stroke: "rgb(var(--muted))", strokeOpacity: 0.4 }} />
          <Line
            type="monotone"
            dataKey="score"
            name="NIPS"
            stroke={riskColor}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="bridge"
            name="Gap"
            stroke={riskColor}
            strokeOpacity={0.5}
            strokeWidth={2}
            strokeDasharray="3 4"
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
          <Scatter
            data={eventPoints}
            dataKey="eventScore"
            name="Clinical event"
            fill="rgb(var(--muted))"
            isAnimationActive={false}
            shape={(props: any) => {
              const { cx, cy } = props;
              const glyph = EVENT_GLYPH[props?.payload?.type as keyof typeof EVENT_GLYPH];
              if (cx == null || cy == null) return <g />;
              return (
                <g transform={`translate(${cx},${cy})`}>
                  <title>{props?.payload?.label}</title>
                  <circle r="8" fill="rgb(var(--panel))" stroke="rgb(var(--line))" strokeWidth="1" />
                  <path
                    d={glyph ?? "M-3 0h6"}
                    transform="scale(0.6)"
                    stroke="rgb(var(--muted))"
                    strokeWidth="2.4"
                    fill="none"
                    strokeLinecap="round"
                  />
                </g>
              );
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
