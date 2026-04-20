import { useState } from "react";
import {
  IoAlarmOutline,
  IoAmericanFootballOutline,
  IoBandageOutline,
  IoBarbellOutline,
  IoBasketballOutline,
  IoBedOutline,
  IoBeerOutline,
  IoBicycleOutline,
  IoBoatOutline,
  IoBodyOutline,
  IoBonfireOutline,
  IoBuildOutline,
  IoCloseOutline,
  IoCompassOutline,
  IoCreateOutline,
  IoDiceOutline,
  IoEarthOutline,
  IoEyedropOutline,
  IoFishOutline,
  IoFitnessOutline,
  IoFlagOutline,
  IoFlameOutline,
  IoFlashOutline,
  IoFlowerOutline,
  IoFootballOutline,
  IoFootstepsOutline,
  IoGameControllerOutline,
  IoGlobeOutline,
  IoGolfOutline,
  IoGridOutline,
  IoHeartOutline,
  IoIceCreamOutline,
  IoInfiniteOutline,
  IoLeafOutline,
  IoLocationOutline,
  IoMapOutline,
  IoMedalOutline,
  IoMedicalOutline,
  IoMoonOutline,
  IoNutritionOutline,
  IoPawOutline,
  IoPulseOutline,
  IoRibbonOutline,
  IoRocketOutline,
  IoRoseOutline,
  IoScaleOutline,
  IoSnowOutline,
  IoSpeedometerOutline,
  IoStarOutline,
  IoStopwatchOutline,
  IoSunnyOutline,
  IoTennisballOutline,
  IoThermometerOutline,
  IoThumbsDownOutline,
  IoThumbsUpOutline,
  IoTimerOutline,
  IoTrendingDownOutline,
  IoTrendingUpOutline,
  IoTrophyOutline,
  IoWalkOutline,
  IoWaterOutline,
  IoPencilOutline,
  IoCheckmarkOutline,
  IoTrashOutline,
} from "react-icons/io5";
import type { ComponentType } from "react";
import {
  useUpdateWeight,
  useRemoveCard,
  useLogEntry,
  useEditCard,
} from "../../hooks/useStats";
import CustomCardTable from "./CustomCardTable";

const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  walk: IoWalkOutline,
  bicycle: IoBicycleOutline,
  barbell: IoBarbellOutline,
  fitness: IoFitnessOutline,
  football: IoFootballOutline,
  basketball: IoBasketballOutline,
  tennisball: IoTennisballOutline,
  americanfb: IoAmericanFootballOutline,
  golf: IoGolfOutline,
  boat: IoBoatOutline,
  stopwatch: IoStopwatchOutline,
  timer: IoTimerOutline,
  compass: IoCompassOutline,
  flag: IoFlagOutline,
  trophy: IoTrophyOutline,
  medal: IoMedalOutline,
  ribbon: IoRibbonOutline,
  heart: IoHeartOutline,
  pulse: IoPulseOutline,
  body: IoBodyOutline,
  footsteps: IoFootstepsOutline,
  bandage: IoBandageOutline,
  medical: IoMedicalOutline,
  nutrition: IoNutritionOutline,
  scale: IoScaleOutline,
  thermometer: IoThermometerOutline,
  eyedrop: IoEyedropOutline,
  flame: IoFlameOutline,
  moon: IoMoonOutline,
  bed: IoBedOutline,
  water: IoWaterOutline,
  leaf: IoLeafOutline,
  flower: IoFlowerOutline,
  sun: IoSunnyOutline,
  snow: IoSnowOutline,
  earth: IoEarthOutline,
  bonfire: IoBonfireOutline,
  trending: IoTrendingUpOutline,
  trenddown: IoTrendingDownOutline,
  speedo: IoSpeedometerOutline,
  star: IoStarOutline,
  flash: IoFlashOutline,
  rocket: IoRocketOutline,
  infinite: IoInfiniteOutline,
  alarm: IoAlarmOutline,
  thumbup: IoThumbsUpOutline,
  thumbdown: IoThumbsDownOutline,
  grid: IoGridOutline,
  map: IoMapOutline,
  globe: IoGlobeOutline,
  location: IoLocationOutline,
  create: IoCreateOutline,
  build: IoBuildOutline,
  paw: IoPawOutline,
  fish: IoFishOutline,
  rose: IoRoseOutline,
  dice: IoDiceOutline,
  game: IoGameControllerOutline,
  beer: IoBeerOutline,
  icecream: IoIceCreamOutline,
  heartrate: IoHeartOutline,
  calories: IoFlameOutline,
  weight: IoScaleOutline,
  steps: IoFootstepsOutline,
  sleep: IoMoonOutline,
  custom: IoGridOutline,
};

