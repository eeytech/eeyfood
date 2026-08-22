"use server";

import { buscarRestaurantePorSlug } from "@fsw/db";
import { 
  addDays,
  addMinutes, 
  format, 
  isAfter, 
  isBefore, 
  setHours, 
  setMinutes, 
} from "date-fns";
import { ptBR } from "date-fns/locale";

export const getAvailableSchedulingSlots = async (slug: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];

  // 1. Buscar horários de funcionamento do restaurante (simulado ou real se houver tabela)
  // Como temos a operatingHoursTable, vamos usar os dados dela se disponíveis nas queries.
  // Por enquanto, vamos gerar para hoje e amanhã.
  
  const now = new Date();
  const slots = [];
  const daysToGenerate = 3; // Hoje e mais 2 dias

  for (let i = 0; i < daysToGenerate; i++) {
    const currentDay = addDays(now, i);

    // Aqui poderíamos filtrar pelos horários reais do banco
    // Simulando: Aberto das 11:00 às 23:00
    const openTime = 11;
    const closeTime = 23;

    let slotTime = setMinutes(setHours(currentDay, openTime), 0);
    const endTime = setMinutes(setHours(currentDay, closeTime), 0);

    const dayLabel = i === 0 ? "Hoje" : i === 1 ? "Amanhã" : format(currentDay, "EEEE", { locale: ptBR });
    const daySlots = [];

    while (isBefore(slotTime, endTime)) {
      // Regra: No dia de hoje, só mostrar horários com pelo menos 45 min de antecedência
      const minAdvanceTime = addMinutes(now, 45);
      
      if (isAfter(slotTime, minAdvanceTime)) {
        daySlots.push({
          value: slotTime.toISOString(),
          label: format(slotTime, "HH:mm"),
        });
      }
      
      slotTime = addMinutes(slotTime, 30); // Janelas de 30 em 30 minutos
    }

    if (daySlots.length > 0) {
      slots.push({
        label: dayLabel,
        date: format(currentDay, "yyyy-MM-dd"),
        items: daySlots,
      });
    }
  }

  return slots;
};
