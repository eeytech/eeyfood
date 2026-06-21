import type { Metadata } from "next";
import { LockIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Acesso Negado | Gestão",
};

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400">
        <LockIcon size={26} />
      </div>
      <div>
        <h1 className="text-xl font-semibold text-white">Acesso Negado</h1>
        <p className="mt-1 max-w-sm text-sm text-slate-400">
          Seu token de acesso pertence a outra aplicação e não é válido para
          este sistema.
        </p>
      </div>
      <Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/5 hover:text-white">
        <Link href="/login">Voltar para o Login</Link>
      </Button>
    </div>
  );
}