const ICON_LIST: {
  key: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
}[] = [
  { key: "walk", label: "Gehen", Icon: IoWalkOutline },
  { key: "bicycle", label: "Fahrrad", Icon: IoBicycleOutline },
  { key: "barbell", label: "Gewichte", Icon: IoBarbellOutline },
  { key: "fitness", label: "Fitness", Icon: IoFitnessOutline },
  { key: "football", label: "Fußball", Icon: IoFootballOutline },
  { key: "basketball", label: "Basketball", Icon: IoBasketballOutline },
  { key: "tennisball", label: "Tennis", Icon: IoTennisballOutline },
  { key: "americanfb", label: "American Fb.", Icon: IoAmericanFootballOutline },
  { key: "golf", label: "Golf", Icon: IoGolfOutline },
  { key: "boat", label: "Rudern", Icon: IoBoatOutline },
  { key: "stopwatch", label: "Stoppuhr", Icon: IoStopwatchOutline },
  { key: "timer", label: "Timer", Icon: IoTimerOutline },
  { key: "compass", label: "Kompass", Icon: IoCompassOutline },
  { key: "flag", label: "Flagge", Icon: IoFlagOutline },
  { key: "trophy", label: "Pokal", Icon: IoTrophyOutline },
  { key: "medal", label: "Medaille", Icon: IoMedalOutline },
  { key: "ribbon", label: "Ribbon", Icon: IoRibbonOutline },
  { key: "heart", label: "Herz", Icon: IoHeartOutline },
  { key: "pulse", label: "Puls", Icon: IoPulseOutline },
  { key: "body", label: "Körper", Icon: IoBodyOutline },
  { key: "footsteps", label: "Schritte", Icon: IoFootstepsOutline },
  { key: "bandage", label: "Verband", Icon: IoBandageOutline },
  { key: "medical", label: "Medizin", Icon: IoMedicalOutline },
  { key: "nutrition", label: "Ernährung", Icon: IoNutritionOutline },
  { key: "scale", label: "Waage", Icon: IoScaleOutline },
  { key: "thermometer", label: "Temperatur", Icon: IoThermometerOutline },
  { key: "eyedrop", label: "Augentropfen", Icon: IoEyedropOutline },
  { key: "flame", label: "Feuer", Icon: IoFlameOutline },
  { key: "moon", label: "Schlaf", Icon: IoMoonOutline },
  { key: "bed", label: "Bett", Icon: IoBedOutline },
  { key: "water", label: "Wasser", Icon: IoWaterOutline },
  { key: "leaf", label: "Natur", Icon: IoLeafOutline },
  { key: "flower", label: "Blume", Icon: IoFlowerOutline },
  { key: "sun", label: "Sonne", Icon: IoSunnyOutline },
  { key: "snow", label: "Schnee", Icon: IoSnowOutline },
  { key: "earth", label: "Erde", Icon: IoEarthOutline },
  { key: "bonfire", label: "Lagerfeuer", Icon: IoBonfireOutline },
  { key: "trending", label: "Aufsteigend", Icon: IoTrendingUpOutline },
  { key: "trenddown", label: "Absteigend", Icon: IoTrendingDownOutline },
  { key: "speedo", label: "Tempo", Icon: IoSpeedometerOutline },
  { key: "star", label: "Stern", Icon: IoStarOutline },
  { key: "flash", label: "Blitz", Icon: IoFlashOutline },
  { key: "rocket", label: "Rakete", Icon: IoRocketOutline },
  { key: "infinite", label: "Unendlich", Icon: IoInfiniteOutline },
  { key: "alarm", label: "Alarm", Icon: IoAlarmOutline },
  { key: "thumbup", label: "Daumen hoch", Icon: IoThumbsUpOutline },
  { key: "thumbdown", label: "Daumen runter", Icon: IoThumbsDownOutline },
  { key: "grid", label: "Raster", Icon: IoGridOutline },
  { key: "map", label: "Karte", Icon: IoMapOutline },
  { key: "globe", label: "Globus", Icon: IoGlobeOutline },
  { key: "location", label: "Standort", Icon: IoLocationOutline },
  { key: "create", label: "Erstellen", Icon: IoCreateOutline },
  { key: "build", label: "Bauen", Icon: IoBuildOutline },
  { key: "paw", label: "Pfote", Icon: IoPawOutline },
  { key: "fish", label: "Fisch", Icon: IoFishOutline },
  { key: "rose", label: "Rose", Icon: IoRoseOutline },
  { key: "dice", label: "Würfel", Icon: IoDiceOutline },
  { key: "game", label: "Spiel", Icon: IoGameControllerOutline },
  { key: "beer", label: "Bier", Icon: IoBeerOutline },
  { key: "icecream", label: "Eis", Icon: IoIceCreamOutline },
];

