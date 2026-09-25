"use client";

import {
  BuildingIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  LoaderCircleIcon,
  PlusIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { criarNovaUnidadeAction } from "@/app/(dashboard)/configuracoes/restaurantes-actions";
import type { TokenCompany } from "@/lib/auth/types";

interface CompanySwitcherProps {
  companies: TokenCompany[];
  currentCompanyId: string;
  isCollapsed?: boolean;
}

export function CompanySwitcher({
  companies,
  currentCompanyId,
  isCollapsed = false,
}: CompanySwitcherProps) {
  const [isSwitching, setIsSwitching] = useState(false);
  const [isNewUnitOpen, setIsNewUnitOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const currentCompany = companies.find((c) => c.id === currentCompanyId);

  const handleSwitch = async (company: TokenCompany) => {
    if (company.id === currentCompanyId || isSwitching) return;

    setIsSwitching(true);
    try {
      const response = await fetch("/api/auth/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id }),
      });

      if (!response.ok) {
        throw new Error("Não foi possível trocar de unidade.");
      }

      await response.json();
      window.location.href = "/pedidos";
    } catch {
      setIsSwitching(false);
    }
  };

  const handleCreateNewUnit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await criarNovaUnidadeAction(null, formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Nova unidade criada com sucesso! Redirecionando...");
        setIsNewUnitOpen(false);
        setTimeout(() => {
          window.location.href = "/pedidos";
        }, 600);
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={`h-auto w-full justify-start gap-2.5 overflow-hidden rounded-none border-b border-white/10 px-3 py-4 hover:bg-white/5 ${
              isCollapsed ? "justify-center px-0" : ""
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              {isSwitching ? (
                <LoaderCircleIcon size={15} className="animate-spin" />
              ) : (
                <BuildingIcon size={15} />
              )}
            </div>
            {!isCollapsed && (
              <>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[10px] uppercase tracking-widest text-slate-500">
                    Gestão
                  </p>
                  <h2 className="truncate text-sm font-semibold leading-tight text-white">
                    {currentCompany?.name ?? "—"}
                  </h2>
                </div>
                <ChevronsUpDownIcon size={14} className="shrink-0 text-slate-500" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Unidades cadastradas
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {companies.map((company) => (
            <DropdownMenuItem
              key={company.id}
              onSelect={() => handleSwitch(company)}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="truncate">{company.name}</span>
              {company.id === currentCompanyId && (
                <CheckIcon size={13} className="shrink-0 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setIsNewUnitOpen(true)}
            className="flex items-center gap-2 text-xs font-semibold text-primary cursor-pointer"
          >
            <PlusIcon size={14} />
            <span>Nova Unidade / Filial</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ── Dialog: Criar Nova Unidade ─────────────────────────────────── */}
      <Dialog open={isNewUnitOpen} onOpenChange={setIsNewUnitOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <form onSubmit={handleCreateNewUnit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Cadastrar Nova Unidade / Filial
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Crie um novo restaurante com cardápio, estoque, PDV e configurações independentes.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="unitName" className="text-xs font-semibold text-slate-700">
                  Nome do Restaurante / Unidade *
                </Label>
                <Input
                  id="unitName"
                  name="name"
                  required
                  placeholder="Ex: EeyFood - Unidade Centro"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="unitSlug" className="text-xs font-semibold text-slate-700">
                  Slug Exclusivo da URL (opcional)
                </Label>
                <Input
                  id="unitSlug"
                  name="slug"
                  placeholder="Ex: eeyfood-centro"
                  className="h-9 text-xs font-mono"
                />
                <p className="text-[10px] text-slate-400">
                  Identificador na URL do cardápio digital (ex: /cardapio/eeyfood-centro).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="unitCnpj" className="text-xs font-semibold text-slate-700">
                    CNPJ (opcional)
                  </Label>
                  <Input
                    id="unitCnpj"
                    name="cnpj"
                    placeholder="00.000.000/0001-00"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="unitDesc" className="text-xs font-semibold text-slate-700">
                    Categoria / Tipo
                  </Label>
                  <Input
                    id="unitDesc"
                    name="description"
                    placeholder="Ex: Hamburgueria & Delivery"
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewUnitOpen(false)}
                disabled={isPending}
                className="h-9 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="h-9 gap-1.5 bg-slate-950 text-xs font-semibold text-white shadow-xs hover:bg-slate-800"
              >
                {isPending && <LoaderCircleIcon size={14} className="animate-spin" />}
                Criar Unidade
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
