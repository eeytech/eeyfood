import {
  and,
  customersTable,
  db,
  eq,
  restaurantsTable,
} from "@fsw/db";
import {
  MegaphoneIcon,
  SendIcon,
  UsersIcon,
} from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dispararCampanhaAction } from "../marketing-actions";
import { CampanhaForm } from "./campanha-form";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const SEGMENTS = [
  { value: "ALL", label: "Todos os clientes", color: "default" as const },
  { value: "NEW", label: "Novos", color: "default" as const },
  { value: "VIP", label: "VIP", color: "default" as const },
  { value: "INACTIVE", label: "Inativos", color: "secondary" as const },
  { value: "AT_RISK", label: "Em Risco", color: "destructive" as const },
  { value: "RECOVERED", label: "Recuperados", color: "default" as const },
];

async function getSegmentCounts(restaurantId: string) {
  const counts: Record<string, number> = { ALL: 0 };

  const all = await db.query.customersTable.findMany({
    where: eq(customersTable.restaurantId, restaurantId),
    columns: { segment: true },
  });

  counts.ALL = all.length;
  for (const { segment } of all) {
    counts[segment] = (counts[segment] ?? 0) + 1;
  }

  return counts;
}

export default async function CampanhasPage({ params }: PageProps) {
  const { slug } = await params;

  const restaurant = await db.query.restaurantsTable.findFirst({
    where: eq(restaurantsTable.slug, slug),
  });

  if (!restaurant) notFound();

  const counts = await getSegmentCounts(restaurant.id);

  async function dispatch(formData: FormData) {
    "use server";
    return dispararCampanhaAction(slug, formData);
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
