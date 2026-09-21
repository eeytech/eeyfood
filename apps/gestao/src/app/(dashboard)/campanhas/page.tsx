import {
  customersTable,
  db,
  eq,
} from "@fsw/db";
import {
  MegaphoneIcon,
  SendIcon,
  UsersIcon,
} from "lucide-react";
import { notFound } from "next/navigation";

import { buscarRestauranteParaGestao } from "@/lib/admin-queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dispararCampanhaAction } from "../marketing-actions";
import { CampanhaForm } from "./campanha-form";

export const dynamic = "force-dynamic";

interface PageProps {
  params?: Promise<{ slug?: string }>;
}

const SEGMENTS = [
  { value: "ALL", label: "Todos os clientes", color: "default" as const },
  { value: "NEW", label: "Novos", color: "default" as const },
  { value: "VIP", label: "VIP", color: "default" as const },
  { value: "LOYAL", label: "Leais", color: "default" as const },
  { value: "AT_RISK", label: "Em risco", color: "secondary" as const },
  { value: "CHURNED", label: "Inativos", color: "destructive" as const },
];

async function getSegmentCounts(restaurantId: string) {
  const all = await db
    .select({ segment: customersTable.segment })
    .from(customersTable)
    .where(eq(customersTable.restaurantId, restaurantId));

  const counts: Record<string, number> = { ALL: all.length };
  for (const { segment } of all) {
    counts[segment] = (counts[segment] ?? 0) + 1;
  }

  return counts;
}

export default async function CampanhasPage({ params }: PageProps) {
  const resolvedParams = params ? await params : undefined;
  const restaurant = await buscarRestauranteParaGestao(resolvedParams?.slug);

  if (!restaurant) {
    notFound();
  }

  const restaurantSlug = restaurant.slug;
  const counts = await getSegmentCounts(restaurant.id);

  async function dispatch(formData: FormData) {
    "use server";
    return dispararCampanhaAction(restaurantSlug, formData);
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <MegaphoneIcon className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Campanhas de Marketing</h1>
          <p className="text-sm text-muted-foreground">
            Envie mensagens segmentadas via WhatsApp para sua base de clientes.
          </p>
        </div>
      </div>

      {/* Segment cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {SEGMENTS.map((seg) => (
          <Card key={seg.value} className="text-center">
            <CardContent className="pt-4">
              <p className="text-2xl font-bold">{counts[seg.value] ?? 0}</p>
              <p className="text-xs text-muted-foreground">{seg.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dispatch form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SendIcon className="h-5 w-5" />
              Novo Disparo
            </CardTitle>
            <CardDescription>
              Use <code className="rounded bg-muted px-1">{"{nome}"}</code> para
              personalizar a mensagem com o primeiro nome do cliente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CampanhaForm segments={SEGMENTS} counts={counts} dispatchAction={dispatch} />
          </CardContent>
        </Card>

        {/* Tips card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Boas práticas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Segmentação:</strong> Prefira enviar para
              grupos específicos (Inativos, VIP) em vez de toda a base de uma vez.
            </p>
            <p>
              <strong className="text-foreground">Frequência:</strong> Evite mais de 2
              campanhas por semana para o mesmo cliente para não gerar bloqueios no WhatsApp.
            </p>
            <p>
              <strong className="text-foreground">Horário:</strong> O sistema adiciona um
              intervalo de 500ms entre cada envio para evitar banimento da linha.
            </p>
            <p>
              <strong className="text-foreground">Personalização:</strong> Mensagens com{" "}
              <code className="rounded bg-muted px-1">{"{nome}"}</code> têm maior taxa de
              abertura e resposta.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
