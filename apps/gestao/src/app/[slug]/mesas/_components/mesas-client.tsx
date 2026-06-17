"use client";

import {
  LayoutGridIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { useState, useTransition } from "react";

import { deleteTableAction } from "@/app/[slug]/mesas-actions";
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
import type { DiningTable } from "@fsw/db";

import { MesaForm } from "./mesa-form";

interface MesasClientProps {
  slug: string;
  tables: DiningTable[];
}

export function MesasClient({ slug, tables }: MesasClientProps) {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTable, setEditTable] = useState<DiningTable | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = tables.filter(
    (t) => search === "" || t.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDelete = (tableId: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("tableId", tableId);
      await deleteTableAction(slug, formData);
    });
  };

  return (
    <div className="space-y-4">
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova mesa</DialogTitle>
            <DialogDescription>
              Adicione uma nova mesa ao salão do restaurante.
            </DialogDescription>
          </DialogHeader>
          <MesaForm slug={slug} onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editTable !== null}
        onOpenChange={(open) => !open && setEditTable(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar mesa</DialogTitle>
            <DialogDescription>{editTable?.name}</DialogDescription>
          </DialogHeader>
          {editTable && (
            <MesaForm
              key={editTable.id}
              slug={slug}
              defaultValues={editTable}
              onSuccess={() => setEditTable(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">
            Gestão de Mesas
          </h1>
          <p className="mt-1 text-base text-muted-foreground">
            Cadastre e organize as mesas do seu salão para uso nas comandas e no
            atendimento presencial.
          </p>
        </div>
        <Button
          className="shrink-0 gap-1.5"
          onClick={() => setCreateOpen(true)}
        >
          <PlusIcon size={16} />
          Adicionar mesa
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
              placeholder="Buscar mesa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 rounded-md pl-8"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {filtered.length}{" "}
            {filtered.length === 1 ? "mesa" : "mesas"}
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mesa</TableHead>
              <TableHead className="text-right">Lugares</TableHead>
              <TableHead className="text-right">Ordem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <LayoutGridIcon size={32} className="text-slate-200" />
                    <p className="text-sm text-muted-foreground">
                      {search
                        ? "Nenhuma mesa encontrada para essa busca."
                        : "Nenhuma mesa cadastrada ainda."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((table) => (
                <TableRow key={table.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-slate-50">
                        <LayoutGridIcon size={14} className="text-slate-400" />
                      </div>
                      <span className="font-medium">{table.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {table.seats}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {table.displayOrder}
                  </TableCell>
                  <TableCell>
                    <Badge variant={table.isActive ? "success" : "danger"}>
                      {table.isActive ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditTable(table)}
                      >
                        <PencilIcon size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => handleDelete(table.id)}
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
