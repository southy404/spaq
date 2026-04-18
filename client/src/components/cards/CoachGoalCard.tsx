import { useState } from "react";
import { useCoachUpdateAthleteCardGoal } from "../../hooks/useStats";

type Props = {
  athleteId: string;
  card: {
    _id: string;
    type: string;
    label: string;
    unit: string;
    goalEnabled?: boolean;
    goalValue?: number | null;
    goalDirection?: "lose" | "gain" | "min" | "max" | null;
  };
};

function getDisplayUnit(unit: string) {
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

function stripEmoji(label: string) {
  return label.replace(/^\p{Emoji}\s*/u, "");
}

export default function CoachGoalEditor({ athleteId, card }: Props) {
  const updateGoal = useCoachUpdateAthleteCardGoal();

  const [open, setOpen] = useState(false);
  const [goalEnabled, setGoalEnabled] = useState(Boolean(card.goalEnabled));
  const [goalValue, setGoalValue] = useState(
    typeof card.goalValue === "number" ? String(card.goalValue) : ""
  );
  const [goalDirection, setGoalDirection] = useState<
    "lose" | "gain" | "min" | "max"
  >((card.goalDirection as any) ?? (card.type === "weight" ? "lose" : "min"));

  const displayUnit = getDisplayUnit(card.unit);
  const isWeight = card.type === "weight";

  const handleSave = () => {
    const parsedGoal =
      goalEnabled && goalValue.trim() !== "" ? parseFloat(goalValue) : null;

    updateGoal.mutate(
      {
        athleteId,
        cardId: card._id,
        goalEnabled,
        goalValue:
          typeof parsedGoal === "number" && !Number.isNaN(parsedGoal)
            ? parsedGoal
            : null,
        goalDirection: goalEnabled ? goalDirection : null,
      },
      {
        onSuccess: () => setOpen(false),
      }
    );
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-subtle bg-surface-2 px-3 py-1.5 text-xs text-secondary transition hover:border-strong hover:text-primary"
      >
        Ziel anpassen
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-subtle bg-surface p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-semibold text-primary">Ziel bearbeiten</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-xl leading-none text-muted transition hover:text-primary"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-primary">
                {stripEmoji(card.label)}
              </p>
              <p className="mt-1 text-xs text-muted">{displayUnit}</p>
            </div>

            <div className="space-y-3 rounded-xl border border-subtle bg-surface-2 p-3">
              <label className="flex items-center gap-2 text-sm text-primary">
                <input
                  type="checkbox"
                  checked={goalEnabled}
                  onChange={(e) => setGoalEnabled(e.target.checked)}
                />
                Ziel aktivieren
              </label>

              {goalEnabled && (
                <>
                  <input
                    type="number"
                    value={goalValue}
                    onChange={(e) => setGoalValue(e.target.value)}
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
                        onClick={() => setGoalDirection(option.key as any)}
                        className={`rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                          goalDirection === option.key
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
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border border-subtle bg-surface-2 py-2.5 text-sm font-medium text-secondary transition-colors hover:border-strong hover:text-primary"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={updateGoal.isPending}
                className="flex-1 rounded-xl bg-[#FFD300] py-2.5 text-sm font-medium text-[#0f0f13] transition-colors hover:bg-[#e6be00] disabled:opacity-40"
              >
                {updateGoal.isPending ? "…" : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
