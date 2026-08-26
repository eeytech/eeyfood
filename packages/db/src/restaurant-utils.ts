import { OperatingHours, RestaurantStatus } from "./types";

export const isRestaurantOpen = (
  status: RestaurantStatus,
  operatingHours: OperatingHours[],
) => {
  if (status === "ALWAYS_OPEN") return true;
  if (status === "ALWAYS_CLOSED") return false;

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 (Sunday) to 6 (Saturday)
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const todayHours = operatingHours.find((h) => h.dayOfWeek === dayOfWeek);

  if (!todayHours) return false;

  const [openH, openM] = todayHours.openTime.split(":").map(Number);
  const [closeH, closeM] = todayHours.closeTime.split(":").map(Number);

  const openTimeMinutes = openH * 60 + openM;
  const closeTimeMinutes = closeH * 60 + closeM;

  // Handle shifts that cross midnight
  if (closeTimeMinutes < openTimeMinutes) {
    return currentTime >= openTimeMinutes || currentTime <= closeTimeMinutes;
  }

  return currentTime >= openTimeMinutes && currentTime <= closeTimeMinutes;
};

export const getNextOpeningTime = (operatingHours: OperatingHours[]) => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  
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
        const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
        
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