interface Props {
  card: {
    _id: string;
    type: string;
    label: string;
    unit: string;
    color?: string;
    chartType?: string;
    goalEnabled?: boolean;
    goalValue?: number | null;
    goalDirection?: "lose" | "gain" | "min" | "max" | null;
  };
  latest: { value: number; recordedAt: string; secondaryValue?: number } | null;
  selected: boolean;
  onToggleSelect: () => void;
  selectedDate?: string;
}

const COLOR_OPTIONS = [
  {
    key: "rose",
    from: "from-rose-500/12",
    border: "border-rose-500/20",
    dot: "bg-rose-400",
    iconBg: "bg-rose-500/18 dark:bg-rose-500/16",
    iconText: "!text-[#0f0f13] dark:!text-rose-200",
  },
  {
    key: "orange",
    from: "from-orange-500/12",
    border: "border-orange-500/20",
    dot: "bg-orange-400",
    iconBg: "bg-orange-500/18 dark:bg-orange-500/16",
    iconText: "!text-[#0f0f13] dark:!text-orange-200",
  },
  {
    key: "amber",
    from: "from-amber-500/12",
    border: "border-amber-500/20",
    dot: "bg-amber-400",
    iconBg: "bg-amber-500/18 dark:bg-amber-500/16",
    iconText: "!text-[#0f0f13] dark:!text-amber-100",
  },
  {
    key: "green",
    from: "from-green-500/12",
    border: "border-green-500/20",
    dot: "bg-green-400",
    iconBg: "bg-green-500/18 dark:bg-green-500/16",
    iconText: "!text-[#0f0f13] dark:!text-green-200",
  },
  {
    key: "teal",
    from: "from-teal-500/12",
    border: "border-teal-500/20",
    dot: "bg-teal-400",
    iconBg: "bg-teal-500/18 dark:bg-teal-500/16",
    iconText: "!text-[#0f0f13] dark:!text-teal-200",
  },
  {
    key: "blue",
    from: "from-blue-500/12",
    border: "border-blue-500/20",
    dot: "bg-blue-400",
    iconBg: "bg-blue-500/18 dark:bg-blue-500/16",
    iconText: "!text-[#0f0f13] dark:!text-blue-200",
  },
  {
    key: "indigo",
    from: "from-indigo-500/12",
    border: "border-indigo-500/20",
    dot: "bg-indigo-400",
    iconBg: "bg-indigo-500/18 dark:bg-indigo-500/16",
    iconText: "!text-[#0f0f13] dark:!text-indigo-200",
  },
  {
    key: "purple",
    from: "from-purple-500/12",
    border: "border-purple-500/20",
    dot: "bg-purple-400",
    iconBg: "bg-purple-500/18 dark:bg-purple-500/16",
    iconText: "!text-[#0f0f13] dark:!text-purple-200",
  },
  {
    key: "pink",
    from: "from-pink-500/12",
    border: "border-pink-500/20",
    dot: "bg-pink-400",
    iconBg: "bg-pink-500/18 dark:bg-pink-500/16",
    iconText: "!text-[#0f0f13] dark:!text-pink-200",
  },
  {
    key: "yellow",
    from: "from-[#FFD300]/12",
    border: "border-[#FFD300]/20",
    dot: "bg-[#FFD300]",
    iconBg: "bg-[#FFD300]/18 dark:bg-[#FFD300]/16",
    iconText: "!text-[#0f0f13] dark:!text-[#FFE666]",
  },
] as const;

