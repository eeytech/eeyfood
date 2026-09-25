import type React from "react";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_CUSTOMER" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type TicketCategory =
  | "PDV_CAIXA"
  | "KDS_COZINHA"
  | "CARDAPIO_ESTOQUE"
  | "IMPRESSAO_HARDWARE"
  | "FINANCEIRO_FISCAL"
  | "INTEGRACOES"
  | "OUTRO";

export type TicketSender = "USER" | "SUPPORT";

export interface TicketMessage {
  id: string;
  sender: TicketSender;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  protocol: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  userName: string;
  userEmail: string;
  userPhone?: string;
  restaurantSlug: string;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}
