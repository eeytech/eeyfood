export const getBrazilTime = () => {
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
        if (part.type === "weekday")
            dayOfWeekStr = part.value;
        if (part.type === "hour")
            hours = parseInt(part.value, 10) % 24;
        if (part.type === "minute")
            minutes = parseInt(part.value, 10);
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
export const isRestaurantOpen = (status, operatingHours) => {
    if (status === "ALWAYS_OPEN")
        return { isOpen: true };
    if (status === "ALWAYS_CLOSED")
        return { isOpen: false };
    const { dayOfWeek, hours, minutes } = getBrazilTime();
    const currentTime = hours * 60 + minutes;
    // 1. Verificar se o turno de ontem estendeu após a meia-noite e ainda está ativo agora
    const yesterdayDay = (dayOfWeek + 6) % 7;
    const yesterdayHours = operatingHours.find((h) => h.dayOfWeek === yesterdayDay);
    if (yesterdayHours) {
        const [yOpenH, yOpenM] = yesterdayHours.openTime.split(":").map(Number);
        const [yCloseH, yCloseM] = yesterdayHours.closeTime.split(":").map(Number);
        const yOpenMinutes = yOpenH * 60 + yOpenM;
        const yCloseMinutes = yCloseH * 60 + yCloseM;
        // Turno que cruza a meia-noite (ex: 18:00 às 02:00) onde currentTime <= yCloseMinutes
        if (yCloseMinutes < yOpenMinutes && currentTime <= yCloseMinutes) {
            return {
                isOpen: true,
                closeTime: yesterdayHours.closeTime,
            };
        }
    }
    // 2. Verificar o turno de hoje
    const todayHours = operatingHours.find((h) => h.dayOfWeek === dayOfWeek);
    if (!todayHours)
        return { isOpen: false };
    const [openH, openM] = todayHours.openTime.split(":").map(Number);
    const [closeH, closeM] = todayHours.closeTime.split(":").map(Number);
    const openTimeMinutes = openH * 60 + openM;
    const closeTimeMinutes = closeH * 60 + closeM;
    // Se o turno de hoje cruza a meia-noite (ex: 18:00 às 02:00 ou 11:00 às 00:00)
    if (closeTimeMinutes < openTimeMinutes) {
        if (currentTime >= openTimeMinutes) {
            return {
                isOpen: true,
                closeTime: todayHours.closeTime,
            };
        }
        return { isOpen: false };
    }
    // Turno normal no mesmo dia (ex: 11:00 às 23:00)
    const isOpen = currentTime >= openTimeMinutes && currentTime <= closeTimeMinutes;
    return {
        isOpen,
        closeTime: isOpen ? todayHours.closeTime : undefined,
    };
};
export const getNextOpeningTime = (operatingHours) => {
    const { dayOfWeek, hours, minutes } = getBrazilTime();
    const currentTimeMinutes = hours * 60 + minutes;
    // Sort hours by day and time
    const sortedHours = [...operatingHours].sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek)
            return a.dayOfWeek - b.dayOfWeek;
        return a.openTime.localeCompare(b.openTime);
    });
    if (sortedHours.length === 0)
        return null;
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
            }
            else {
                // Future day
                return h;
            }
        }
    }
    return null;
};
