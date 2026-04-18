import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  useCoachAthletes,
  useAthleteStats,
  useAthletesActivity,
  useCoachUpdateAthleteCardGoal,
} from "../../hooks/useStats";
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
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link } from "react-router-dom";
import { useChatUnread } from "../../hooks/useChatUnread";
import { useTheme } from "../../hooks/useTheme";
import ThemeToggle from "../../components/layout/ThemeToggle";
import BrandLogo from "../../components/layout/BrandLogo";
import {
  resolveMetricDefinition,
  normalizeMetricEntries,
  resolveGoalMode,
  isGoalReached,
  getTrendForCard,
  formatMetricNumber,
  getChartGoalValue,
  getValueRange,
} from "../../lib/metrics";

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

const TODAY = toDateStr(new Date());

function datumAnzeige(dateStr: string): string {
  const gestern = toDateStr(new Date(Date.now() - 86400000));
  if (dateStr === TODAY) return "Heute";
  if (dateStr === gestern) return "Gestern";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

const ZEITRAEUME = [
  { key: "1T", label: "1T", days: 1 },
  { key: "1W", label: "1W", days: 7 },
  { key: "1M", label: "1M", days: 30 },
  { key: "3M", label: "3M", days: 90 },
  { key: "1J", label: "1J", days: 365 },
  { key: "frei", label: "Frei", days: 0 },
] as const;

interface ZeitraumState {
  key: string;
  offset: number;
  freiVon?: string;
  freiBis?: string;
}

function getInitials(name?: string) {
  if (!name) return "?";

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function berechneVonBis(z: ZeitraumState): { von: string; bis: string } {
  if (z.key === "frei") return { von: z.freiVon ?? "", bis: z.freiBis ?? "" };

  const r = ZEITRAEUME.find((t) => t.key === z.key)!;
  const bisD = new Date(TODAY + "T12:00:00");
  bisD.setDate(bisD.getDate() - z.offset * r.days);

  const vonD = new Date(bisD);
  vonD.setDate(vonD.getDate() - r.days + 1);

  return { von: toDateStr(vonD), bis: toDateStr(bisD) };
}

function zeitraumLabel(z: ZeitraumState): string {
  if (z.key === "frei") return `${z.freiVon ?? "?"} – ${z.freiBis ?? "?"}`;

  const { von, bis } = berechneVonBis(z);
  const fmt = (s: string) =>
    new Date(s + "T12:00:00").toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "short",
    });

  return `${fmt(von)} – ${fmt(bis)}`;
}

const STD_FARBEN: Record<string, string> = {
  heartrate: "rose",
  calories: "orange",
  weight: "blue",
  steps: "green",
  sleep: "purple",
  custom: "yellow",
};

const FARB_OPTIONEN = [
  { key: "rose", hex: "#f43f5e", dot: "bg-rose-400" },
  { key: "orange", hex: "#f97316", dot: "bg-orange-400" },
  { key: "amber", hex: "#f59e0b", dot: "bg-amber-400" },
  { key: "green", hex: "#22c55e", dot: "bg-green-400" },
  { key: "teal", hex: "#14b8a6", dot: "bg-teal-400" },
  { key: "blue", hex: "#3b82f6", dot: "bg-blue-400" },
  { key: "indigo", hex: "#6366f1", dot: "bg-indigo-400" },
  { key: "purple", hex: "#a855f7", dot: "bg-purple-400" },
  { key: "pink", hex: "#ec4899", dot: "bg-pink-400" },
  { key: "yellow", hex: "#FFD300", dot: "bg-[#FFD300]" },
] as const;

function getHex(key: string): string {
  return FARB_OPTIONEN.find((c) => c.key === key)?.hex ?? "#FFD300";
}

function ohneEmoji(label: string): string {
  return label.replace(/^\[[a-z]+\]\s*/u, "").replace(/^\p{Emoji}\s*/u, "");
}

