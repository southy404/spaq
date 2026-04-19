import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { Link } from "react-router-dom";
import { useCardEntries } from "../../hooks/useStats";
import { useTheme } from "../../hooks/useTheme";
import {
  buildChartPoints,
  formatMetricNumber,
  getChartGoalValue,
  getMetricSummary,
  getValueRange,
  movingAverage,
  resolveGoalMode,
  resolveMetricDefinition,
  isGoalReached,
} from "../../lib/metrics";

interface Card {
  _id: string;
  label: string;
  unit: string;
  type: string;
  chartType?: string;
  color?: string;
  goalEnabled?: boolean;
  goalValue?: number | null;
  goalDirection?: "lose" | "gain" | "min" | "max" | null;
}

interface Props {
  cards: Card[];
  selectedCardIds: string[];
  selectedDate?: string;
}

const DEFAULT_COLORS: Record<string, string> = {
  heartrate: "rose",
  calories: "orange",
  weight: "blue",
  steps: "green",
  sleep: "purple",
  custom: "yellow",
};

const COLOR_HEX: Record<string, string> = {
  rose: "#f43f5e",
  orange: "#f97316",
  amber: "#f59e0b",
  green: "#22c55e",
  teal: "#14b8a6",
  blue: "#3b82f6",
  indigo: "#6366f1",
  purple: "#a855f7",
  pink: "#ec4899",
  yellow: "#FFD300",
};

const TIME_RANGES = [
  { key: "1W", label: "1W", days: 7 },
  { key: "1M", label: "1M", days: 30 },
  { key: "3M", label: "3M", days: 90 },
  { key: "1Y", label: "1J", days: 365 },
  { key: "custom", label: "Frei", days: 0 },
] as const;

function getCardColor(card?: Card): string {
  if (!card) return "#FFD300";
  const key = card.color ?? DEFAULT_COLORS[card.type] ?? "yellow";
  return COLOR_HEX[key] ?? "#FFD300";
}

function stripEmoji(label: string): string {
  return label.replace(/^\[[a-z]+\]\s*/, "").replace(/^\p{Emoji}\s*/u, "");
}

