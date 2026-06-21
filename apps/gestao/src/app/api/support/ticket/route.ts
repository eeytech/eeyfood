import { NextResponse } from "next/server";

import { eeycore } from "@/lib/auth/eeycore-client";
import { getSession } from "@/lib/auth/session";

interface TicketPayload {
  title?: string;
  message?: string;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as TicketPayload | null;
  const title = body?.title?.trim();
  const message = body?.message?.trim();

  if (!title || !message) {
    return NextResponse.json(
      { message: "Título e mensagem são obrigatórios." },
      { status: 400 },
    );
  }

  try {
    await eeycore.withApiKey("/support/tickets", {
      method: "POST",
      body: JSON.stringify({
        userId: session.sub,
        restaurantId: session.companyId,
        appSlug: session.appSlug,
        title,
        message,
      }),
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Erro ao criar chamado.";
    return NextResponse.json({ message: msg }, { status: 502 });
  }
}
