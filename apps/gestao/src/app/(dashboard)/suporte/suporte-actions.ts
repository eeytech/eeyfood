"use server";

import {
  buscarRestaurantePorSlug,
  db,
  desc,
  eq,
  supportTicketMessagesTable,
  supportTicketsTable,
} from "@fsw/db";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import type {
  SupportTicket,
  TicketCategory,
  TicketPriority,
  TicketSender,
  TicketStatus,
} from "./suporte-types";

// Seed de fallback inicial para caso a tabela esteja vazia na primeira execução
const initialFallbackTickets: SupportTicket[] = [
  {
    id: "tkt-1001",
    protocol: "#SUP-84920",
    title: "Dúvida sobre configuração da impressora térmica Elgin i9",
    description:
      "Gostaria de saber como definir a impressão automática para o setor da cozinha quando o pedido for aprovado no PDV.",
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
        content:
          "Gostaria de saber como definir a impressão automática para o setor da cozinha quando o pedido for aprovado no PDV.",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "msg-2",
        sender: "SUPPORT",
        senderName: "Equipe de Suporte Técnico",
        content:
          "Olá Matheus! Você pode configurar isso acessando Cardápio > Setores de Produção, vinculando a categoria desejada ao setor da cozinha e ativando a opção de auto-impressão via Web Serial nas configurações do PDV.",
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
    description:
      "Estamos com oscilação na internet da loja física e precisamos ativar a contingência offline para não travar a emissão no caixa.",
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
        content:
          "Estamos com oscilação na internet da loja física e precisamos ativar a contingência offline para não travar a emissão no caixa.",
        createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "msg-5",
        sender: "SUPPORT",
        senderName: "Especialista Fiscal",
        content:
          "Olá! Nosso time fiscal já verificou seus parâmetros da SEFAZ. O módulo de contingência foi ativado para o seu CNPJ. Por favor, reinicie o PDV e realize uma venda de teste.",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
];

let inMemoryFallbackTickets: SupportTicket[] = [...initialFallbackTickets];

export async function listarChamadosAction(
  restaurantSlug?: string,
): Promise<SupportTicket[]> {
  const session = await getSession();
  const slug = restaurantSlug || "";

  try {
    const restaurant = slug ? await buscarRestaurantePorSlug(slug) : null;

    const ticketsFromDb = await db.query.supportTicketsTable.findMany({
      where: restaurant?.id
        ? eq(supportTicketsTable.restaurantId, restaurant.id)
        : undefined,
      orderBy: [desc(supportTicketsTable.createdAt)],
      with: {
        messages: true,
      },
    });

    if (ticketsFromDb && ticketsFromDb.length > 0) {
      return ticketsFromDb.map((t) => ({
        id: t.id,
        protocol: t.protocol,
        title: t.title,
        description: t.description,
        category: t.category as TicketCategory,
        priority: t.priority as TicketPriority,
        status: t.status as TicketStatus,
        userName: t.userName,
        userEmail: t.userEmail,
        userPhone: t.userPhone ?? undefined,
        restaurantSlug: t.restaurantSlug || slug,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        messages: (t.messages ?? [])
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .map((m) => ({
            id: m.id,
            sender: m.sender as TicketSender,
            senderName: m.senderName,
            content: m.content,
            createdAt: m.createdAt.toISOString(),
          })),
      }));
    }
  } catch (error) {
    console.warn("Aviso ao buscar tickets de suporte no DB, usando fallback:", error);
  }

  // Fallback em memória
  return inMemoryFallbackTickets.map((t) => ({
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
  const now = new Date();

  const userName = session?.name || "Administrador";
  const userEmail = session?.email || "contato@restaurante.com";

  let createdTicketId = `tkt-${Date.now()}`;

  try {
    const restaurant = restaurantSlug
      ? await buscarRestaurantePorSlug(restaurantSlug)
      : null;

    const [insertedTicket] = await db
      .insert(supportTicketsTable)
      .values({
        restaurantId: restaurant?.id ?? null,
        protocol,
        title,
        description,
        category,
        priority,
        status: "OPEN",
        userName,
        userEmail,
        userPhone: userPhone ?? null,
        restaurantSlug,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: supportTicketsTable.id });

    if (insertedTicket) {
      createdTicketId = insertedTicket.id;

      await db.insert(supportTicketMessagesTable).values({
        ticketId: insertedTicket.id,
        sender: "USER",
        senderName: userName,
        content: description,
        createdAt: now,
      });
    }
  } catch (error) {
    console.warn("Aviso ao persistir chamado no DB, mantendo no fallback:", error);

    const fallbackTicket: SupportTicket = {
      id: createdTicketId,
      protocol,
      title,
      description,
      category,
      priority,
      status: "OPEN",
      userName,
      userEmail,
      userPhone,
      restaurantSlug,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: "USER",
          senderName: userName,
          content: description,
          createdAt: now.toISOString(),
        },
      ],
    };
    inMemoryFallbackTickets.unshift(fallbackTicket);
  }

  revalidatePath("/suporte");
  if (restaurantSlug) {
    revalidatePath(`/${restaurantSlug}/suporte`);
  }

  return { success: true, ticketId: createdTicketId };
}

export async function atualizarStatusChamadoAction(
  ticketId: string,
  newStatus: TicketStatus,
): Promise<{ success: boolean; error?: string }> {
  const now = new Date();

  try {
    await db
      .update(supportTicketsTable)
      .set({
        status: newStatus,
        updatedAt: now,
      })
      .where(eq(supportTicketsTable.id, ticketId));
  } catch (error) {
    console.warn("Aviso ao atualizar status do chamado no DB:", error);
    const fallbackTicket = inMemoryFallbackTickets.find((t) => t.id === ticketId);
    if (fallbackTicket) {
      fallbackTicket.status = newStatus;
      fallbackTicket.updatedAt = now.toISOString();
    }
  }

  revalidatePath("/suporte");
  return { success: true };
}

export async function adicionarMensagemChamadoAction(
  ticketId: string,
  content: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  const trimmed = content.trim();

  if (!trimmed) {
    return { success: false, error: "A mensagem não pode ser vazia." };
  }

  const now = new Date();
  const senderName = session?.name || "Administrador";

  try {
    await db.insert(supportTicketMessagesTable).values({
      ticketId,
      sender: "USER",
      senderName,
      content: trimmed,
      createdAt: now,
    });

    await db
      .update(supportTicketsTable)
      .set({
        status: "IN_PROGRESS",
        updatedAt: now,
      })
      .where(eq(supportTicketsTable.id, ticketId));
  } catch (error) {
    console.warn("Aviso ao adicionar mensagem do chamado no DB:", error);
    const fallbackTicket = inMemoryFallbackTickets.find((t) => t.id === ticketId);
    if (fallbackTicket) {
      fallbackTicket.messages.push({
        id: `msg-${Date.now()}`,
        sender: "USER",
        senderName,
        content: trimmed,
        createdAt: now.toISOString(),
      });
      fallbackTicket.updatedAt = now.toISOString();
      if (
        fallbackTicket.status === "RESOLVED" ||
        fallbackTicket.status === "CLOSED"
      ) {
        fallbackTicket.status = "IN_PROGRESS";
      }
    }
  }

  revalidatePath("/suporte");
  return { success: true };
}

export async function excluirChamadoAction(
  ticketId: string,
  restaurantSlug?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .delete(supportTicketsTable)
      .where(eq(supportTicketsTable.id, ticketId));
  } catch (error) {
    console.warn("Aviso ao excluir chamado no DB:", error);
    inMemoryFallbackTickets = inMemoryFallbackTickets.filter(
      (t) => t.id !== ticketId,
    );
  }

  revalidatePath("/suporte");
  if (restaurantSlug) {
    revalidatePath(`/${restaurantSlug}/suporte`);
  }

  return { success: true };
}
