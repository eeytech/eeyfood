import { BikeIcon, PlusIcon, Trash2Icon, UserIcon } from "lucide-react";
import { notFound } from "next/navigation";

import {
  createCourierAction,
  deleteCourierAction,
  updateCourierAction,
} from "@/app/[slug]/logistica-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { buscarRestauranteParaGestao, listarCouriersGestao } from "@/lib/admin-queries";

interface LogisticaPageProps {
  params: Promise<{ slug: string }>;
}

const LogisticaPage = async ({ params }: LogisticaPageProps) => {
  const { slug } = await params;
  const restaurant = await buscarRestauranteParaGestao(slug);
  const couriers = await listarCouriersGestao(slug);

  if (!restaurant) {
    return notFound();
  }

  return (
    <main className="space-y-4">
      <Card className="overflow-hidden border-white/80 bg-white/90">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="font-display text-3xl">
              Logística e Motoboys
            </CardTitle>
            <CardDescription className="max-w-2xl text-base">
              Gerencie sua equipe de entrega, cadastre motoboys e acompanhe a frota disponível para despacho.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>{String(couriers.length)} motoboys cadastrados</span>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 2xl:grid-cols-[400px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <PlusIcon size={20} />
                Novo motoboy
              </CardTitle>
              <CardDescription>
                Adicione um novo entregador à sua equipe.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createCourierAction.bind(null, slug)} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Nome completo
                  </label>
                  <Input id="name" name="name" placeholder="Ex.: João Silva" required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium">
                    Telefone/WhatsApp
                  </label>
                  <Input id="phone" name="phone" placeholder="(11) 99999-9999" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="vehicleType" className="text-sm font-medium">
                      Veículo
                    </label>
                    <select id="vehicleType" name="vehicleType" className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm" required>
                      <option value="MOTO">Moto</option>
                      <option value="BIKE">Bike</option>
                      <option value="CARRO">Carro</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="licensePlate" className="text-sm font-medium">
                      Placa (opcional)
                    </label>
                    <Input id="licensePlate" name="licensePlate" placeholder="ABC-1234" />
                  </div>
                </div>
                <label className="flex items-center gap-3 rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-medium">
                  <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4" />
                  Motoboy ativo
                </label>
                <SubmitButton className="w-full rounded-full" pendingText="Cadastrando...">
                  Cadastrar motoboy
                </SubmitButton>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="text-2xl">Equipe de entrega</CardTitle>
              <CardDescription>
                Visualize e edite os dados dos seus entregadores.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {couriers.map((courier) => (
                <Card key={courier.id} className="border-slate-200 bg-slate-50/80">
                  <CardContent className="p-5 space-y-4">
                    <form action={updateCourierAction.bind(null, slug)} className="space-y-4">
                      <input type="hidden" name="courierId" value={courier.id} />
                      
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border">
                          <UserIcon size={20} className="text-slate-400" />
                        </div>
                        <div className="flex-1">
                          <Input name="name" defaultValue={courier.name} className="h-9 font-semibold" required />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Contato</label>
                        <Input name="phone" defaultValue={courier.phone} className="h-9" required />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Veículo</label>
                          <select name="vehicleType" defaultValue={courier.vehicleType ?? "MOTO"} className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm">
                            <option value="MOTO">Moto</option>
                            <option value="BIKE">Bike</option>
                            <option value="CARRO">Carro</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Placa</label>
                          <Input name="licensePlate" defaultValue={courier.licensePlate ?? ""} className="h-9" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <input type="checkbox" name="isActive" defaultChecked={courier.isActive} className="h-4 w-4" />
                          Ativo
                        </label>
                        <SubmitButton size="sm" variant="secondary" className="h-8" pendingText="Salvando...">
                          Salvar
                        </SubmitButton>
                      </div>
                    </form>

                    <form action={deleteCourierAction.bind(null, slug)} className="pt-2 border-t border-slate-200">
                      <input type="hidden" name="courierId" value={courier.id} />
                      <Button type="submit" variant="ghost" size="sm" className="h-8 w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                        <Trash2Icon size={14} className="mr-2" />
                        Remover motoboy
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              ))}

              {couriers.length === 0 && (
                <div className="col-span-full py-12 text-center space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                    <BikeIcon size={24} className="text-slate-300" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-slate-600">Nenhum motoboy cadastrado</p>
                    <p className="text-sm text-slate-400">Cadastre seu primeiro entregador para começar a despachar pedidos.</p>
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

export default LogisticaPage;
