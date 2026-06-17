"use client";

import {
  BikeIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { useState, useTransition } from "react";

import { deleteCourierAction } from "@/app/[slug]/logistica-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Courier } from "@fsw/db";

import { CourierForm } from "./courier-form";

interface LogisticaClientProps {
  slug: string;
  couriers: Courier[];
}

const vehicleLabel: Record<string, string> = {
  MOTO: "Moto",
  BIKE: "Bike",
  CARRO: "Carro",
};

export function LogisticaClient({ slug, couriers }: LogisticaClientProps) {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editCourier, setEditCourier] = useState<Courier | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = couriers.filter(
    (c) =>
      search === "" ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search),
  );

  const handleDelete = (courierId: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("courierId", courierId);
      await deleteCourierAction(slug, formData);
    });
  };

  return (
    <div className="space-y-4">
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo motoboy</DialogTitle>
            <DialogDescription>
              Adicione um novo entregador à sua equipe.
            </DialogDescription>
          </DialogHeader>
          <CourierForm slug={slug} onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editCourier !== null}
        onOpenChange={(open) => !open && setEditCourier(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar motoboy</DialogTitle>
            <DialogDescription>{editCourier?.name}</DialogDescription>
          </DialogHeader>
          {editCourier && (
            <CourierForm
              key={editCourier.id}
              slug={slug}
              defaultValues={editCourier}
              onSuccess={() => setEditCourier(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">
            Logística e Motoboys
          </h1>
          <p className="mt-1 text-base text-muted-foreground">
            Gerencie sua equipe de entrega, cadastre motoboys e acompanhe a
            frota disponível para despacho.
          </p>
        </div>
        <Button
          className="shrink-0 gap-1.5"
          onClick={() => setCreateOpen(true)}
        >
          <PlusIcon size={16} />
          Adicionar motoboy
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white/90 shadow-sm">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <div className="relative max-w-xs flex-1">
            <SearchIcon
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 rounded-md pl-8"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {filtered.length}{" "}
            {filtered.length === 1 ? "motoboy" : "motoboys"}
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Veículo</TableHead>
              <TableHead>Placa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <BikeIcon size={32} className="text-slate-200" />
                    <p className="text-sm text-muted-foreground">
                      {search
                        ? "Nenhum motoboy encontrado para essa busca."
                        : "Nenhum motoboy cadastrado ainda."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((courier) => (
                <TableRow key={courier.id}>
                  <TableCell>
                    <span className="font-medium">{courier.name}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {courier.phone}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {vehicleLabel[courier.vehicleType ?? "MOTO"] ?? courier.vehicleType}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {courier.licensePlate ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={courier.isActive ? "success" : "danger"}>
                      {courier.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditCourier(courier)}
                      >
                        <PencilIcon size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => handleDelete(courier.id)}
                        disabled={isPending}
                      >
                        <Trash2Icon size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
