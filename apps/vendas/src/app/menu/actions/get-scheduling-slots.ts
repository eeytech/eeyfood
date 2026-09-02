"use server";

import { buscarRestaurantePorSlug } from "@fsw/db";

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

export const getAvailableSchedulingSlots = async (slug: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];

  const now = new Date();
  const brazilNow = getBrazilParts(now);
  const minAdvanceTimeMs = now.getTime() + 45 * 60 * 1000;

  const slots = [];
  const daysToGenerate = 3; // Hoje e mais 2 dias

  const openHour = 11;
  const closeHour = 23;

  for (let i = 0; i < daysToGenerate; i++) {
    const targetYear = brazilNow.year;
    const targetMonth = brazilNow.month;
    const targetDay = brazilNow.day + i;

    const dayLabel = formatDayLabel(targetYear, targetMonth, targetDay, i);
    const daySlots = [];

    for (let h = openHour; h < closeHour; h++) {
      for (let m = 0; m < 60; m += 30) {
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

