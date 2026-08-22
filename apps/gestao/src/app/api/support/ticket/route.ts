import { NextResponse } from "next/server";

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

  return NextResponse.json({ success: true, message: "Chamado registrado com sucesso." }, { status: 201 });
}
