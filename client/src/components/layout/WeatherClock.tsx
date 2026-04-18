import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

type WeatherState = {
  temperature: number | null;
  weatherCode: number | null;
  isDay: boolean;
  city: string;
  loading: boolean;
};

async function reverseGeocode(lat: number, lon: number) {
  try {
    const { data } = await api.get("/location/reverse", {
      params: { lat, lon },
    });

    return data?.data?.city ?? "";
  } catch {
    return "";
  }
}

function getMoonPhase(date: Date) {
  const knownNewMoon = new Date("2000-01-06T18:14:00Z").getTime();
  const lunarCycle = 29.53058867;
  const daysSince = (date.getTime() - knownNewMoon) / (1000 * 60 * 60 * 24);
  const phase = ((daysSince % lunarCycle) + lunarCycle) % lunarCycle;
  const normalized = phase / lunarCycle;

  if (normalized < 0.0625 || normalized >= 0.9375) {
    return { emoji: "🌑", label: "Neumond" };
  }
  if (normalized < 0.1875) {
    return { emoji: "🌒", label: "Zunehmende Sichel" };
  }
  if (normalized < 0.3125) {
    return { emoji: "🌓", label: "Erstes Viertel" };
  }
  if (normalized < 0.4375) {
    return { emoji: "🌔", label: "Zunehmender Mond" };
  }
  if (normalized < 0.5625) {
    return { emoji: "🌕", label: "Vollmond" };
  }
  if (normalized < 0.6875) {
    return { emoji: "🌖", label: "Abnehmender Mond" };
  }
  if (normalized < 0.8125) {
    return { emoji: "🌗", label: "Letztes Viertel" };
  }
  return { emoji: "🌘", label: "Abnehmende Sichel" };
}

function getWeatherMeta(code: number | null, isDay: boolean, now: Date) {
  const moon = getMoonPhase(now);

  if (code === null) {
    return { emoji: "📍", label: "Standort wird geladen" };
  }

  switch (code) {
    case 0:
      return isDay
        ? { emoji: "☀️", label: "Klar" }
        : { emoji: moon.emoji, label: moon.label };

    case 1:
    case 2:
      return isDay
        ? { emoji: "🌤️", label: "Leicht bewölkt" }
        : { emoji: "☁️", label: `Leicht bewölkt · ${moon.label}` };

    case 3:
      return { emoji: "☁️", label: "Bewölkt" };

    case 45:
    case 48:
      return { emoji: "🌫️", label: "Nebel" };

    case 51:
    case 53:
    case 55:
      return { emoji: "🌦️", label: "Nieselregen" };

    case 56:
    case 57:
      return { emoji: "🧊", label: "Gefrierender Nieselregen" };

    case 61:
    case 63:
    case 65:
      return { emoji: "🌧️", label: "Regen" };

    case 66:
    case 67:
      return { emoji: "🧊", label: "Gefrierender Regen" };

    case 71:
    case 73:
    case 75:
    case 77:
      return { emoji: "❄️", label: "Schnee" };

    case 80:
    case 81:
    case 82:
      return { emoji: "🌦️", label: "Regenschauer" };

    case 85:
    case 86:
      return { emoji: "🌨️", label: "Schneeschauer" };

    case 95:
      return { emoji: "⛈️", label: "Gewitter" };

    case 96:
    case 99:
      return { emoji: "⛈️", label: "Gewitter mit Hagel" };

    default:
      return isDay
        ? { emoji: "🌍", label: "Wetter" }
        : { emoji: moon.emoji, label: moon.label };
  }
}

export default function WeatherClock() {
  const [now, setNow] = useState(new Date());
  const [weather, setWeather] = useState<WeatherState>({
    temperature: null,
    weatherCode: null,
    isDay: true,
    city: "",
    loading: true,
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fallback = () => {
      if (cancelled) return;
      setWeather({
        temperature: null,
        weatherCode: null,
        isDay: true,
        city: "Standort aus",
        loading: false,
      });
    };

    const loadWeather = async (lat: number, lon: number) => {
      try {
        const [weatherRes, city] = await Promise.all([
          fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`
          ),
          reverseGeocode(lat, lon),
        ]);

        if (!weatherRes.ok) {
          throw new Error("Weather fetch failed");
        }

        const weatherData = await weatherRes.json();
        const current = weatherData?.current;

        if (cancelled) return;

        setWeather({
          temperature:
            typeof current?.temperature_2m === "number"
              ? current.temperature_2m
              : null,
          weatherCode:
            typeof current?.weather_code === "number"
              ? current.weather_code
              : null,
          isDay: current?.is_day === 1,
          city: city || "Dein Standort",
          loading: false,
        });
      } catch {
        fallback();
      }
    };

    if (!("geolocation" in navigator)) {
      fallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void loadWeather(position.coords.latitude, position.coords.longitude);
      },
      () => fallback(),
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 1000 * 60 * 15,
      }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  const timeText = useMemo(
    () =>
      new Intl.DateTimeFormat("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(now),
    [now]
  );

  const dateText = useMemo(
    () =>
      new Intl.DateTimeFormat("de-DE", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      }).format(now),
    [now]
  );

  const meta = getWeatherMeta(weather.weatherCode, weather.isDay, now);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-xl border border-subtle bg-surface px-3 py-2">
        <span className="text-base leading-none">{meta.emoji}</span>

        <div className="leading-tight">
          <div className="text-[11px] text-muted">
            {weather.loading
              ? "Wetter wird geladen…"
              : `${weather.city || "Standort"} · ${meta.label}`}
          </div>
          <div className="text-sm font-medium text-primary">
            {weather.temperature !== null
              ? `${Math.round(weather.temperature)}°C`
              : "—"}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-subtle bg-surface px-3 py-2 leading-tight">
        <div className="text-[11px] text-muted">{dateText}</div>
        <div className="text-sm font-medium text-primary">{timeText}</div>
      </div>
    </div>
  );
}
