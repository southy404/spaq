import { Router, Response } from "express";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";
import AiChatMessage from "../models/AiChatMessage";
import { buildAthleteAiContext } from "../ai/buildAthleteContext";
import { generateSPAQText } from "../ai/provider";

const router = Router();
router.use(authenticate, requireRole("athlete"));

type AiIntent =
  | "daily_review"
  | "progress_review"
  | "long_term_review"
  | "motivation"
  | "insights"
  | "goal_review"
  | "consistency_review"
  | "general";

const SYSTEM_PROMPT = `
Du bist SPAQ Bot, ein intelligenter Fitness- und Fortschrittsassistent.
Du bist motivierend, ehrlich, konkret, datenbasiert und freundlich.
Du klingst wie ein starker persönlicher Coach, nicht wie ein generischer Chatbot.
Du erfindest keine Daten.
Wenn Daten fehlen, sagst du das offen.
Du nutzt nur die vorhandenen Profil-, Tages-, Vergleichs-, Trend- und Fortschrittsdaten.
Du gibst keine medizinischen Diagnosen.
Du antwortest immer auf Deutsch.
Passe den Ton möglichst an "profile.aiTone" an:
- supportive = warm, motivierend, positiv
- direct = klar, knapp, ehrlich
- coach_like = strukturiert, sachlich, führend

Wichtige Verhaltensregeln:
- Wenn der User nach "heute" fragt, analysiere konkret den heutigen Tag.
- Wenn der User nach Fortschritt fragt, vergleiche sinnvoll mit älteren Daten.
- Wenn der User nach letzter Woche / letztem Monat / letztem Jahr fragt, fokussiere langfristige Entwicklung.
- Wenn es Fortschritte gibt, benenne sie klar.
- Wenn es Rückschritte gibt, benenne sie ehrlich, aber konstruktiv.
- Motivation muss kurz, persönlich und auf echte Daten gestützt sein.
- Keine übertriebene Länge.
- Keine Floskeln ohne Datenbezug.
- Wenn sinnvoll, gib 2-4 kurze nächste Schritte.
- Antworte klar strukturiert, gut lesbar und hilfreich.
`.trim();

function detectIntent(text: string): AiIntent {
  const t = text.toLowerCase();

  const hasToday =
    t.includes("heute") ||
    t.includes("mein tag") ||
    t.includes("wie lief mein tag") ||
    t.includes("wie war mein tag") ||
    t.includes("tagesanalyse") ||
    t.includes("heutigen tag");

  const hasProgress =
    t.includes("fortschritt") ||
    t.includes("verbessert") ||
    t.includes("verbesserung") ||
    t.includes("entwickelt") ||
    t.includes("besser geworden") ||
    t.includes("wo bin ich besser") ||
    t.includes("was wurde besser") ||
    t.includes("wie habe ich mich verbessert");

  const hasLongTerm =
    t.includes("letzten jahr") ||
    t.includes("letztes jahr") ||
    t.includes("im letzten jahr") ||
    t.includes("langfristig") ||
    t.includes("über monate") ||
    t.includes("über das jahr") ||
    t.includes("entwicklung") ||
    t.includes("langzeit");

  const hasMotivation =
    t.includes("motivier") ||
    t.includes("motivation") ||
    t.includes("push") ||
    t.includes("gib mir kraft") ||
    t.includes("munter mich auf");

  const hasInsights =
    t.includes("insight") ||
    t.includes("analyse") ||
    t.includes("analysiere") ||
    t.includes("stärken") ||
    t.includes("schwächen") ||
    t.includes("risiken");

  const hasGoal =
    t.includes("ziel") ||
    t.includes("goal") ||
    t.includes("bis zum ziel") ||
    t.includes("zielgewicht") ||
    t.includes("wie weit bin ich");

  const hasConsistency =
    t.includes("konstanz") ||
    t.includes("consistency") ||
    t.includes("regelmäßig") ||
    t.includes("dranbleiben") ||
    t.includes("wie konstant");

  if (hasToday) return "daily_review";
  if (hasLongTerm) return "long_term_review";
  if (hasProgress) return "progress_review";
  if (hasMotivation) return "motivation";
  if (hasInsights) return "insights";
  if (hasGoal) return "goal_review";
  if (hasConsistency) return "consistency_review";

  return "general";
}