function formatPaceTick(value: number): string {
  if (!Number.isFinite(value)) return "";

  const totalSeconds = Math.round(value * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}/km`;
}

function getDisplayUnit(unit: string): string {
  if (!unit.startsWith("custom||")) return unit;

  const parts = unit.split("||").slice(1);
  const p1 = parts[0]?.split(":") ?? [];
  const p2 = parts[1]?.split(":") ?? [];
  const u1 = p1[1]?.trim() ?? "";
  const u2 = p2[1]?.trim() ?? "";

  if (u1 && u2) return `${u1} / ${u2}`;
  if (u1) return u1;
  return p1[0]?.trim() || "—";
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getAnchorDate(selectedDate?: string) {
  if (selectedDate) {
    const parsed = new Date(`${selectedDate}T12:00:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export default function MainChart({
  cards,
  selectedCardIds,
  selectedDate,
}: Props) {
  const { resolvedTheme } = useTheme();

  const selectedCards = useMemo(
    () => cards.filter((c) => selectedCardIds.includes(c._id)),
    [cards, selectedCardIds]
  );

  const [activeCardId, setActiveCardId] = useState<string>("");
  const [timeRange, setTimeRange] = useState<string>("1M");
  const [customFrom, setCustomFrom] = useState<string>(() => {
    const anchor = getAnchorDate(selectedDate);
    const d = new Date(anchor);
    d.setMonth(d.getMonth() - 1);
    return toDateStr(d);
  });
  const [customTo, setCustomTo] = useState<string>(() =>
    toDateStr(getAnchorDate(selectedDate))
  );
  const [trendActive, setTrendActive] = useState(false);
  const [trendWindow, setTrendWindow] = useState<number>(7);

  const displayCard =
    selectedCards.find((c) => c._id === activeCardId) ?? selectedCards[0];

  const cardColor = getCardColor(displayCard);
  const displayUnit = getDisplayUnit(displayCard?.unit ?? "");
  const chartType = displayCard?.chartType ?? "line";
  const metricDefinition = useMemo(
    () => resolveMetricDefinition(displayCard),
    [displayCard]
  );
  const goalMode = useMemo(() => resolveGoalMode(displayCard), [displayCard]);

  const chartUi = useMemo(() => {
    if (resolvedTheme === "dark") {
      return {
        grid: "rgba(255,255,255,0.05)",
        tick: "#64748b",
        tooltipBg: "#1e1e2e",
        tooltipBorder: `${cardColor}30`,
        tooltipText: "#e2e8f0",
        trend: "rgba(255,255,255,0.45)",
        mutedLine: "#64748b",
      };
    }

    return {
      grid: "rgba(15,23,42,0.08)",
      tick: "#6b7280",
      tooltipBg: "#ffffff",
      tooltipBorder: `${cardColor}35`,
      tooltipText: "#111827",
      trend: "rgba(15,23,42,0.35)",
      mutedLine: "#94a3b8",
    };
  }, [resolvedTheme, cardColor]);

  const anchorDate = useMemo(() => getAnchorDate(selectedDate), [selectedDate]);

  const { from, to } = useMemo(() => {
    if (timeRange === "custom") {
      return { from: customFrom, to: customTo };
    }

    const endDate = new Date(anchorDate);
    const range = TIME_RANGES.find((r) => r.key === timeRange);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - ((range?.days ?? 30) - 1));

    return {
      from: toDateStr(startDate),
      to: toDateStr(endDate),
    };
  }, [timeRange, customFrom, customTo, anchorDate]);

  const { data: entries, isLoading } = useCardEntries(
    displayCard?._id ?? null,
    {
      from,
      to,
    }
  );

  const chartBasePoints = useMemo(() => {
    if (!selectedCards.length || !displayCard) return [];

    return buildChartPoints({
      card: displayCard,
      entries: entries ?? [],
      labelFormatter: (recordedAt) =>
        recordedAt.toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "short",
        }),
    });
  }, [selectedCards.length, displayCard, entries]);

  const rawValues = useMemo(
    () => chartBasePoints.map((point) => point.rawValue),
    [chartBasePoints]
  );

  const valueRange = useMemo(() => getValueRange(rawValues), [rawValues]);

  const summary = useMemo(
    () =>
      getMetricSummary({
        card: displayCard,
        values: rawValues,
      }),
    [displayCard, rawValues]
  );

  if (!selectedCards.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-subtle bg-surface p-8">
        <p className="text-sm text-muted">
          Karten unten auswählen, um sie im Diagramm anzuzeigen
        </p>
      </div>
    );
  }

  const effectiveTrendActive = trendActive;

  const trendValues = effectiveTrendActive
    ? movingAverage(
        chartBasePoints.map((point) => point.chartValue),
        Math.min(trendWindow, Math.max(1, chartBasePoints.length)),
        metricDefinition.decimals
      )
    : [];

  const chartData = chartBasePoints.map((point, index) => ({
    date: point.date,
    dateISO: point.dateISO,
    value: point.chartValue,
    _real: point.rawValue,
    recordedAt: point.recordedAt,
    trend: effectiveTrendActive ? trendValues[index] : undefined,
  }));

  const selectedDateLabel = selectedDate
    ? chartData.find((d) => d.dateISO === selectedDate)?.date ?? null
    : null;

  const goalDisplayValue =
    displayCard?.goalEnabled && typeof displayCard.goalValue === "number"
      ? getChartGoalValue({
          card: displayCard,
          goalValue: displayCard.goalValue,
          range: {
            min: summary.min,
            max: summary.max,
          },
        })
      : null;

  const validValueCount = rawValues.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v)
  ).length;

  const goalStats =
    displayCard?.goalEnabled && typeof displayCard.goalValue === "number"
      ? summary.goal
      : {
          total: validValueCount,
          reached: 0,
          remaining: validValueCount,
          percent: 0,
        };

  const rangeLabel =
    timeRange === "custom"
      ? `${customFrom} – ${customTo}`
      : `${
          TIME_RANGES.find((r) => r.key === timeRange)?.label
        } bis ${anchorDate.toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
        })}`;

  const trendColorClass =
    summary.trend.performance === "better"
      ? "text-emerald-500"
      : summary.trend.performance === "worse"
      ? "text-rose-500"
      : "text-primary";

  const isPaceMetric = metricDefinition.key === "pace";
  const chartMarginLeft = isPaceMetric ? 0 : 0;
  const yAxisWidth = isPaceMetric ? 76 : 40;

  return (
    <div className="rounded-2xl border border-subtle bg-surface p-5">
      {selectedCards.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {selectedCards.map((card) => {
            const isActive = displayCard?._id === card._id;
            const hex = getCardColor(card);

            return (
              <button
                key={card._id}
                onClick={() => setActiveCardId(card._id)}
                style={
                  isActive
                    ? {
                        borderColor: `${hex}50`,
                        backgroundColor: `${hex}15`,
                        color: hex,
                      }
                    : {}
                }
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? ""
                    : "border-subtle bg-surface-2 text-muted hover:border-strong hover:text-primary"
                }`}
              >
                {stripEmoji(card.label)}
              </button>
            );
          })}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium text-primary">
            {stripEmoji(displayCard?.label ?? "")}
          </h2>
          <p className="text-xs text-muted">
            {displayUnit} · {rangeLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/athlete/analyze"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-subtle bg-surface-2 text-secondary transition-all hover:border-strong hover:text-primary"
            title="Analyse-Dashboard öffnen"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.7}
                d="M3 3v18h18M7 14l3-3 3 2 4-6"
              />
            </svg>
          </Link>

          <div className="flex items-center gap-1 rounded-lg border border-subtle bg-surface-2 p-1">
            {TIME_RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setTimeRange(r.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  timeRange === r.key
                    ? "bg-[#FFD300] text-[#0f0f13]"
                    : "text-muted hover:text-primary"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {timeRange === "custom" && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="themed-date-input rounded-lg border border-subtle bg-surface-2 px-3 py-1.5 text-xs text-primary focus:border-[#FFD300]/50 focus:outline-none"
          />
          <span className="text-xs text-muted">bis</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="themed-date-input rounded-lg border border-subtle bg-surface-2 px-3 py-1.5 text-xs text-primary focus:border-[#FFD300]/50 focus:outline-none"
          />
        </div>
      )}

      {!isLoading && chartData.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setTrendActive((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
              effectiveTrendActive
                ? "border-strong bg-surface-2 text-primary"
                : "border-subtle text-muted hover:border-strong hover:text-primary"
            }`}
          >
            <span
              className="inline-block h-0.5 w-4 rounded-full"
              style={{
                backgroundColor: effectiveTrendActive
                  ? chartUi.trend
                  : chartUi.mutedLine,
              }}
            />
            Trendlinie
          </button>

          {effectiveTrendActive && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted">Glättung</span>
              <div className="flex items-center gap-0.5 rounded-lg border border-subtle bg-surface-2 p-0.5">
                {[3, 5, 7, 14].map((n) => (
                  <button
                    key={n}
                    onClick={() => setTrendWindow(n)}
                    className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-all ${
                      trendWindow === n
                        ? "bg-surface-3 text-primary"
                        : "text-muted hover:text-primary"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div
            className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
            style={{
              borderColor: `${cardColor}40`,
              borderTopColor: cardColor,
            }}
          />
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-48 items-center justify-center">
          <p className="text-sm text-muted">
            Keine Daten im gewählten Zeitraum
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart
            data={chartData}
            margin={{ top: 4, right: 8, bottom: 0, left: chartMarginLeft }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />

            <XAxis
              dataKey="date"
              tick={{ fill: chartUi.tick, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />

            <YAxis
              width={yAxisWidth}
              tick={{ fill: chartUi.tick, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              domain={["dataMin", "dataMax"]}
              tickFormatter={(value) => {
                if (isPaceMetric) {
                  const min = valueRange.min;
                  const max = valueRange.max;

                  if (
                    typeof min === "number" &&
                    typeof max === "number" &&
                    Number.isFinite(min) &&
                    Number.isFinite(max)
                  ) {
                    return formatPaceTick(max + min - Number(value));
                  }
                }

                return String(value);
              }}
            />

            <Tooltip
              content={({ payload, label }) => {
                if (!payload || !payload.length) return null;

                const valueItem = payload.find((p) => p.dataKey === "value");
                const trendItem = payload.find((p) => p.dataKey === "trend");

                return (
                  <div
                    style={{
                      background: chartUi.tooltipBg,
                      border: `1px solid ${chartUi.tooltipBorder}`,
                      borderRadius: "12px",
                      padding: "10px 12px",
                      fontSize: "13px",
                      color: chartUi.tooltipText,
                    }}
                  >
                    <div style={{ marginBottom: 4, opacity: 0.7 }}>{label}</div>

                    {valueItem && (
                      <div style={{ color: cardColor, fontWeight: 500 }}>
                        {formatMetricNumber(
                          valueItem.payload._real,
                          metricDefinition.decimals
                        )}{" "}
                        {displayUnit}
                      </div>
                    )}

                    {trendItem && typeof trendItem.value === "number" && (
                      <div style={{ opacity: 0.7, fontSize: 12 }}>
                        Trend:{" "}
                        {formatMetricNumber(
                          trendItem.value,
                          metricDefinition.decimals
                        )}{" "}
                        {displayUnit}
                      </div>
                    )}
                  </div>
                );
              }}
            />

            {selectedDateLabel && (
              <ReferenceLine
                x={selectedDateLabel}
                stroke={cardColor}
                strokeWidth={2}
                strokeOpacity={0.8}
                strokeDasharray="4 3"
                label={{
                  value: "●",
                  position: "top",
                  fill: cardColor,
                  fontSize: 10,
                }}
              />
            )}

            {displayCard?.goalEnabled &&
              typeof displayCard.goalValue === "number" &&
              typeof goalDisplayValue === "number" && (
                <ReferenceLine
                  y={goalDisplayValue}
                  stroke="#FFD300"
                  strokeWidth={1.5}
                  strokeDasharray="6 3"
                  strokeOpacity={0.9}
                  label={{
                    value: `Ziel: ${formatMetricNumber(
                      displayCard.goalValue,
                      metricDefinition.decimals
                    )} ${displayUnit}`,
                    position: "insideTopRight",
                    fill: "#FFD300",
                    fontSize: 10,
                  }}
                />
              )}

            {(chartType === "bar" || chartType === "mixed") && (
              <Bar
                dataKey="value"
                fill={cardColor}
                fillOpacity={chartType === "mixed" ? 0.3 : 0.75}
                radius={[3, 3, 0, 0]}
                maxBarSize={32}
              />
            )}

            {(chartType === "line" || chartType === "mixed") && (
              <Line
                type="monotone"
                dataKey="value"
                stroke={cardColor}
                strokeWidth={2}
                dot={
                  displayCard?.goalEnabled &&
                  typeof displayCard.goalValue === "number"
                    ? (props: any) => {
                        const { cx, cy, payload } = props;

                        const met = isGoalReached({
                          value: payload?._real,
                          goalValue: displayCard.goalValue,
                          goalMode,
                        });

                        return (
                          <circle
                            key={`dot-${cx}-${cy}`}
                            cx={cx}
                            cy={cy}
                            r={3}
                            fill={met ? "#ffffff" : cardColor}
                          />
                        );
                      }
                    : false
                }
                activeDot={{ r: 5, fill: cardColor }}
              />
            )}

            {effectiveTrendActive && (
              <Line
                type="monotone"
                dataKey="trend"
                stroke={chartUi.trend}
                strokeWidth={1.5}
                dot={false}
                activeDot={false}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {!isLoading && chartData.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-subtle bg-surface-2 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
              Trend
            </p>
            <p className={`mt-1 text-sm font-semibold ${trendColorClass}`}>
              {summary.trend.label}
            </p>
            <p className="mt-1 text-xs text-muted">
              {summary.trend.delta === null
                ? "—"
                : `${summary.trend.delta > 0 ? "+" : ""}${formatMetricNumber(
                    summary.trend.delta,
                    metricDefinition.decimals
                  )} ${displayUnit}`}
            </p>
          </div>

          <div className="rounded-xl border border-subtle bg-surface-2 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
              Einträge
            </p>
            <p className="mt-1 text-sm font-semibold text-primary">
              {validValueCount}
            </p>
            <p className="mt-1 text-xs text-muted">im gewählten Zeitraum</p>
          </div>

          <div className="rounded-xl border border-subtle bg-surface-2 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
              Durchschnitt
            </p>
            <p className="mt-1 text-sm font-semibold text-primary">
              {formatMetricNumber(summary.avg, metricDefinition.decimals) ??
                "—"}
            </p>
            <p className="mt-1 text-xs text-muted">{displayUnit}</p>
          </div>

          <div className="rounded-xl border border-subtle bg-surface-2 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
              {displayCard?.goalEnabled ? "Zielstatus" : "Min / Max"}
            </p>

            {displayCard?.goalEnabled &&
            typeof displayCard.goalValue === "number" ? (
              <>
                <p className="mt-1 text-sm font-semibold text-primary">
                  {goalStats.percent}% erreicht
                </p>
                <p className="mt-1 text-xs text-[#c99700] dark:text-[#FFD300]">
                  Ziel:{" "}
                  {formatMetricNumber(
                    displayCard.goalValue,
                    metricDefinition.decimals
                  )}{" "}
                  {displayUnit}
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm font-semibold text-primary">
                  {formatMetricNumber(summary.min, metricDefinition.decimals) ??
                    "—"}{" "}
                  /{" "}
                  {formatMetricNumber(summary.max, metricDefinition.decimals) ??
                    "—"}
                </p>
                <p className="mt-1 text-xs text-muted">{displayUnit}</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
