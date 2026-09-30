"use client";

import React from "react";
import { LoaderCircleIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loadingLabel?: string;
  isPending?: boolean;
  onConfirm: () => void | Promise<unknown> | unknown;
  children?: React.ReactNode;
  icon?: React.ReactNode;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Sim, excluir",
  cancelLabel = "Cancelar",
  loadingLabel = "Excluindo...",
  isPending = false,
  onConfirm,
  children,
  icon,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-600">
            <div className="rounded-xl bg-red-100 p-2 text-red-700">
              {icon || <Trash2Icon size={20} />}
            </div>
            <DialogTitle className="font-display text-lg font-bold text-slate-900">
              {title}
            </DialogTitle>
          </div>
          {description && (
            <DialogDescription className="pt-1 text-xs text-slate-500">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {children}

        <DialogFooter className="gap-2 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="rounded-full border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={onConfirm}
            className="rounded-full bg-red-600 px-5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
          >
            {isPending && (
              <LoaderCircleIcon size={14} className="mr-1.5 animate-spin" />
            )}
            {isPending ? loadingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
