import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

type CreateStatCardInput = {
  type: string;
  label: string;
  unit: string;
};

type CreateStatEntryInput = {
  cardId: string;
  value?: number;
  value1?: number;
  value2?: number;
  recordedAt?: string;
  note?: string;
};

type StatCardItem = {
  _id: string;
  athleteId: string;
  type: string;
  label: string;
  unit: string;
  color?: string | null;
  chartType?: "line" | "bar" | "mixed" | string;
  visible?: boolean;
  order: number;

  goalEnabled?: boolean;
  goalValue?: number | null;
  goalDirection?: "lose" | "gain" | "min" | "max" | null;

  createdAt?: string;
  updatedAt?: string;
};

type LatestStatItem = {
  card: StatCardItem;
  latest: any | null;
};

type DayStatItem = {
  card: StatCardItem;
  entry: any | null;
};

type ReorderPayloadItem = {
  id: string;
  order: number;
};

// ─── Cards ────────────────────────────────────────────────────────────────────

export const useCards = () =>
  useQuery<StatCardItem[]>({
    queryKey: ["cards"],
    queryFn: async () => {
      const { data } = await api.get("/athlete/cards");
      return (data.data ?? []) as StatCardItem[];
    },
    staleTime: 0,
  });

export const useAddCard = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateStatCardInput) => {
      const { data } = await api.post("/athlete/cards", input);
      return data.data as StatCardItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cards"] });
      qc.invalidateQueries({ queryKey: ["latest"] });
      qc.invalidateQueries({ queryKey: ["day"] });
    },
  });
};