function anzeigeEinheit(unit: string): string {
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

function formatPaceValue(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";

  const totalSeconds = Math.round(value * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}/km`;
}

function formatMetricValue(
  value: number | null | undefined,
  metricKey: string,
  decimals: number,
  unit: string
): string {
  if (metricKey === "pace") {
    return formatPaceValue(value);
  }

  const formatted = formatMetricNumber(value, decimals);
  if (formatted == null) return "—";
  return `${formatted} ${unit}`;
}

function fmtWert(
  value: number | null | undefined,
  metricKey: string,
  decimals = 2
): string {
  if (metricKey === "pace") {
    return formatPaceValue(value);
  }

  const formatted = formatMetricNumber(value, decimals);
  if (formatted == null) return "—";
  return parseFloat(formatted.toString()).toString();
}

function useKartenPrefs(cardId: string, defaultColor: string) {
  const sk = `coach_card_prefs_${cardId}`;

  const load = () => {
    try {
      const s = localStorage.getItem(sk);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  };

  const saved = load();
  const [farbKey, setFarbKeyState] = useState<string>(
    saved?.farbKey ?? defaultColor
  );
  const [chartTyp, setChartTypState] = useState<string>(
    saved?.chartTyp ?? "line"
  );

  const save = (n: { farbKey: string; chartTyp: string }) => {
    try {
      localStorage.setItem(sk, JSON.stringify(n));
    } catch {}
  };

  const setFarbKey = (v: string) => {
    setFarbKeyState(v);
    save({ farbKey: v, chartTyp });
  };

  const setChartTyp = (v: string) => {
    setChartTypState(v);
    save({ farbKey, chartTyp: v });
  };

  return {
    farbKey,
    setFarbKey,
    chartTyp,
    setChartTyp,
  };
}

function buildDayWindow(
  windowOffset: number
): { datumStr: string; tag: number; wochentag: string }[] {
  const tage = [];
  for (let i = windowOffset - 7; i <= windowOffset; i++) {
    const d = new Date(TODAY + "T12:00:00");
    d.setDate(d.getDate() + i);
    tage.push({
      datumStr: toDateStr(d),
      tag: d.getDate(),
      wochentag: d
        .toLocaleDateString("de-DE", { weekday: "short" })
        .slice(0, 2),
    });
  }
  return tage;
}

function AthletKarte({
  athleteId,
  card,
  entries,
  ausgewaehltesdatum,
  von,
  bis,
}: {
  athleteId: string;
  card: any;
  entries: any[];
  ausgewaehltesdatum: string;
  von: string;
  bis: string;
}) {
  const { resolvedTheme } = useTheme();
  const updateGoal = useCoachUpdateAthleteCardGoal();

  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [editGoalEnabled, setEditGoalEnabled] = useState(
    Boolean(card.goalEnabled)
  );
  const [editGoalValue, setEditGoalValue] = useState(
    typeof card.goalValue === "number" ? String(card.goalValue) : ""
  );
  const [editGoalDirection, setEditGoalDirection] = useState<
    "lose" | "gain" | "min" | "max"
  >((card.goalDirection as any) ?? (card.unit === "kg" ? "lose" : "min"));

  const stdFarb = card.color ?? STD_FARBEN[card.type] ?? "yellow";
  const { farbKey, setFarbKey, chartTyp, setChartTyp } = useKartenPrefs(
    card._id,
    stdFarb
  );

  const [zeigeFarbwahl, setZeigeFarbwahl] = useState(false);

  const farbe = getHex(farbKey);
  const einheit = anzeigeEinheit(card.unit);

  const metricDefinition = useMemo(() => resolveMetricDefinition(card), [card]);
  const isPaceMetric = metricDefinition.key === "pace";
  const yAxisWidth = isPaceMetric ? 76 : 40;
  const goalMode = useMemo(() => resolveGoalMode(card), [card]);

  const istGewicht = card.unit === "kg";
  const zielAktiv = Boolean(card.goalEnabled);
  const zielWert = typeof card.goalValue === "number" ? card.goalValue : null;

  const chartUi = useMemo(() => {
    if (resolvedTheme === "dark") {
      return {
        grid: "rgba(255,255,255,0.04)",
        tick: "#475569",
        tooltipBg: "#1e1e2e",
        tooltipText: "#e2e8f0",
      };
    }

    return {
      grid: "rgba(15,23,42,0.08)",
      tick: "#6b7280",
      tooltipBg: "#ffffff",
      tooltipText: "#111827",
    };
  }, [resolvedTheme]);

  const normalizedEntries = useMemo(
    () => normalizeMetricEntries(card, entries ?? []),
    [card, entries]
  );

  const chartDaten = useMemo(() => {
    return normalizedEntries.map((entry, index) => {
      const original = entries?.[index];
      const recordedAt = original?.recordedAt
        ? new Date(original.recordedAt)
        : null;
      const isValidDate =
        recordedAt instanceof Date && !Number.isNaN(recordedAt.getTime());

      return {
        datum: isValidDate
          ? recordedAt.toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "short",
            })
          : "—",
        datumISO: isValidDate ? toDateStr(recordedAt) : "",
        wert: entry.rawValue,
        _echt: entry.rawValue,
      };
    });
  }, [entries, normalizedEntries]);

  const rawValues = useMemo(() => chartDaten.map((d) => d._echt), [chartDaten]);

  const range = useMemo(() => getValueRange(rawValues), [rawValues]);

  const anzeigeDaten = useMemo(() => {
    if (!isPaceMetric) return chartDaten;

    const min = range.min;
    const max = range.max;

    if (
      typeof min !== "number" ||
      typeof max !== "number" ||
      !Number.isFinite(min) ||
      !Number.isFinite(max)
    ) {
      return chartDaten;
    }

    return chartDaten.map((d) => ({
      ...d,
      wert:
        typeof d.wert === "number"
          ? Number((max + min - d.wert).toFixed(metricDefinition.decimals))
          : null,
    }));
  }, [
    chartDaten,
    isPaceMetric,
    range.min,
    range.max,
    metricDefinition.decimals,
  ]);

  const tagesEintragIndex = entries.findIndex(
    (e: any) => toDateStr(new Date(e.recordedAt)) === ausgewaehltesdatum
  );

  const tagesWert =
    tagesEintragIndex >= 0
      ? normalizedEntries[tagesEintragIndex]?.displayValue ?? null
      : null;

  const letzterW = chartDaten[chartDaten.length - 1]?._echt ?? null;
  const ersterW = chartDaten[0]?._echt ?? null;

  const trend = getTrendForCard({
    card,
    first: ersterW,
    last: letzterW,
  });

  const trendFarbe =
    trend.performance === "better"
      ? "text-green-500 dark:text-green-400"
      : trend.performance === "worse"
      ? "text-red-500 dark:text-red-400"
      : "text-muted";

  const refLabel = anzeigeDaten.find(
    (d) => d.datumISO === ausgewaehltesdatum
  )?.datum;

  const zielAnzeigeWert =
    zielAktiv && typeof zielWert === "number"
      ? getChartGoalValue({
          card,
          goalValue: zielWert,
          range,
        })
      : null;

  const yDomain: [string, string] = ["dataMin", "dataMax"];

  return (
    <div
      className="relative rounded-2xl border bg-surface p-5"
      style={{ borderColor: `${farbe}25` }}
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-primary">
            {ohneEmoji(card.label)}
          </p>
          <p className="text-xs text-muted">{einheit}</p>
        </div>

        <div className="text-right">
          <p className="font-semibold" style={{ color: farbe }}>
            {tagesWert != null
              ? fmtWert(
                  tagesWert,
                  metricDefinition.key,
                  metricDefinition.decimals
                )
              : chartDaten[chartDaten.length - 1]?._echt != null
              ? fmtWert(
                  chartDaten[chartDaten.length - 1]._echt,
                  metricDefinition.key,
                  metricDefinition.decimals
                )
              : "—"}
          </p>

          {tagesWert != null && ausgewaehltesdatum !== TODAY && (
            <p className="text-[10px] text-muted">
              {datumAnzeige(ausgewaehltesdatum)}
            </p>
          )}

          {trend.delta !== null && trend.delta !== 0 && (
            <p className={`text-xs ${trendFarbe}`}>
              {trend.delta > 0 ? "+" : ""}
              {fmtWert(
                Math.abs(trend.delta),
                metricDefinition.key,
                metricDefinition.decimals
              )}{" "}
              gesamt
            </p>
          )}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-0.5 rounded-lg border border-subtle bg-surface-2 p-0.5">
          {(["line", "bar", "mixed"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setChartTyp(t)}
              className="rounded-md px-2 py-1 text-[10px] font-medium transition-all"
              style={
                chartTyp === t
                  ? { backgroundColor: farbe, color: "#0f0f13" }
                  : { color: resolvedTheme === "dark" ? "#94a3b8" : "#6b7280" }
              }
            >
              {t === "line" ? "〰" : t === "bar" ? "▮" : "▮〰"}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setEditGoalEnabled(Boolean(card.goalEnabled));
            setEditGoalValue(
              typeof card.goalValue === "number" ? String(card.goalValue) : ""
            );
            setEditGoalDirection(
              (card.goalDirection as any) ?? (istGewicht ? "lose" : "min")
            );
            setShowGoalEdit(true);
          }}
          className="rounded-lg border border-subtle bg-surface-2 px-2.5 py-1 text-[10px] font-medium text-secondary transition-all hover:border-strong hover:text-primary"
        >
          {zielAktiv && typeof zielWert === "number"
            ? "Ziel bearbeiten"
            : "Ziel erstellen"}
        </button>

        <button
          onClick={() => setZeigeFarbwahl((v) => !v)}
          className="ml-auto flex items-center gap-1 rounded-lg border border-subtle px-2 py-1 transition-all hover:border-strong"
        >
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: farbe }}
          />
          <svg
            className="h-3 w-3 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {zeigeFarbwahl && (
        <div className="mb-3 grid grid-cols-10 gap-1 rounded-xl border border-subtle bg-surface-2 p-2">
          {FARB_OPTIONEN.map((c) => (
            <button
              key={c.key}
              onClick={() => {
                setFarbKey(c.key);
                setZeigeFarbwahl(false);
              }}
              className={`flex h-7 items-center justify-center rounded-lg border transition-all ${
                farbKey === c.key
                  ? "border-strong bg-surface-3"
                  : "border-transparent hover:border-subtle"
              }`}
            >
              <span className={`h-3.5 w-3.5 rounded-full ${c.dot}`} />
            </button>
          ))}
        </div>
      )}

      {chartDaten.length === 0 ? (
        <div className="flex h-[120px] items-center justify-center">
          <p className="text-xs text-muted">Keine Daten im Zeitraum</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={120}>
          <ComposedChart
            data={anzeigeDaten}
            margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={chartUi.grid} />

            <XAxis
              dataKey="datum"
              tick={{ fill: chartUi.tick, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />

            <YAxis
              width={yAxisWidth}
              tick={{ fill: chartUi.tick, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              domain={yDomain}
              tickFormatter={(value) => {
                if (isPaceMetric) {
                  const min = range.min;
                  const max = range.max;

                  if (
                    typeof min === "number" &&
                    typeof max === "number" &&
                    Number.isFinite(min) &&
                    Number.isFinite(max)
                  ) {
                    return formatPaceValue(max + min - Number(value));
                  }
                }

                return String(value);
              }}
            />

            <Tooltip
              contentStyle={{
                background: chartUi.tooltipBg,
                border: `1px solid ${farbe}30`,
                borderRadius: "10px",
                color: chartUi.tooltipText,
                fontSize: "12px",
              }}
              formatter={(_v: any, _n: any, props: any) => [
                <span style={{ color: farbe }}>
                  {formatMetricValue(
                    props.payload._echt,
                    metricDefinition.key,
                    metricDefinition.decimals,
                    einheit
                  )}
                </span>,
                ohneEmoji(card.label),
              ]}
            />

            {zielAktiv && typeof zielAnzeigeWert === "number" && (
              <ReferenceLine
                y={zielAnzeigeWert}
                stroke="#FFD300"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                strokeOpacity={0.9}
              />
            )}

            {refLabel && (
              <ReferenceLine
                x={refLabel}
                stroke={farbe}
                strokeWidth={1.5}
                strokeOpacity={0.7}
                strokeDasharray="4 3"
              />
            )}

            {(chartTyp === "bar" || chartTyp === "mixed") && (
              <Bar
                dataKey="wert"
                fill={farbe}
                fillOpacity={chartTyp === "mixed" ? 0.3 : 0.75}
                radius={[2, 2, 0, 0]}
                maxBarSize={20}
              />
            )}

            {(chartTyp === "line" || chartTyp === "mixed") && (
              <Line
                type="monotone"
                dataKey="wert"
                stroke={farbe}
                strokeWidth={1.5}
                dot={
                  zielAktiv && typeof zielWert === "number"
                    ? (props: any) => {
                        const { cx, cy, payload } = props;
                        const met = isGoalReached({
                          value: payload?._echt,
                          goalValue: zielWert,
                          goalMode,
                        });

                        return (
                          <circle
                            key={`dot-${cx}-${cy}`}
                            cx={cx}
                            cy={cy}
                            r={3}
                            fill={met ? "#ffffff" : farbe}
                          />
                        );
                      }
                    : false
                }
                activeDot={{ r: 4, fill: farbe }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {showGoalEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-subtle bg-surface p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-semibold text-primary">
                {zielAktiv ? "Ziel bearbeiten" : "Ziel erstellen"}
              </h3>
              <button
                onClick={() => setShowGoalEdit(false)}
                className="text-xl leading-none text-muted transition hover:text-primary"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 rounded-xl border border-subtle bg-surface-2 p-3">
              <label className="flex items-center gap-2 text-sm text-primary">
                <input
                  type="checkbox"
                  checked={editGoalEnabled}
                  onChange={(e) => setEditGoalEnabled(e.target.checked)}
                />
                Ziel aktivieren
              </label>

              {editGoalEnabled && (
                <>
                  <input
                    type="number"
                    value={editGoalValue}
                    onChange={(e) => setEditGoalValue(e.target.value)}
                    placeholder={`Zielwert in ${einheit}`}
                    step="0.1"
                    className="w-full rounded-xl border border-subtle bg-surface px-4 py-2.5 text-sm text-primary focus:border-[#FFD300]/50 focus:outline-none"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    {(istGewicht
                      ? [
                          { key: "lose", label: "📉 Abnehmen" },
                          { key: "gain", label: "📈 Zunehmen" },
                        ]
                      : [
                          { key: "min", label: "⬆ Mindestziel" },
                          { key: "max", label: "⬇ Obergrenze" },
                        ]
                    ).map((option) => (
                      <button
                        key={option.key}
                        onClick={() => setEditGoalDirection(option.key as any)}
                        className={`rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                          editGoalDirection === option.key
                            ? "border-[#FFD300]/50 bg-[#FFD300]/10 text-[#FFD300]"
                            : "border-subtle bg-surface text-muted hover:border-strong hover:text-primary"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowGoalEdit(false)}
                className="flex-1 rounded-xl border border-subtle bg-surface-2 py-2.5 text-sm font-medium text-secondary transition-colors hover:border-strong hover:text-primary"
              >
                Abbrechen
              </button>

              <button
                onClick={() => {
                  const parsedGoalValue =
                    editGoalEnabled && editGoalValue.trim() !== ""
                      ? parseFloat(editGoalValue)
                      : null;

                  updateGoal.mutate(
                    {
                      athleteId,
                      cardId: card._id,
                      goalEnabled: editGoalEnabled,
                      goalValue: editGoalEnabled ? parsedGoalValue : undefined,
                      goalDirection: editGoalEnabled
                        ? editGoalDirection
                        : undefined,
                      from: von,
                      to: bis,
                    },
                    {
                      onSuccess: () => setShowGoalEdit(false),
                    }
                  );
                }}
                disabled={
                  updateGoal.isPending ||
                  (editGoalEnabled &&
                    (!editGoalValue.trim() ||
                      Number.isNaN(parseFloat(editGoalValue))))
                }
                className="flex-1 rounded-xl bg-[#FFD300] py-2.5 text-sm font-medium text-[#0f0f13] transition-colors hover:bg-[#e6be00] disabled:opacity-40"
              >
                {updateGoal.isPending ? "Speichern…" : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SortierbarKarte({
  athleteId,
  card,
  entries,
  ausgewaehltesdatum,
  von,
  bis,
}: {
  athleteId: string;
  card: any;
  entries: any[];
  ausgewaehltesdatum: string;
  von: string;
  bis: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card._id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-0" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="absolute inset-0 z-10 rounded-2xl ring-2 ring-[#FFD300]/40 ring-dashed pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="flex items-center gap-1.5 rounded-lg bg-black/60 px-2 py-1">
          <svg
            className="h-3 w-3 text-[#FFD300]"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M7 4a1 1 0 100 2 1 1 0 000-2zM7 9a1 1 0 100 2 1 1 0 000-2zM7 14a1 1 0 100 2 1 1 0 000-2zM13 4a1 1 0 100 2 1 1 0 000-2zM13 9a1 1 0 100 2 1 1 0 000-2zM13 14a1 1 0 100 2 1 1 0 000-2z" />
          </svg>
          <span className="text-[10px] font-medium text-[#FFD300]">Ziehen</span>
        </div>
      </div>

      <div className="pointer-events-none opacity-60">
        <AthletKarte
          athleteId={athleteId}
          card={card}
          entries={entries}
          ausgewaehltesdatum={ausgewaehltesdatum}
          von={von}
          bis={bis}
        />
      </div>
    </div>
  );
}

export default function CoachDashboard() {
  const { user, logout } = useAuth();
  const { data: relations = [], isLoading } = useCoachAthletes(user?._id);
  const { totalUnread } = useChatUnread();

  const [ausgewaehltAthleteId, setAusgewaehltAthleteId] = useState<
    string | null
  >(null);
  const [anordneModus, setAnordneModus] = useState(false);
  const [kartenReihenfolge, setKartenReihenfolge] = useState<string[]>([]);

  const [ausgewaehltesDate, setAusgewaehltesDate] = useState<string>(TODAY);
  const [fensterOffset, setFensterOffset] = useState<number>(0);

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const istHeute = ausgewaehltesDate === TODAY;
  const tagesFenster = useMemo(
    () => buildDayWindow(fensterOffset),
    [fensterOffset]
  );

  const [zeitraum, setZeitraum] = useState<ZeitraumState>({
    key: "1M",
    offset: 0,
  });
  const [freiVon, setFreiVon] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return toDateStr(d);
  });
  const [freiBis, setFreiBis] = useState(TODAY);

  const { von, bis } = useMemo(() => {
    if (zeitraum.key === "frei") return { von: freiVon, bis: freiBis };
    const { von: v, bis: b } = berechneVonBis(zeitraum);
    return { von: v, bis: b };
  }, [zeitraum, freiVon, freiBis]);

  const { data: athletData } = useAthleteStats(ausgewaehltAthleteId, {
    from: von,
    to: bis,
  });

  const athleteStats = useMemo(() => athletData?.stats ?? [], [athletData]);

  const { data: aktivitaetDaten = [] } = useAthletesActivity({
    from: von,
    to: bis,
  });

  const aktivitaetMap = useMemo(() => {
    const m: Record<string, boolean> = {};
    aktivitaetDaten.forEach((a) => {
      m[a.athleteId] = a.isActive;
    });
    return m;
  }, [aktivitaetDaten]);

  const safeRelations = useMemo(
    () =>
      relations.filter(
        (r: any) =>
          r &&
          r._id &&
          r.athleteId &&
          typeof r.athleteId === "object" &&
          r.athleteId._id &&
          r.athleteId.name
      ),
    [relations]
  );

  const ausgewaehltRelation =
    safeRelations.find((r: any) => r.athleteId._id === ausgewaehltAthleteId) ??
    null;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    }

    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileMenu]);

  useEffect(() => {
    if (!ausgewaehltAthleteId) {
      setKartenReihenfolge([]);
      return;
    }

    const normalized = Array.isArray(athleteStats)
      ? athleteStats.filter((s: any) => s?.card?._id)
      : [];

    if (normalized.length === 0) return;

    const sk = `coach_order_${ausgewaehltAthleteId}`;
    try {
      const saved = localStorage.getItem(sk);
      if (saved) {
        const savedIds: string[] = JSON.parse(saved);
        setKartenReihenfolge(savedIds);
      } else {
        setKartenReihenfolge(normalized.map((s: any) => s.card._id));
      }
    } catch {
      setKartenReihenfolge(normalized.map((s: any) => s.card._id));
    }
  }, [ausgewaehltAthleteId, athleteStats]);

  const sortiertStats = useMemo(() => {
    const normalized = Array.isArray(athleteStats)
      ? athleteStats.filter((s: any) => s?.card?._id)
      : [];

    if (kartenReihenfolge.length === 0) return normalized;

    return [...normalized].sort((a, b) => {
      const ai = kartenReihenfolge.indexOf(a.card._id);
      const bi = kartenReihenfolge.indexOf(b.card._id);
      return (ai === -1 ? 9999 : ai) - (bi === -1 ? 9999 : bi);
    });
  }, [athleteStats, kartenReihenfolge]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    })
  );

  const datumWaehlen = (ds: string) => {
    setAusgewaehltesDate(ds);
    const diff = Math.round(
      (new Date(ds + "T12:00:00").getTime() -
        new Date(TODAY + "T12:00:00").getTime()) /
        86400000
    );
    setFensterOffset(Math.min(diff, 0));
  };

  const vorherigerTag = () => {
    const d = new Date(ausgewaehltesDate + "T12:00:00");
    d.setDate(d.getDate() - 1);
    const nd = toDateStr(d);
    setAusgewaehltesDate(nd);

    if (!tagesFenster.find((t) => t.datumStr === nd)) {
      setFensterOffset((o) => o - 1);
    }
  };

  const naechsterTag = () => {
    if (istHeute) return;

    const d = new Date(ausgewaehltesDate + "T12:00:00");
    d.setDate(d.getDate() + 1);
    const nd = toDateStr(d);

    if (nd <= TODAY) {
      setAusgewaehltesDate(nd);

      if (!tagesFenster.find((t) => t.datumStr === nd)) {
        setFensterOffset((o) => Math.min(o + 1, 0));
      }
    }
  };

  const kannVorwaerts = zeitraum.key !== "frei" && zeitraum.offset > 0;

  const zeitraumVerschieben = (richtung: -1 | 1) => {
    setZeitraum((z) => ({ ...z, offset: Math.max(0, z.offset - richtung) }));
  };

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-subtle px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <BrandLogo imageClassName="h-8 w-auto" />
          <span className="rounded-full border border-[#FFD300]/20 bg-[#FFD300]/10 px-2 py-0.5 text-xs text-[#FFD300]">
            Coach
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/chat"
            className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-subtle bg-surface transition-all hover:border-strong hover:bg-surface-2"
            title="Nachrichten"
          >
            <svg
              className="h-5 w-5 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.7}
                d="M8 10h8M8 14h5m-6 6l-3-3V7a3 3 0 013-3h12a3 3 0 013 3v7a3 3 0 01-3 3h-8l-4 3z"
              />
            </svg>

            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FFD300] px-1.5 text-[10px] font-extrabold text-[#0f0f13] shadow-lg">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </Link>

          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu((v) => !v)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-subtle bg-surface transition-all hover:border-strong hover:bg-surface-2"
              title="Profilmenü"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFD300] text-sm font-bold text-[#0f0f13]">
                {getInitials(user?.name)}
              </div>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-subtle bg-surface shadow-2xl shadow-black/30">
                <div className="border-b border-subtle px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFD300] text-sm font-bold text-[#0f0f13]">
                      {getInitials(user?.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-primary">
                        {user?.name}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <div className="flex items-center justify-between rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-3 text-sm text-secondary">
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
                          d="M12 3v1m0 16v1m8.66-10h-1M4.34 12h-1m15.02 6.02l-.7-.7M6.34 6.34l-.7-.7m12.02 0l-.7.7M6.34 17.66l-.7.7M12 7a5 5 0 100 10 5 5 0 000-10z"
                        />
                      </svg>
                      Design
                    </div>

                    <ThemeToggle />
                  </div>

                  <div className="my-2 h-px bg-[var(--border-subtle)]" />

                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-rose-500 transition-all hover:bg-rose-500/10"
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
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1"
                      />
                    </svg>
                    Abmelden
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Athleten</h1>
          <p className="mt-1 text-sm text-muted">
            Fortschritt deiner Athleten im Blick
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => zeitraumVerschieben(-1)}
            disabled={zeitraum.key === "frei"}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-subtle bg-surface-2 text-sm text-secondary transition-all hover:border-strong hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
          >
            ←
          </button>

          <div className="flex items-center gap-1 rounded-lg border border-subtle bg-surface-2 p-1">
            {ZEITRAEUME.map((z) => (
              <button
                key={z.key}
                onClick={() => {
                  setZeitraum({ key: z.key, offset: 0 });
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  zeitraum.key === z.key
                    ? "bg-[#FFD300] text-[#0f0f13]"
                    : "text-muted hover:text-primary"
                }`}
              >
                {z.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => zeitraumVerschieben(1)}
            disabled={!kannVorwaerts}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-subtle bg-surface-2 text-sm text-secondary transition-all hover:border-strong hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
          >
            →
          </button>

          {zeitraum.key !== "frei" && (
            <span className="ml-1 text-xs text-muted">
              {zeitraumLabel(zeitraum)}
            </span>
          )}
        </div>

        {zeitraum.key === "frei" && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={freiVon}
              onChange={(e) => setFreiVon(e.target.value)}
              className="rounded-lg border border-subtle bg-surface-2 px-3 py-1.5 text-xs text-primary focus:border-[#FFD300]/50 focus:outline-none"
            />
            <span className="text-xs text-muted">bis</span>
            <input
              type="date"
              value={freiBis}
              onChange={(e) => setFreiBis(e.target.value)}
              className="rounded-lg border border-subtle bg-surface-2 px-3 py-1.5 text-xs text-primary focus:border-[#FFD300]/50 focus:outline-none"
            />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl border border-subtle bg-surface-2"
              />
            ))}
          </div>
        ) : safeRelations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-subtle bg-surface p-12 text-center">
            <p className="text-sm text-secondary">
              Noch keine Athleten verknüpft
            </p>
            <p className="mt-1 text-xs text-muted">
              Athleten müssen dir Zugriff über ihr Dashboard gewähren
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {safeRelations.map((rel: any) => {
              const aid = rel.athleteId._id;
              const aktiv = aktivitaetMap[aid];
              const gewaehlt = ausgewaehltAthleteId === aid;

              return (
                <button
                  key={rel._id}
                  onClick={() =>
                    setAusgewaehltAthleteId((prev) =>
                      prev === aid ? null : aid
                    )
                  }
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    gewaehlt
                      ? "border-[#FFD300]/50 bg-[#FFD300]/5"
                      : "border-subtle bg-surface hover:bg-surface-2"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#FFD300]/20 bg-[#FFD300]/10 text-sm font-semibold text-[#FFD300]">
                        {rel.athleteId.name.charAt(0).toUpperCase()}
                      </div>

                      {aktiv !== undefined && (
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--bg-app)] ${
                            aktiv ? "bg-green-400" : "bg-red-400"
                          }`}
                        />
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-primary">
                        {rel.athleteId.name}
                      </p>
                      <p
                        className={`text-xs ${
                          aktiv === true
                            ? "text-green-500 dark:text-green-400"
                            : aktiv === false
                            ? "text-red-500 dark:text-red-400"
                            : "text-muted"
                        }`}
                      >
                        {aktiv === true
                          ? "Aktiv im Zeitraum"
                          : aktiv === false
                          ? "Inaktiv im Zeitraum"
                          : `${
                              rel.allowedMetrics?.length ?? 0
                            } Metriken geteilt`}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {ausgewaehltAthleteId && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium text-primary">
                {ausgewaehltRelation?.athleteId?.name}&apos;s Fortschritt
                <span className="ml-2 text-sm font-normal text-muted">
                  · {zeitraumLabel(zeitraum)}
                </span>
              </h2>

              <div className="flex items-center gap-2">
                <Link
                  to={`/coach/athlete/${ausgewaehltAthleteId}/analyze`}
                  className="flex items-center gap-1.5 rounded-xl border border-subtle bg-surface px-3 py-1.5 text-xs font-medium text-secondary transition-all hover:border-strong hover:text-primary"
                  title="Große Analyse öffnen"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.7}
                      d="M3 3h18v18H3V3zm4 12l3-3 2 2 5-5"
                    />
                  </svg>
                  Analyze
                </Link>

                {sortiertStats.length > 1 && (
                  <button
                    onClick={() => setAnordneModus((v) => !v)}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                      anordneModus
                        ? "border-[#FFD300]/40 bg-[#FFD300]/10 text-[#FFD300]"
                        : "border-subtle bg-surface text-secondary hover:border-strong hover:text-primary"
                    }`}
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                    {anordneModus ? "Fertig" : "Karten anordnen"}
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-subtle bg-surface p-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={vorherigerTag}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-subtle bg-surface-2 text-sm text-secondary transition-all hover:border-strong hover:text-primary"
                >
                  ←
                </button>

                <div className="flex flex-1 flex-col gap-1">
                  <p className="px-1 text-[10px] font-medium text-muted">
                    {new Date(
                      tagesFenster[0].datumStr + "T12:00:00"
                    ).toLocaleDateString("de-DE", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>

                  <div className="flex gap-1">
                    {tagesFenster.map(({ datumStr, tag, wochentag }) => {
                      const isSel = datumStr === ausgewaehltesDate;
                      const isT = datumStr === TODAY;
                      const isFuture = datumStr > TODAY;
                      const d = new Date(datumStr + "T12:00:00");
                      const showMonth = d.getDate() === 1;

                      return (
                        <button
                          key={datumStr}
                          onClick={() => !isFuture && datumWaehlen(datumStr)}
                          disabled={isFuture}
                          className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg border py-1.5 transition-all ${
                            isSel
                              ? "border-[#FFD300]/40 bg-[#FFD300]/12"
                              : isT
                              ? "border-subtle bg-surface-2 hover:border-strong"
                              : isFuture
                              ? "cursor-not-allowed border-transparent opacity-20"
                              : "border-transparent hover:border-subtle hover:bg-surface-2"
                          }`}
                        >
                          <span
                            className={`text-[9px] font-medium uppercase tracking-wide ${
                              isSel
                                ? "text-[#FFD300]"
                                : isT
                                ? "text-secondary"
                                : "text-muted"
                            }`}
                          >
                            {wochentag}
                          </span>

                          <span
                            className={`text-xs font-semibold leading-none ${
                              isSel
                                ? "text-[#FFD300]"
                                : isT
                                ? "text-primary"
                                : "text-secondary"
                            }`}
                          >
                            {tag}
                          </span>

                          {showMonth && (
                            <span className="mt-0.5 text-[8px] leading-none text-muted">
                              {d.toLocaleDateString("de-DE", {
                                month: "short",
                              })}
                            </span>
                          )}

                          {isT && !isSel && !showMonth && (
                            <span className="mt-0.5 h-1 w-1 rounded-full bg-[#FFD300]/50" />
                          )}

                          {isSel && !showMonth && (
                            <span className="mt-0.5 h-1 w-1 rounded-full bg-[#FFD300]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={naechsterTag}
                  disabled={istHeute}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-subtle bg-surface-2 text-sm text-secondary transition-all hover:border-strong hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                >
                  →
                </button>
              </div>
            </div>

            {sortiertStats.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-subtle bg-surface p-8 text-center">
                <p className="text-sm text-muted">Keine geteilten Metriken</p>
              </div>
            ) : anordneModus ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => {
                  const { active, over } = event;
                  if (!over || active.id === over.id) return;

                  const ids = sortiertStats.map((s: any) => s.card._id);
                  const oi = ids.indexOf(active.id as string);
                  const ni = ids.indexOf(over.id as string);
                  const neueIds = arrayMove(ids, oi, ni);

                  setKartenReihenfolge(neueIds);
                  localStorage.setItem(
                    `coach_order_${ausgewaehltAthleteId}`,
                    JSON.stringify(neueIds)
                  );
                }}
              >
                <SortableContext
                  items={sortiertStats.map((s: any) => s.card._id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    {sortiertStats.map(({ card, entries }: any) => (
                      <SortierbarKarte
                        key={card._id}
                        athleteId={ausgewaehltAthleteId!}
                        card={card}
                        entries={entries}
                        ausgewaehltesdatum={ausgewaehltesDate}
                        von={von}
                        bis={bis}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {sortiertStats.map(({ card, entries }: any) => (
                  <AthletKarte
                    key={card._id}
                    athleteId={ausgewaehltAthleteId!}
                    card={card}
                    entries={entries}
                    ausgewaehltesdatum={ausgewaehltesDate}
                    von={von}
                    bis={bis}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