function formatHistory(messages: any[]) {
  return messages.map((m) => `${m.role.toUpperCase()}: ${m.text}`).join("\n");
}

function buildMotivationPrompt(context: unknown) {
  const c = context as any;

  const motivationContext = {
    athlete: {
      name: c?.athlete?.name ?? null,
    },
    profile: {
      primaryGoal: c?.profile?.primaryGoal ?? null,
      targetWeightKg: c?.profile?.targetWeightKg ?? null,
    },
    derived: {
      currentWeightKg: c?.derived?.currentWeightKg ?? null,
      weightDeltaToGoal: c?.derived?.weightDeltaToGoal ?? null,
    },
    consistency: c?.consistency ?? null,
    performanceSnapshot: c?.performanceSnapshot ?? null,
    comparisons: {
      todayVsYesterday: c?.comparisons?.todayVsYesterday ?? [],
      weekly: c?.comparisons?.weekly ?? [],
      monthly: c?.comparisons?.monthly ?? [],
    },
  };

  return `
Erstelle eine kurze Motivation für den Athleten.
Nutze NUR die vorhandenen Daten aus dem unten stehenden Kontext.

Kontext:
${JSON.stringify(motivationContext, null, 2)}

WICHTIGE REGELN:
- antworte auf Deutsch
- gib AUSSCHLIESSLICH gültiges JSON zurück
- keine Markdown-Formatierung
- keine Einleitung
- keine zusätzlichen Sätze vor oder nach dem JSON
- kein Rollenspiel
- keine Wir-Form
- kein kitschiger Ton
- keine Meta-Sätze wie:
  - "Hier ist deine Motivation"
  - "Deine Motivation"
  - "Ich bin stolz auf dich"
  - "Lass uns gemeinsam"

INHALTSREGELN:
- verwechsle niemals Gewicht, Körpergröße, Geschwindigkeit oder andere Metriken
- "Körpergröße" darf niemals in kg beschrieben werden
- "Gewicht" darf niemals als Körpergröße beschrieben werden
- wenn ein Wert nicht sicher interpretierbar ist, nutze ihn nicht
- wenn currentWeightKg und targetWeightKg vorhanden sind, formuliere den Abstand neutral
- sage NICHT automatisch "abnehmen", "zunehmen", "wieder erreichen" oder ähnliche Richtungen, wenn das nicht eindeutig ist
- nutze für dataPoint nur sichere Daten
- dataPoint muss konkret und wahr sein
- nextFocus muss kurz, konkret und realistisch sein
- keine generischen Aussagen ohne Datenbezug

JSON-Format:
{
  "motivation": "maximal 1 kurzer motivierender Satz",
  "dataPoint": "maximal 1 kurzer echter Datenbezug",
  "nextFocus": "maximal 1 kurzer klarer nächster Fokus"
}
`.trim();
}