export const useRemoveCard = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/athlete/cards/${id}`);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cards"] });
      qc.invalidateQueries({ queryKey: ["latest"] });
      qc.invalidateQueries({ queryKey: ["day"] });
      qc.invalidateQueries({ queryKey: ["entries"] });
    },
  });
};

export const useEditCard = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      label,
      color,
      chartType,
      visible,
      unit,
      goalEnabled,
      goalValue,
      goalDirection,
    }: {
      id: string;
      label?: string;
      color?: string;
      chartType?: string;
      visible?: boolean;
      unit?: string;
      goalEnabled?: boolean;
      goalValue?: number | null;
      goalDirection?: "lose" | "gain" | "min" | "max" | null;
    }) => {
      const { data } = await api.patch(`/athlete/cards/${id}`, {
        label,
        color,
        chartType,
        visible,
        unit,
        goalEnabled,
        goalValue,
        goalDirection,
      });
      return data.data as StatCardItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cards"] });
      qc.invalidateQueries({ queryKey: ["latest"] });
    },
  });
};

export const useCoachUpdateAthleteCardGoal = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      athleteId,
      cardId,
      goalEnabled,
      goalValue,
      goalDirection,
      from,
      to,
    }: {
      athleteId: string;
      cardId: string;
      goalEnabled: boolean;
      goalValue?: number | null;
      goalDirection?: "lose" | "gain" | "min" | "max" | null;
      from?: string;
      to?: string;
    }) => {
      const { data } = await api.patch(
        `/coach/athletes/${athleteId}/cards/${cardId}/goal`,
        {
          goalEnabled,
          goalValue,
          goalDirection,
        }
      );

      return {
        card: data.data,
        athleteId,
        from,
        to,
      };
    },
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({
        queryKey: ["athlete-stats", vars.athleteId],
      });
      qc.invalidateQueries({
        queryKey: ["chat-unread"],
      });
    },
  });
};

export const useCoachUpdateAthleteGoal = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      athleteId,
      cardId,
      goalEnabled,
      goalValue,
      goalDirection,
    }: {
      athleteId: string;
      cardId: string;
      goalEnabled: boolean;
      goalValue: number | null;
      goalDirection: "lose" | "gain" | "min" | "max" | null;
    }) => {
      const { data } = await api.patch(
        `/coach/athletes/${athleteId}/cards/${cardId}/goal`,
        {
          goalEnabled,
          goalValue,
          goalDirection,
        }
      );
      return data.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: ["athlete-stats", vars.athleteId],
      });
      qc.invalidateQueries({
        queryKey: ["coach-athletes"],
      });
      qc.invalidateQueries({
        queryKey: ["chat-threads"],
      });
    },
  });
};

// ─── Reorder Cards ────────────────────────────────────────────────────────────

export const useReorderCards = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (cards: StatCardItem[]) => {
      const payload: { order: ReorderPayloadItem[] } = {
        order: cards.map((card, index) => ({
          id: card._id,
          order: index,
        })),
      };

      await api.patch("/athlete/cards/reorder", payload);
      return cards.map((card, index) => ({
        ...card,
        order: index,
      }));
    },

    onMutate: async (nextCards: StatCardItem[]) => {
      await qc.cancelQueries({ queryKey: ["cards"] });

      const previousCards = qc.getQueryData<StatCardItem[]>(["cards"]);

      const optimisticCards = nextCards.map((card, index) => ({
        ...card,
        order: index,
      }));

      qc.setQueryData<StatCardItem[]>(["cards"], optimisticCards);

      return { previousCards };
    },

    onError: (error, _nextCards, context) => {
      console.error("Failed to reorder cards", error);

      if (context?.previousCards) {
        qc.setQueryData(["cards"], context.previousCards);
      }
    },

    onSuccess: (savedCards) => {
      qc.setQueryData<StatCardItem[]>(["cards"], savedCards);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["cards"] });
    },
  });
};

// ─── Latest values ────────────────────────────────────────────────────────────

export const useLatestStats = () =>
  useQuery<LatestStatItem[]>({
    queryKey: ["latest"],
    queryFn: async () => {
      const { data } = await api.get("/stats/latest");
      return (data.data ?? []) as LatestStatItem[];
    },
    staleTime: 0,
  });

// ─── Day stats ────────────────────────────────────────────────────────────────

export const useDayStats = (date: string) =>
  useQuery<DayStatItem[]>({
    queryKey: ["day", date],
    queryFn: async () => {
      const { data } = await api.get(`/stats/day?date=${date}`);
      return (data.data ?? []) as DayStatItem[];
    },
    staleTime: 0,
    enabled: !!date,
  });

// ─── Entries for chart ────────────────────────────────────────────────────────

export const useCardEntries = (
  cardId: string | null,
  opts?: { from?: string; to?: string }
) =>
  useQuery<any[]>({
    queryKey: ["entries", cardId, opts?.from, opts?.to],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (opts?.from) params.set("from", opts.from);
      if (opts?.to) params.set("to", opts.to);

      const qs = params.toString() ? `?${params.toString()}` : "";
      const { data } = await api.get(`/stats/entries/${cardId}${qs}`);
      return data.data ?? [];
    },
    enabled: !!cardId,
  });

// ─── Log entry ────────────────────────────────────────────────────────────────

export const useLogEntry = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateStatEntryInput) => {
      const { data } = await api.post("/stats/entries", input);
      return data.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["entries", vars.cardId] });
      qc.invalidateQueries({ queryKey: ["latest"] });
      qc.invalidateQueries({ queryKey: ["day"] });
    },
  });
};

// ─── Weight — date-aware ──────────────────────────────────────────────────────

export const useUpdateWeight = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ delta, date }: { delta: number; date?: string }) => {
      const { data } = await api.patch("/athlete/weight", { delta, date });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["latest"] });
      qc.invalidateQueries({ queryKey: ["day"] });
      qc.invalidateQueries({ queryKey: ["entries"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};

// ─── Profile ──────────────────────────────────────────────────────────────────

export const useAthleteProfile = () =>
  useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await api.get("/athlete/profile");
      return data.data;
    },
    staleTime: 0,
  });

export const useUpdateAthleteProfile = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.patch("/athlete/profile", payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["latest"] });
    },
  });
};

// ─── Coach ────────────────────────────────────────────────────────────────────

export const useCoachAthletes = (userId?: string) =>
  useQuery({
    queryKey: ["coach-athletes", userId],
    queryFn: async () => {
      const { data } = await api.get("/coach/athletes");
      return data.data;
    },
    enabled: !!userId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

export const useAthleteStats = (
  athleteId: string | null,
  opts?: { from?: string; to?: string }
) =>
  useQuery({
    queryKey: ["athlete-stats", athleteId, opts?.from, opts?.to],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (opts?.from) params.set("from", opts.from);
      if (opts?.to) params.set("to", opts.to);

      const qs = params.toString() ? `?${params.toString()}` : "";
      const { data } = await api.get(`/coach/athletes/${athleteId}/stats${qs}`);

      return {
        stats: data.data,
        isActive: data.isActive ?? null,
      };
    },
    enabled: !!athleteId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

export const useAthletesActivity = (opts: { from?: string; to?: string }) =>
  useQuery({
    queryKey: ["athletes-activity", opts.from, opts.to],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (opts.from) params.set("from", opts.from);
      if (opts.to) params.set("to", opts.to);

      const { data } = await api.get(
        `/coach/athletes/activity?${params.toString()}`
      );

      return data.data as { athleteId: string; isActive: boolean }[];
    },
    enabled: !!(opts.from || opts.to),
    staleTime: 30000,
  });

export const useMyCoaches = () =>
  useQuery({
    queryKey: ["my-coaches"],
    queryFn: async () => {
      const { data } = await api.get("/coach/my-coaches");
      return data.data;
    },
  });

export const useUpdatePermissions = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      coachId,
      allowedMetrics,
    }: {
      coachId: string;
      allowedMetrics: string[];
    }) => {
      const { data } = await api.patch(`/coach/permissions/${coachId}`, {
        allowedMetrics,
      });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-coaches"] });
    },
  });
};

// ─── Delete entry ─────────────────────────────────────────────────────────────

export const useDeleteEntry = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
      cardId,
    }: {
      entryId: string;
      cardId: string;
    }) => {
      await api.delete(`/stats/entries/${entryId}`);
      return { entryId, cardId };
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["entries", vars.cardId] });
      qc.invalidateQueries({ queryKey: ["latest"] });
      qc.invalidateQueries({ queryKey: ["day"] });
    },
  });
};
