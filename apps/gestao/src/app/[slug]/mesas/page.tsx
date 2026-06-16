import { LayoutGridIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { notFound } from "next/navigation";

import {
  createTableAction,
  deleteTableAction,
  updateTableAction,
} from "@/app/[slug]/mesas-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { buscarRestauranteParaGestao, listarMesasGestao } from "@/lib/admin-queries";

interface MesasPageProps {
  params: Promise<{ slug: string }>;
}

const MesasPage = async ({ params }: MesasPageProps) => {
  const { slug } = await params;
  const restaurant = await buscarRestauranteParaGestao(slug);
  const tables = await listarMesasGestao(slug);

  if (!restaurant) {
    return notFound();
  }

  return (
    <main className="space-y-4">
      <Card className="overflow-hidden border-white/80 bg-white/90">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="font-display text-3xl">
              Gestão de Mesas
            </CardTitle>
            <CardDescription className="max-w-2xl text-base">
              Cadastre e organize as mesas do seu salão para uso nas comandas e no atendimento presencial.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>{String(tables.length)} {tables.length === 1 ? "mesa cadastrada" : "mesas cadastradas"}</span>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 2xl:grid-cols-[400px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <PlusIcon size={20} />
                Nova mesa
              </CardTitle>
              <CardDescription>
                Adicione uma nova mesa ao salão do restaurante.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createTableAction.bind(null, slug)} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Nome da mesa
                  </label>
                  <Input id="name" name="name" placeholder="Ex.: Mesa 01" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="seats" className="text-sm font-medium">
                      Capacidade (lugares)
                    </label>
                    <Input id="seats" name="seats" type="number" min="1" defaultValue="4" required />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="displayOrder" className="text-sm font-medium">
                      Ordem de exibição
                    </label>
                    <Input id="displayOrder" name="displayOrder" type="number" min="0" defaultValue="0" required />
                  </div>
                </div>
                <label className="flex items-center gap-3 rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-medium">
                  <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4" />
                  Mesa ativa
                </label>
                <SubmitButton className="w-full rounded-full" pendingText="Cadastrando...">
                  Cadastrar mesa
                </SubmitButton>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="text-2xl">Mesas do salão</CardTitle>
              <CardDescription>
                Visualize e edite os dados das mesas cadastradas.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {tables.map((table) => (
                <Card key={table.id} className="border-slate-200 bg-slate-50/80">
                  <CardContent className="space-y-4 p-5">
                    <form action={updateTableAction.bind(null, slug)} className="space-y-4">
                      <input type="hidden" name="tableId" value={table.id} />

                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border bg-white">
                          <LayoutGridIcon size={20} className="text-slate-400" />
                        </div>
                        <div className="flex-1">
                          <Input name="name" defaultValue={table.name} className="h-9 font-semibold" required />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Lugares
                          </label>
                          <Input name="seats" type="number" min="1" defaultValue={table.seats} className="h-9" required />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Ordem
                          </label>
                          <Input name="displayOrder" type="number" min="0" defaultValue={table.displayOrder} className="h-9" required />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <input type="checkbox" name="isActive" defaultChecked={table.isActive} className="h-4 w-4" />
                          Ativa
                        </label>
                        <SubmitButton size="sm" variant="secondary" className="h-8" pendingText="Salvando...">
                          Salvar
                        </SubmitButton>
                      </div>
                    </form>

                    <form action={deleteTableAction.bind(null, slug)} className="border-t border-slate-200 pt-2">
                      <input type="hidden" name="tableId" value={table.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2Icon size={14} className="mr-2" />
                        Remover mesa
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              ))}

              {tables.length === 0 && (
                <div className="col-span-full space-y-3 py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <LayoutGridIcon size={24} className="text-slate-300" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-slate-600">Nenhuma mesa cadastrada</p>
                    <p className="text-sm text-slate-400">Cadastre a primeira mesa para começar a usar as comandas.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
};

export default MesasPage;
