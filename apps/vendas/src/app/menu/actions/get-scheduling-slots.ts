"use server";

import { asc, buscarRestaurantePorSlug, db, eq, operatingHoursTable } from "@fsw/db";

const TIMEZONE = "America/Sao_Paulo";
const BRASIL_OFFSET_HOURS = 3; // BRT é UTC-3, portanto UTC = BRT + 3 horas

const getBrazilParts = (date: Date = new Date()) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value])
  );
  return {
    year: parseInt(parts.year, 10),
    month: parseInt(parts.month, 10), // 1-indexed
    day: parseInt(parts.day, 10),
    hour: parseInt(parts.hour === "24" ? "0" : parts.hour, 10),
    minute: parseInt(parts.minute, 10),
  };
};

const createBrazilDate = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
) => {
  return new Date(Date.UTC(year, month - 1, day, hour + BRASIL_OFFSET_HOURS, minute));
};

const formatSlotLabel = (hour: number, minute: number) => {
  const h = String(hour).padStart(2, "0");
  const m = String(minute).padStart(2, "0");
  return `${h}:${m}`;
};

const formatDayLabel = (
  year: number,
  month: number,
  day: number,
  index: number
) => {
  if (index === 0) return "Hoje";
  if (index === 1) return "Amanhã";
  const date = createBrazilDate(year, month, day, 12, 0);
  const weekday = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    weekday: "long",
  }).format(date);
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
};

const parseTimeToMinutes = (timeStr?: string | null, defaultMinutes: number = 0) => {
  if (!timeStr) return defaultMinutes;
  const [h, m] = timeStr.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return defaultMinutes;
  return h * 60 + m;
};

export const getAvailableSchedulingSlots = async (slug: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant || restaurant.isOrderSchedulingEnabled === false) return [];

  const operatingHours = await db
    .select()
    .from(operatingHoursTable)
    .where(eq(operatingHoursTable.restaurantId, restaurant.id))
    .orderBy(asc(operatingHoursTable.dayOfWeek));

  const now = new Date();
  const brazilNow = getBrazilParts(now);

  const minAdvanceMinutes = restaurant.schedulingMinAdvanceMinutes ?? 45;
  const slotIntervalMinutes = Math.max(5, restaurant.schedulingSlotIntervalMinutes ?? 30);
  const daysToGenerate = Math.max(1, Math.min(30, restaurant.schedulingMaxDays ?? 3));
  const hoursMode = restaurant.schedulingHoursMode ?? "OPERATING_HOURS";

  const minAdvanceTimeMs = now.getTime() + minAdvanceMinutes * 60 * 1000;
  const slots = [];

  const weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  for (let i = 0; i < daysToGenerate; i++) {
    const targetYear = brazilNow.year;
    const targetMonth = brazilNow.month;
    const targetDay = brazilNow.day + i;

    let openMinutes = 11 * 60;
    let closeMinutes = 23 * 60;

    if (hoursMode === "CUSTOM") {
      openMinutes = parseTimeToMinutes(restaurant.schedulingCustomStartTime, 11 * 60);
      closeMinutes = parseTimeToMinutes(restaurant.schedulingCustomEndTime, 23 * 60);
    } else {
      // OPERATING_HOURS: determinar o dia da semana no Brasil
      const sampleDate = createBrazilDate(targetYear, targetMonth, targetDay, 12, 0);
      const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: TIMEZONE,
        weekday: "long",
      });
      const weekdayName = weekdayFormatter.format(sampleDate);
      const dayOfWeek = weekdays.indexOf(weekdayName);

      const dayConfig = operatingHours.find((h) => h.dayOfWeek === dayOfWeek);

      if (dayConfig) {
        openMinutes = parseTimeToMinutes(dayConfig.openTime, 11 * 60);
        closeMinutes = parseTimeToMinutes(dayConfig.closeTime, 23 * 60);
      } else if (operatingHours.length > 0) {
        // Restaurante tem horários configurados, mas este dia não está ativo (fechado)
        continue;
      } else {
        // Caso não tenha configuração específica (operatingHours vazio), usa fallback 11:00 às 23:00
        openMinutes = 11 * 60;
        closeMinutes = 23 * 60;
      }
    }

    const dayLabel = formatDayLabel(targetYear, targetMonth, targetDay, i);
    const daySlots = [];

    // Gerar slots no intervalo
    if (closeMinutes > openMinutes) {
      for (let totalMin = openMinutes; totalMin < closeMinutes; totalMin += slotIntervalMinutes) {
        const h = Math.floor(totalMin / 60) % 24;
        const m = totalMin % 60;
        const slotDate = createBrazilDate(targetYear, targetMonth, targetDay, h, m);

        if (slotDate.getTime() > minAdvanceTimeMs) {
          daySlots.push({
            value: slotDate.toISOString(),
            label: formatSlotLabel(h, m),
          });
        }
      }
    } else if (closeMinutes < openMinutes) {
      // Turno que cruza a meia-noite (ex: 18:00 às 02:00)
      for (let totalMin = openMinutes; totalMin < 24 * 60; totalMin += slotIntervalMinutes) {
        const h = Math.floor(totalMin / 60) % 24;
        const m = totalMin % 60;
        const slotDate = createBrazilDate(targetYear, targetMonth, targetDay, h, m);

        if (slotDate.getTime() > minAdvanceTimeMs) {
          daySlots.push({
            value: slotDate.toISOString(),
            label: formatSlotLabel(h, m),
          });
        }
      }
    }

    if (daySlots.length > 0) {
      const dateSample = createBrazilDate(targetYear, targetMonth, targetDay, 12, 0);
      const isoDateStr = dateSample.toISOString().slice(0, 10);

      slots.push({
        label: dayLabel,
        date: isoDateStr,
        items: daySlots,
      });
    }
  }

  return slots;
};

