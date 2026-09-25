"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import type { SupportTicket, TicketCategory, TicketPriority, TicketStatus } from "./suporte-types";

// Armazenamento em memória dos chamados (persistente durante o ciclo do processo do servidor)
const globalTickets: SupportTicket[] = [
  {
    id: "tkt-1001",
    protocol: "#SUP-84920",
    title: "Dúvida sobre configuração da impressora térmica Elgin i9",
    description: "Gostaria de saber como definir a impressão automática para o setor da cozinha quando o pedido for aprovado no PDV.",
    category: "IMPRESSAO_HARDWARE",
    priority: "NORMAL",
    status: "RESOLVED",
    userName: "Matheus Silva",
    userEmail: "matheus@restaurante.com",
    userPhone: "(11) 98765-4321",
    restaurantSlug: "",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    messages: [
      {
        id: "msg-1",
        sender: "USER",
        senderName: "Matheus Silva",
        content: "Gostaria de saber como definir a impressão automática para o setor da cozinha quando o pedido for aprovado no PDV.",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "msg-2",
        sender: "SUPPORT",
        senderName: "Equipe de Suporte Técnico",
        content: "Olá Matheus! Você pode configurar isso acessando Cardápio > Setores de Produção, vinculando a categoria desejada ao setor da cozinha e ativando a opção de auto-impressão via Web Serial nas configurações do PDV.",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "msg-3",
        sender: "USER",
        senderName: "Matheus Silva",
        content: "Perfeito, deu super certo aqui! Muito obrigado pela agilidade.",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "tkt-1002",
    protocol: "#SUP-84921",
    title: "Habilitar emissão de NFC-e em contingência offline",
    description: "Estamos com oscilação na internet da loja física e precisamos ativar a contingência offline para não travar a emissão no caixa.",
    category: "FINANCEIRO_FISCAL",
    priority: "HIGH",
    status: "IN_PROGRESS",
    userName: "Gerência Operacional",
    userEmail: "gerencia@restaurante.com",
    userPhone: "(11) 99888-7766",
    restaurantSlug: "",
    createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    messages: [
      {
        id: "msg-4",
        sender: "USER",
        senderName: "Gerência Operacional",
        content: "Estamos com oscilação na internet da loja física e precisamos ativar a contingência offline para não travar a emissão no caixa.",
        createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "msg-5",
        sender: "SUPPORT",
        senderName: "Especialista Fiscal",
        content: "Olá! Nosso time fiscal já verificou seus parâmetros da SEFAZ. O módulo de contingência foi ativado para o seu CNPJ. Por favor, reinicie o PDV e realize uma venda de teste.",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "tkt-1003",
    protocol: "#SUP-84922",
    title: "Solicitação de novo método de pagamento personalizado no PDV",
    description: "Gostaríamos de adicionar o cartão de benefícios corporativo como opção de pagamento rápida no balcão.",
    category: "PDV_CAIXA",
    priority: "LOW",
    status: "OPEN",
    userName: "Matheus Silva",
    userEmail: "matheus@restaurante.com",
    userPhone: "(11) 98765-4321",
    restaurantSlug: "",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    messages: [
      {
        id: "msg-6",
        sender: "USER",
        senderName: "Matheus Silva",
        content: "Gostaríamos de adicionar o cartão de benefícios corporativo como opção de pagamento rápida no balcão.",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
];

export async function listarChamadosAction(restaurantSlug?: string): Promise<SupportTicket[]> {
  const session = await getSession();
  const slug = restaurantSlug || "";

  return globalTickets.map((t) => ({
    ...t,
    restaurantSlug: t.restaurantSlug || slug,
    userName: t.userName || session?.name || "Administrador",
    userEmail: t.userEmail || session?.email || "contato@restaurante.com",
  }));
}

export async function criarChamadoAction(
  _prevState: { error?: string; success?: boolean; ticketId?: string } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean; ticketId?: string }> {
  const session = await getSession();

  const title = formData.get("title")?.toString().trim();
  const description = formData.get("description")?.toString().trim();
  const category = (formData.get("category")?.toString() || "OUTRO") as TicketCategory;
  const priority = (formData.get("priority")?.toString() || "NORMAL") as TicketPriority;
  const userPhone = formData.get("userPhone")?.toString().trim() || undefined;
  const restaurantSlug = formData.get("restaurantSlug")?.toString().trim() || "";

  if (!title || !description) {
    return { error: "Título e descrição do chamado são obrigatórios." };
  }

  const randomNum = Math.floor(10000 + Math.random() * 90000);
  const protocol = `#SUP-${randomNum}`;
  const now = new Date().toISOString();

  const newTicket: SupportTicket = {
    id: `tkt-${Date.now()}`,
    protocol,
    title,
    description,
    category,
    priority,
    status: "OPEN",
    userName: session?.name || "Administrador",
    userEmail: session?.email || "contato@restaurante.com",
    userPhone,
    restaurantSlug,
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        id: `msg-${Date.now()}`,
        sender: "USER",
        senderName: session?.name || "Administrador",
        content: description,
        createdAt: now,
      },
    ],
  };

  globalTickets.unshift(newTicket);

  revalidatePath("/suporte");
  if (restaurantSlug) {
    revalidatePath(`/${restaurantSlug}/suporte`);
  }

  return { success: true, ticketId: newTicket.id };
}

export async function atualizarStatusChamadoAction(
  ticketId: string,
  newStatus: TicketStatus,
): Promise<{ success: boolean; error?: string }> {
  const ticket = globalTickets.find((t) => t.id === ticketId);
  if (!ticket) {
    return { success: false, error: "Chamado não encontrado." };
  }

  ticket.status = newStatus;
  ticket.updatedAt = new Date().toISOString();

  revalidatePath("/suporte");
  return { success: true };
}

export async function adicionarMensagemChamadoAction(
  ticketId: string,
  content: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  const ticket = globalTickets.find((t) => t.id === ticketId);

  if (!ticket) {
    return { success: false, error: "Chamado não encontrado." };
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return { success: false, error: "A mensagem não pode ser vazia." };
  }

  const now = new Date().toISOString();
  ticket.messages.push({
    id: `msg-${Date.now()}`,
    sender: "USER",
    senderName: session?.name || "Administrador",
    content: trimmed,
    createdAt: now,
  });

  ticket.updatedAt = now;
  if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") {
    ticket.status = "IN_PROGRESS";
  }

  revalidatePath("/suporte");
  return { success: true };
}
