import type { OperatingHours, RestaurantStatus } from "@fsw/db";

const getBrazilTime = () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  let dayOfWeekStr = "";
  let hours = 0;
  let minutes = 0;

  for (const part of parts) {
    if (part.type === "weekday") dayOfWeekStr = part.value;
    if (part.type === "hour") hours = parseInt(part.value);
    if (part.type === "minute") minutes = parseInt(part.value);
  }

  const weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayOfWeek = weekdays.indexOf(dayOfWeekStr);

  return { dayOfWeek, hours, minutes };
};

export const isRestaurantOpen = (
  status: RestaurantStatus,
  operatingHours: OperatingHours[],
) => {
  if (status === "ALWAYS_OPEN") return { isOpen: true };
  if (status === "ALWAYS_CLOSED") return { isOpen: false };

  const { dayOfWeek, hours, minutes } = getBrazilTime();
  const currentTime = hours * 60 + minutes;

  const todayHours = operatingHours.find((h) => h.dayOfWeek === dayOfWeek);

  if (!todayHours) return { isOpen: false };

  const [openH, openM] = todayHours.openTime.split(":").map(Number);
  const [closeH, closeM] = todayHours.closeTime.split(":").map(Number);

  const openTimeMinutes = openH * 60 + openM;
  const closeTimeMinutes = closeH * 60 + closeM;

  let isOpen = false;

  // Handle shifts that cross midnight
  if (closeTimeMinutes < openTimeMinutes) {
    isOpen = currentTime >= openTimeMinutes || currentTime <= closeTimeMinutes;
  } else {
    isOpen = currentTime >= openTimeMinutes && currentTime <= closeTimeMinutes;
  }

  return { 
    isOpen, 
    closeTime: isOpen ? todayHours.closeTime : undefined 
  };
};

export const getNextOpeningTime = (operatingHours: OperatingHours[]) => {
  const { dayOfWeek, hours, minutes } = getBrazilTime();
  const currentTimeMinutes = hours * 60 + minutes;
  
  // Sort hours by day and time
  const sortedHours = [...operatingHours].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.openTime.localeCompare(b.openTime);
  });

  if (sortedHours.length === 0) return null;

  // Find next opening today or in the future
  for (let i = 0; i < 7; i++) {
    const targetDay = (dayOfWeek + i) % 7;
    const dayHours = sortedHours.filter((h) => h.dayOfWeek === targetDay);
    
    for (const h of dayHours) {
      if (i === 0) {
        // Today: check if opening is in the future
        const [openH, openM] = h.openTime.split(":").map(Number);
        const openTimeMinutes = openH * 60 + openM;

        if (openTimeMinutes > currentTimeMinutes) {
          return h;
        }
      } else {
        // Future day
        return h;
      }
    }
  }

  return null;
};