const CHART_TYPES = [
  {
    key: "line",
    label: "Linie",
    icon: (
      <svg viewBox="0 0 40 24" fill="none" className="h-6 w-10">
        <polyline
          points="2,20 10,12 18,15 26,6 38,10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: "bar",
    label: "Balken",
    icon: (
      <svg viewBox="0 0 40 24" fill="none" className="h-6 w-10">
        <rect
          x="3"
          y="10"
          width="6"
          height="12"
          rx="1"
          fill="currentColor"
          opacity="0.8"
        />
        <rect
          x="12"
          y="6"
          width="6"
          height="16"
          rx="1"
          fill="currentColor"
          opacity="0.8"
        />
        <rect
          x="21"
          y="12"
          width="6"
          height="10"
          rx="1"
          fill="currentColor"
          opacity="0.8"
        />
        <rect
          x="30"
          y="4"
          width="6"
          height="18"
          rx="1"
          fill="currentColor"
          opacity="0.8"
        />
      </svg>
    ),
  },
  {
    key: "mixed",
    label: "Mix",
    icon: (
      <svg viewBox="0 0 40 24" fill="none" className="h-6 w-10">
        <rect
          x="3"
          y="12"
          width="5"
          height="10"
          rx="1"
          fill="currentColor"
          opacity="0.5"
        />
        <rect
          x="11"
          y="8"
          width="5"
          height="14"
          rx="1"
          fill="currentColor"
          opacity="0.5"
        />
        <rect
          x="19"
          y="14"
          width="5"
          height="8"
          rx="1"
          fill="currentColor"
          opacity="0.5"
        />
        <rect
          x="27"
          y="6"
          width="5"
          height="16"
          rx="1"
          fill="currentColor"
          opacity="0.5"
        />
        <polyline
          points="2,20 10,12 18,15 26,6 38,10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
] as const;

const DEFAULT_COLORS: Record<string, string> = {
  heartrate: "rose",
  calories: "orange",
  weight: "blue",
  steps: "green",
  sleep: "purple",
  custom: "yellow",
};

function getCardIcon(card: {
  type: string;
  label: string;
}): ComponentType<{ className?: string }> {
  const match = card.label.match(/^\[([a-z]+)\]/);
  if (match && ICON_MAP[match[1]]) return ICON_MAP[match[1]];
  return ICON_MAP[card.type] ?? IoGridOutline;
}

function getCleanCardLabel(label: string): string {
  return label.replace(/^\[[a-z]+\]\s*/, "").replace(/^\p{Emoji}\s*/u, "");
}

function getColorClasses(key: string) {
  return COLOR_OPTIONS.find((o) => o.key === key) ?? COLOR_OPTIONS[9];
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

function getDisplayValue(
  value: number,
  unit: string,
  secondaryValue?: number
): string {
  if (unit === "min/km" && secondaryValue && value) {
    return (secondaryValue / value).toFixed(2);
  }
  if (unit === "km/h" && secondaryValue && value) {
    return (value / (secondaryValue / 60)).toFixed(1);
  }
  const num = parseFloat(String(value));
  if (isNaN(num)) return "—";
  return parseFloat(num.toFixed(2)).toString();
}

export default function StatCard({
  card,
  latest,
  selected,
  onToggleSelect,
  selectedDate,
}: Props) {
  const updateWeight = useUpdateWeight();
  const removeCard = useRemoveCard();
  const logEntry = useLogEntry();
  const editCard = useEditCard();

  const isCustom = card.type === "custom";
  const isWeight = card.type === "weight";
  const CardIcon = getCardIcon(card);
  const displayLabel = getCleanCardLabel(card.label);
  const displayUnit = getDisplayUnit(card.unit);

  const [localColor, setLocalColor] = useState(
    card.color ?? DEFAULT_COLORS[card.type] ?? "yellow"
  );
  const [localLabel, setLocalLabel] = useState(displayLabel);
  const [localChartType, setLocalChartType] = useState(
    card.chartType ?? "line"
  );
  const [localGoalEnabled, setLocalGoalEnabled] = useState(
    Boolean(card.goalEnabled)
  );
  const [localGoalValue, setLocalGoalValue] = useState<number | null>(
    typeof card.goalValue === "number" ? card.goalValue : null
  );
  const [localGoalDirection, setLocalGoalDirection] = useState<
    "lose" | "gain" | "min" | "max" | null
  >(card.goalDirection ?? (isWeight ? "lose" : "min"));

  const colorOption = getColorClasses(localColor);

  const [showTable, setShowTable] = useState(false);
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [dateInput, setDateInput] = useState(
    selectedDate ?? new Date().toISOString().split("T")[0]
  );
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editLabel, setEditLabel] = useState(displayLabel);
  const [editColor, setEditColor] = useState(localColor);
  const [editIconKey, setEditIconKey] = useState(() => {
    const m = card.label.match(/^\[([a-z]+)\]/);
    return m ? m[1] : "";
  });
  const [showEditIconPicker, setShowEditIconPicker] = useState(false);
  const [editIconSearch, setEditIconSearch] = useState("");
  const [editChartType, setEditChartType] = useState(localChartType);
  const [editGoalEnabled, setEditGoalEnabled] = useState(
    Boolean(card.goalEnabled)
  );
  const [editGoalValue, setEditGoalValue] = useState(
    typeof card.goalValue === "number" ? String(card.goalValue) : ""
  );
  const [editGoalDirection, setEditGoalDirection] = useState<
    "lose" | "gain" | "min" | "max"
  >((card.goalDirection as any) ?? (isWeight ? "lose" : "min"));

  const openEdit = () => {
    setEditLabel(localLabel);
    setEditColor(localColor);
    setEditIconKey(() => {
      const m = card.label.match(/^\[([a-z]+)\]/);
      return m ? m[1] : "";
    });
    setEditChartType(localChartType);
    setEditGoalEnabled(localGoalEnabled);
    setEditGoalValue(
      typeof localGoalValue === "number" ? String(localGoalValue) : ""
    );
    setEditGoalDirection(
      (localGoalDirection as any) ?? (isWeight ? "lose" : "min")
    );
    setShowEdit(true);
  };

  const handleSaveEdit = () => {
    const newLabel =
      isCustom && editIconKey
        ? `[${editIconKey}] ${editLabel.trim()}`
        : editLabel.trim();

    const parsedGoalValue =
      editGoalEnabled && editGoalValue.trim() !== ""
        ? parseFloat(editGoalValue)
        : null;

    setLocalLabel(editLabel.trim());
    setLocalColor(editColor);
    setLocalChartType(editChartType);
    setLocalGoalEnabled(editGoalEnabled);
    setLocalGoalValue(
      typeof parsedGoalValue === "number" && !Number.isNaN(parsedGoalValue)
        ? parsedGoalValue
        : null
    );
    setLocalGoalDirection(editGoalEnabled ? editGoalDirection : null);
    setShowEdit(false);

    editCard.mutate({
      id: card._id,
      label: newLabel,
      color: editColor,
      chartType: editChartType,
      goalEnabled: editGoalEnabled,
      goalValue:
        typeof parsedGoalValue === "number" && !Number.isNaN(parsedGoalValue)
          ? parsedGoalValue
          : null,
      goalDirection: editGoalEnabled ? editGoalDirection : null,
    });
  };

  const handleManualWeight = () => {
    const val = parseFloat(weightInput);
    if (isNaN(val)) return;

    logEntry.mutate(
      {
        cardId: card._id,
        value: val,
        recordedAt: new Date(dateInput + "T12:00:00").toISOString(),
      },
      {
        onSuccess: () => {
          setWeightInput("");
          setShowWeightInput(false);
        },
      }
    );
  };

  const handleDelta = (delta: number) => {
    updateWeight.mutate({ delta, date: selectedDate });
  };

  const previewColor = getColorClasses(editColor);
  const PreviewIcon = isCustom
    ? ICON_MAP[editIconKey] ?? IoGridOutline
    : CardIcon;

  return (
    <>
      <div
        className={`group relative flex min-h-[214px] flex-col overflow-hidden rounded-[22px] border border-subtle bg-surface bg-gradient-to-br ${
          colorOption.from
        } p-4 shadow-[0_10px_30px_rgba(15,23,42,0.10)] transition-all duration-200 ${
          selected ? "ring-2 ring-[#FFD300]/50" : ""
        } ${
          isCustom || isWeight ? "cursor-pointer" : ""
        } hover:-translate-y-[1px] hover:shadow-[0_4px_8px_rgba(0,0,0,0.12)]`}
        onClick={
          isCustom
            ? () => setShowTable(true)
            : isWeight
            ? () => setShowWeightInput(true)
            : undefined
        }
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/4 to-transparent dark:from-white/[0.03]" />

        <div className="absolute right-3 top-3 z-20 flex flex-col items-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all ${
              selected
                ? "border-[#FFD300] bg-[#FFD300]"
                : "border-subtle bg-surface/70 hover:border-strong"
            }`}
            title="Im MainChart anzeigen"
          >
            {selected && (
              <IoCheckmarkOutline className="h-4 w-4 text-[#0f0f13]" />
            )}
          </button>

          <div className="translate-y-1 flex flex-col items-center gap-1 pt-0.5 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openEdit();
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-subtle bg-surface/70 text-muted transition-all hover:border-strong hover:text-[#FFD300]"
              title="Bearbeiten"
            >
              <IoPencilOutline className="h-4 w-4" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmRemove(true);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-subtle bg-surface/70 text-muted transition-all hover:border-red-500/40 hover:text-red-500 dark:hover:text-red-400"
              title="Entfernen"
            >
              <IoTrashOutline className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative flex flex-1 flex-col">
          <div className="flex items-center gap-3 pr-12">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${colorOption.iconBg} backdrop-blur-sm`}
            >
              <CardIcon
                className={`h-[22px] w-[22px] ${colorOption.iconText}`}
              />
            </div>

            <div className="min-w-0 flex-1 self-center">
              <p className="truncate text-[17px] font-semibold leading-none text-primary">
                {localLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-center py-5">
            <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
              <p className="text-[32px] font-semibold leading-none tracking-[-0.02em] text-primary">
                {latest?.value != null
                  ? getDisplayValue(
                      latest.value,
                      card.unit,
                      latest.secondaryValue
                    )
                  : "—"}
              </p>
              <span className="pb-0.5 text-sm font-medium text-muted">
                {displayUnit}
              </span>
            </div>

            <div className="mt-2 min-h-[18px]">
              {latest?.recordedAt ? (
                <p className="text-xs text-muted">
                  {new Date(latest.recordedAt).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "short",
                  })}
                </p>
              ) : (
                <p className="text-xs text-transparent">.</p>
              )}
            </div>

            <div className="mt-1 min-h-[16px]">
              {localGoalEnabled && typeof localGoalValue === "number" ? (
                <p className="text-[10px] text-[#c99700] dark:text-[#FFD300]/80">
                  Ziel: {localGoalValue} {displayUnit}
                </p>
              ) : (
                <p className="text-[10px] text-transparent">.</p>
              )}
            </div>
          </div>

          {(isCustom || isWeight) && (
            <div className="mt-auto border-t border-white/8 pt-3">
              <p className="text-xs text-[#c99700] dark:text-[#FFD300]/70">
                Tippen zum Öffnen →
              </p>
            </div>
          )}

          {!isWeight && !isCustom && <div className="mt-auto h-[30px]" />}
        </div>
      </div>

      {showWeightInput && isWeight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-subtle bg-surface p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-primary">
                  Gewicht bearbeiten
                </h3>
                <p className="mt-1 text-xs text-muted">{localLabel}</p>
              </div>
              <button
                onClick={() => setShowWeightInput(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-primary"
              >
                <IoCloseOutline className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleDelta(-0.1)}
                  disabled={updateWeight.isPending}
                  className="rounded-xl border border-subtle bg-surface-2 py-3 text-sm font-medium text-primary transition-colors hover:border-strong hover:bg-surface disabled:opacity-50"
                >
                  − 0.1 kg
                </button>

                <button
                  onClick={() => handleDelta(0.1)}
                  disabled={updateWeight.isPending}
                  className="rounded-xl border border-subtle bg-surface-2 py-3 text-sm font-medium text-primary transition-colors hover:border-strong hover:bg-surface disabled:opacity-50"
                >
                  + 0.1 kg
                </button>
              </div>

              {selectedDate && (
                <p className="text-center text-xs text-muted">
                  {selectedDate === new Date().toISOString().split("T")[0]
                    ? "Heute"
                    : new Date(selectedDate + "T12:00:00").toLocaleDateString(
                        "de-DE",
                        { day: "2-digit", month: "short", year: "numeric" }
                      )}
                </p>
              )}

              <div className="space-y-3 rounded-2xl border border-subtle bg-surface-2 p-3">
                <p className="text-sm font-medium text-primary">
                  Manuellen Wert eintragen
                </p>

                <input
                  type="number"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  placeholder={`${latest?.value ?? "70"} kg`}
                  step="0.1"
                  className="w-full rounded-xl border border-subtle bg-surface px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:border-[#FFD300]/50 focus:outline-none"
                />

                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    className="flex-1 rounded-xl border border-subtle bg-surface px-3 py-2.5 text-sm text-primary focus:border-[#FFD300]/50 focus:outline-none"
                  />

                  <button
                    onClick={handleManualWeight}
                    disabled={logEntry.isPending || !weightInput}
                    className="rounded-xl bg-[#FFD300] px-4 py-2.5 text-sm font-medium text-[#0f0f13] transition-colors hover:bg-[#e6be00] disabled:opacity-40"
                  >
                    {logEntry.isPending ? "…" : "Speichern"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-subtle bg-surface p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-semibold text-primary">Karte bearbeiten</h3>
              <button
                onClick={() => setShowEdit(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:text-primary"
              >
                <IoCloseOutline className="h-5 w-5" />
              </button>
            </div>

            {isCustom && (
              <div className="mb-4">
                <label className="mb-1.5 block text-sm text-secondary">
                  Icon
                </label>
                {(() => {
                  const EditIcon = ICON_MAP[editIconKey] ?? IoGridOutline;
                  const filtered = editIconSearch.trim()
                    ? ICON_LIST.filter(
                        (o) =>
                          o.label
                            .toLowerCase()
                            .includes(editIconSearch.toLowerCase()) ||
                          o.key.includes(editIconSearch.toLowerCase())
                      )
                    : ICON_LIST;

                  return (
                    <>
                      <button
                        onClick={() => setShowEditIconPicker((v) => !v)}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-subtle bg-surface-2 transition-all hover:border-[#FFD300]/50"
                      >
                        <EditIcon className="h-5 w-5 text-primary" />
                      </button>

                      {showEditIconPicker && (
                        <div className="mt-2 rounded-xl border border-subtle bg-surface-2 p-3">
                          <input
                            value={editIconSearch}
                            onChange={(e) => setEditIconSearch(e.target.value)}
                            placeholder="Suchen…"
                            className="mb-2 w-full rounded-lg border border-subtle bg-surface px-3 py-1.5 text-sm text-primary placeholder:text-muted focus:border-[#FFD300]/50 focus:outline-none"
                          />

                          <div className="grid max-h-40 grid-cols-8 gap-1 overflow-y-auto">
                            {filtered.map(({ key, label: iconLabel, Icon }) => (
                              <button
                                key={key}
                                onClick={() => {
                                  setEditIconKey(key);
                                  setShowEditIconPicker(false);
                                  setEditIconSearch("");
                                }}
                                title={iconLabel}
                                className={`flex items-center justify-center rounded-lg p-2 transition-all hover:bg-surface-3 ${
                                  editIconKey === key
                                    ? "bg-[#FFD300]/20 ring-1 ring-[#FFD300]/40"
                                    : ""
                                }`}
                              >
                                <Icon
                                  className={`h-4 w-4 ${
                                    editIconKey === key
                                      ? "text-[#FFD300]"
                                      : "text-secondary"
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            <div className="mb-4">
              <label className="mb-1.5 block text-sm text-secondary">
                Titel
              </label>
              <input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="w-full rounded-xl border border-subtle bg-surface-2 px-4 py-2.5 text-sm text-primary transition-all focus:border-[#FFD300]/50 focus:outline-none"
              />
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm text-secondary">Farbe</label>
              <div className="mb-3 grid grid-cols-5 gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setEditColor(c.key)}
                    className={`flex h-9 items-center justify-center rounded-lg border transition-all ${
                      editColor === c.key
                        ? "border-strong bg-surface-3"
                        : "border-subtle bg-surface-2 hover:border-strong"
                    }`}
                  >
                    <span className={`h-4 w-4 rounded-full ${c.dot}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm text-secondary">
                Diagramm-Typ
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CHART_TYPES.map((ct) => (
                  <button
                    key={ct.key}
                    onClick={() => setEditChartType(ct.key)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-all ${
                      editChartType === ct.key
                        ? "border-[#FFD300]/50 bg-[#FFD300]/10 text-[#FFD300]"
                        : "border-subtle bg-surface-2 text-muted hover:border-strong hover:text-primary"
                    }`}
                  >
                    {ct.icon}
                    <span className="text-xs font-medium">{ct.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="mb-2 block text-sm text-secondary">Ziel</label>

              <div className="space-y-3 rounded-xl border border-subtle bg-surface-2 p-3">
                <label className="flex items-center gap-2 text-sm text-primary">
                  <input
                    type="checkbox"
                    checked={editGoalEnabled}
                    onChange={(e) => setEditGoalEnabled(e.target.checked)}
                  />
                  Ziel für diese Karte aktivieren
                </label>

                {editGoalEnabled && (
                  <>
                    <input
                      type="number"
                      value={editGoalValue}
                      onChange={(e) => setEditGoalValue(e.target.value)}
                      placeholder={`Zielwert in ${displayUnit}`}
                      step="0.1"
                      className="w-full rounded-xl border border-subtle bg-surface px-4 py-2.5 text-sm text-primary focus:border-[#FFD300]/50 focus:outline-none"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      {(isWeight
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
                          onClick={() =>
                            setEditGoalDirection(option.key as any)
                          }
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
            </div>

            <div
              className={`mb-5 flex items-center gap-3 rounded-2xl border bg-gradient-to-br p-3 ${previewColor.from} ${previewColor.border}`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-2xl ${previewColor.iconBg}`}
              >
                <PreviewIcon className={`h-5 w-5 ${previewColor.iconText}`} />
              </div>

              <span className="min-w-0 truncate text-sm font-medium text-primary">
                {editLabel || localLabel}
              </span>

              <span className="ml-auto text-xs text-muted">
                {CHART_TYPES.find((c) => c.key === editChartType)?.label}
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEdit(false)}
                className="flex-1 rounded-xl border border-subtle bg-surface-2 py-2.5 text-sm font-medium text-secondary transition-colors hover:border-strong hover:text-primary"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editCard.isPending || !editLabel.trim()}
                className="flex-1 rounded-xl bg-[#FFD300] py-2.5 text-sm font-medium text-[#0f0f13] transition-colors hover:bg-[#e6be00] disabled:opacity-40"
              >
                {editCard.isPending ? "…" : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-subtle bg-surface p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-xl">
                🗑️
              </div>
              <div>
                <h3 className="font-semibold text-primary">Karte entfernen?</h3>
                <p className="mt-0.5 text-xs text-muted">{localLabel}</p>
              </div>
            </div>

            <p className="mb-5 text-sm text-secondary">
              Sind Sie sicher? Alle gespeicherten Daten dieser Karte werden{" "}
              <span className="font-medium text-red-500 dark:text-red-400">
                unwiderruflich gelöscht
              </span>{" "}
              und können nicht wiederhergestellt werden.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRemove(false)}
                className="flex-1 rounded-xl border border-subtle bg-surface-2 py-2.5 text-sm font-medium text-secondary transition-colors hover:border-strong hover:text-primary"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  removeCard.mutate(card._id);
                  setConfirmRemove(false);
                }}
                disabled={removeCard.isPending}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
              >
                {removeCard.isPending ? "Löschen…" : "Ja, löschen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTable && (
        <CustomCardTable card={card} onClose={() => setShowTable(false)} />
      )}
    </>
  );
}