function extractJsonObject(text: string): {
  motivation?: string;
  dataPoint?: string;
  nextFocus?: string;
} | null {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {}

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function buildInsightsPrompt(context: unknown) {
  return `
Analysiere den Athletenkontext datenbasiert.

Kontext:
${JSON.stringify(context, null, 2)}

Gib JSON zurück mit genau dieser Struktur:
{
  "summary": "kurze Zusammenfassung",
  "strengths": ["..."],
  "risks": ["..."],
  "nextSteps": ["..."],
  "focusMetricIds": ["optional cardId"]
}

Regeln:
- nichts erfinden
- wenn Daten fehlen, ehrlich benennen
- strengths/risks/nextSteps jeweils 0-4 Einträge
- keine medizinischen Diagnosen
- klare, brauchbare Aussagen
`.trim();
}

function mapIntentToMessageKind(
  intent: AiIntent
): "chat" | "motivation" | "insight" {
  if (intent === "motivation") return "motivation";
  if (intent === "insights") return "insight";
  return "chat";
}

function buildDailyReviewPrompt(
  context: unknown,
  userText: string,
  historyText: string
) {
  return `
Athletenkontext:
${JSON.stringify(context, null, 2)}

Letzte Konversation:
${historyText}

Letzte User-Nachricht:
${userText}

Aufgabe:
Analysiere den heutigen Tag des Athleten datenbasiert.

Worauf du schauen sollst:
- heutige Einträge
- Vergleich heute vs gestern
- relevante Trends oder letzte 7/30 Tage
- positives Signal
- Schwachstelle oder fehlender Bereich
- kurzer motivierender Abschluss

Regeln:
- nutze nur echte Daten
- wenn heute wenig Daten vorhanden sind, sage das offen
- wenn sinnvoll, vergleiche mit gestern oder dem üblichen Verlauf
- gib keine medizinischen Diagnosen
- kompakt, konkret, coachig

Antwortstruktur:
1. Tagesfazit in 1-2 Sätzen
2. Was heute gut war
3. Was heute schwächer war oder fehlt
4. Nächster Fokus in 1-2 kurzen Punkten
5. Sehr kurze Motivation am Ende
`.trim();
}

function buildProgressReviewPrompt(
  context: unknown,
  userText: string,
  historyText: string
) {
  return `
Athletenkontext:
${JSON.stringify(context, null, 2)}

Letzte Konversation:
${historyText}

Letzte User-Nachricht:
${userText}

Aufgabe:
Beantworte die Frage nach Fortschritt und Verbesserung datenbasiert.

Worauf du schauen sollst:
- monthly / weekly comparisons
- bestValues
- goalProgress
- consistency
- strongestPositiveMetric
- biggestDropMetric nur wenn sinnvoll

Regeln:
- benenne konkrete Verbesserungen klar
- nutze echte Zahlen oder Richtungen, wenn vorhanden
- wenn Fortschritt nicht klar belegbar ist, sage das offen
- nenne auch, was noch hinterherhinkt
- ende mit kurzem motivierenden Coach-Satz

Antwortstruktur:
1. Wichtigste Verbesserung
2. Konkreter Trend oder Vergleich
3. Was das für den Athleten bedeutet
4. Wo noch Potenzial liegt
5. 1-2 nächste Schritte
`.trim();
}

function buildLongTermReviewPrompt(
  context: unknown,
  userText: string,
  historyText: string
) {
  return `
Athletenkontext:
${JSON.stringify(context, null, 2)}

Letzte Konversation:
${historyText}

Letzte User-Nachricht:
${userText}

Aufgabe:
Analysiere die längerfristige Entwicklung des Athleten.

Worauf du schauen sollst:
- längerfristige Trends
- goalProgress
- consistency über Zeit
- bestValues
- monthly comparisons
- Entwicklung von Gewohnheiten, falls aus den Daten erkennbar

Regeln:
- keine erfundenen Jahreszahlen oder langen Geschichten
- wenn "letztes Jahr" gefragt wird, aber die Daten diesen Zeitraum nicht vollständig abdecken, sag das offen
- nutze nur das, was im Kontext sichtbar ist
- fasse die Entwicklung wie ein echter Coach zusammen

Antwortstruktur:
1. Gesamtentwicklung
2. Größte Verbesserung
3. Größte Bremse oder Baustelle
4. Was sich im Verhalten / Tracking erkennen lässt
5. Motivierender Abschluss
`.trim();
}

function buildGoalReviewPrompt(
  context: unknown,
  userText: string,
  historyText: string
) {
  return `
Athletenkontext:
${JSON.stringify(context, null, 2)}

Letzte Konversation:
${historyText}

Letzte User-Nachricht:
${userText}

Aufgabe:
Beantworte zielbezogene Fragen datenbasiert.

Worauf du schauen sollst:
- goalProgress
- current weight vs target weight
- daysUntilEvent
- consistency
- monthly trend

Regeln:
- klar sagen, wie nah oder fern das Ziel ist
- wenn Ziel nicht sauber messbar ist, ehrlich sagen
- motivierend, aber realistisch bleiben

Antwortstruktur:
1. Aktueller Stand zum Ziel
2. Was gerade in die richtige Richtung läuft
3. Was das Ziel aktuell bremst
4. 1-2 klare nächste Schritte
`.trim();
}

function buildConsistencyPrompt(
  context: unknown,
  userText: string,
  historyText: string
) {
  return `
Athletenkontext:
${JSON.stringify(context, null, 2)}

Letzte Konversation:
${historyText}

Letzte User-Nachricht:
${userText}

Aufgabe:
Beantworte Fragen zur Konstanz und zum Dranbleiben.

Worauf du schauen sollst:
- consistencyScore7d
- consistencyScore30d
- tracked days
- mostConsistentMetric
- mostRecentlyTrackedMetric

Regeln:
- sage klar, ob der Athlet aktuell konstant trackt oder nicht
- wenn es Lücken gibt, benenne sie offen
- kurze, klare Verbesserungsempfehlungen

Antwortstruktur:
1. Einschätzung der Konstanz
2. Was gut läuft
3. Wo Lücken sind
4. Praktischer Fokus für mehr Regelmäßigkeit
`.trim();
}

function buildGeneralPrompt(
  context: unknown,
  userText: string,
  historyText: string
) {
  return `
Athletenkontext:
${JSON.stringify(context, null, 2)}

Letzte Konversation:
${historyText}

Letzte User-Nachricht:
${userText}

Aufgabe:
Beantworte die letzte User-Nachricht hilfreich, datenbasiert und coachig.

Regeln:
- nutze Profil + Tagesdaten + Vergleiche + Trends + Fortschritt
- wenn die Frage unscharf ist, gib trotzdem die nützlichste datenbasierte Antwort
- bei Verbesserung: konkrete Fortschritte nennen
- bei Motivation: persönlich und kurz motivieren
- bei fehlenden Daten: offen sagen, was fehlt
- nicht generisch antworten
`.trim();
}

function buildPromptForIntent(
  intent: AiIntent,
  context: unknown,
  userText: string,
  historyText: string
) {
  switch (intent) {
    case "daily_review":
      return buildDailyReviewPrompt(context, userText, historyText);
    case "progress_review":
      return buildProgressReviewPrompt(context, userText, historyText);
    case "long_term_review":
      return buildLongTermReviewPrompt(context, userText, historyText);
    case "goal_review":
      return buildGoalReviewPrompt(context, userText, historyText);
    case "consistency_review":
      return buildConsistencyPrompt(context, userText, historyText);
    case "motivation":
      return buildMotivationPrompt(context);
    case "insights":
      return buildInsightsPrompt(context);
    default:
      return buildGeneralPrompt(context, userText, historyText);
  }
}

router.get("/thread", async (req: AuthRequest, res: Response) => {
  try {
    const athleteId = req.user!.userId;

    const messages = await AiChatMessage.find({ athleteId })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    const lastMessage = messages[messages.length - 1];

    const unreadCount = messages.filter(
      (m) => m.role === "assistant" && !m.readAt
    ).length;

    res.json({
      success: true,
      data: {
        thread: {
          _id: "SPAQ-bot",
          type: "assistant",
          title: "SPAQ Bot",
          lastMessage:
            lastMessage?.text ||
            "Frag mich nach Motivation, Trends, Fortschritt oder deinem heutigen Tag.",
          lastMessageAt: lastMessage?.createdAt || new Date(),
          unreadCount,
        },
        messages: messages.map((m) => ({
          _id: String(m._id),
          threadId: "SPAQ-bot",
          senderId: m.role === "assistant" ? "SPAQ-bot" : athleteId,
          receiverId: m.role === "assistant" ? athleteId : "SPAQ-bot",
          text: m.text,
          createdAt: m.createdAt,
          readAt: m.readAt ?? null,
          meta: {
            type: m.role === "assistant" ? "assistant" : "user",
            provider: m.meta?.provider || "ollama",
            model: m.meta?.model || "",
            kind: m.meta?.kind || "chat",
            isOnboardingWelcome: Boolean(m.meta?.isOnboardingWelcome),
          },
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/ai/thread error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

router.post("/thread/read", async (req: AuthRequest, res: Response) => {
  try {
    const athleteId = req.user!.userId;

    await AiChatMessage.updateMany(
      {
        athleteId,
        role: "assistant",
        readAt: null,
      },
      {
        $set: { readAt: new Date() },
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("POST /api/ai/thread/read error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

router.get("/motivation", async (req: AuthRequest, res: Response) => {
  try {
    const athleteId = req.user!.userId;
    const date =
      typeof req.query.date === "string" ? req.query.date : undefined;

    const context = await buildAthleteAiContext(athleteId, date);
    const prompt = buildMotivationPrompt(context);

    try {
      const result = await generateSPAQText({
        system: SYSTEM_PROMPT,
        prompt,
        temperature: 0.25,
      });

      const parsed = extractJsonObject(result.text);

      res.json({
        success: true,
        data: {
          text: result.text,
          structured: parsed
            ? {
                motivation:
                  typeof parsed.motivation === "string"
                    ? parsed.motivation.trim()
                    : "",
                dataPoint:
                  typeof parsed.dataPoint === "string"
                    ? parsed.dataPoint.trim()
                    : "",
                nextFocus:
                  typeof parsed.nextFocus === "string"
                    ? parsed.nextFocus.trim()
                    : "",
              }
            : null,
          provider: result.provider,
          model: result.model,
          fallback: false,
        },
      });
    } catch (error) {
      console.error("GET /api/ai/motivation fallback:", error);

      res.json({
        success: true,
        data: {
          text: "",
          structured: {
            motivation: "Bleib heute konstant und halte dein Tracking sauber.",
            dataPoint: "",
            nextFocus: "Konzentrier dich auf den nächsten guten Eintrag.",
          },
          provider: "fallback",
          model: "static",
          fallback: true,
        },
      });
    }
  } catch (error) {
    console.error("GET /api/ai/motivation error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "AI motivation failed",
    });
  }
});

router.get("/insights", async (req: AuthRequest, res: Response) => {
  try {
    const athleteId = req.user!.userId;
    const date =
      typeof req.query.date === "string" ? req.query.date : undefined;

    const context = await buildAthleteAiContext(athleteId, date);
    const prompt = buildInsightsPrompt(context);

    const result = await generateSPAQText({
      system: SYSTEM_PROMPT,
      prompt,
      temperature: 0.35,
    });

    res.json({
      success: true,
      data: {
        raw: result.text,
        provider: result.provider,
        model: result.model,
      },
    });
  } catch (error) {
    console.error("GET /api/ai/insights error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "AI insights failed",
    });
  }
});

router.post("/thread/messages", async (req: AuthRequest, res: Response) => {
  try {
    const athleteId = req.user!.userId;
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    const date =
      typeof req.body?.selectedDate === "string"
        ? req.body.selectedDate
        : undefined;

    if (!text) {
      res.status(400).json({ success: false, error: "Text is required" });
      return;
    }

    const detectedIntent = detectIntent(text);
    const messageKind = mapIntentToMessageKind(detectedIntent);

    const userMessage = await AiChatMessage.create({
      athleteId,
      role: "user",
      text,
      readAt: new Date(),
      meta: {
        provider: "client",
        model: "",
        kind: messageKind,
      },
    });

    const history = await AiChatMessage.find({ athleteId })
      .sort({ createdAt: 1 })
      .limit(12)
      .lean();

    const context = await buildAthleteAiContext(athleteId, date);
    const historyText = formatHistory(history);
    const prompt = buildPromptForIntent(
      detectedIntent,
      context,
      text,
      historyText
    );

    const temperature =
      detectedIntent === "motivation"
        ? 0.85
        : detectedIntent === "insights"
        ? 0.35
        : detectedIntent === "daily_review"
        ? 0.55
        : detectedIntent === "progress_review"
        ? 0.5
        : detectedIntent === "long_term_review"
        ? 0.5
        : 0.6;

    const result = await generateSPAQText({
      system: SYSTEM_PROMPT,
      prompt,
      temperature,
    });

    const assistantMessage = await AiChatMessage.create({
      athleteId,
      role: "assistant",
      text: result.text,
      readAt: null,
      meta: {
        provider: result.provider,
        model: result.model,
        kind: messageKind,
      },
    });

    res.json({
      success: true,
      data: {
        intent: detectedIntent,
        userMessage: {
          _id: String(userMessage._id),
          threadId: "SPAQ-bot",
          senderId: athleteId,
          receiverId: "SPAQ-bot",
          text: userMessage.text,
          createdAt: userMessage.createdAt,
          readAt: userMessage.readAt,
          meta: {
            type: "user",
            provider: "client",
            model: "",
            kind: detectedIntent,
          },
        },
        assistantMessage: {
          _id: String(assistantMessage._id),
          threadId: "SPAQ-bot",
          senderId: "SPAQ-bot",
          receiverId: athleteId,
          text: assistantMessage.text,
          createdAt: assistantMessage.createdAt,
          readAt: assistantMessage.readAt,
          meta: {
            type: "assistant",
            provider: result.provider,
            model: result.model,
            kind: detectedIntent,
          },
        },
      },
    });
  } catch (error) {
    console.error("POST /api/ai/thread/messages error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "AI chat failed",
    });
  }
});

export default router;
