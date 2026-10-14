import type { Metadata } from "next";

import DocumentacoesClient from "./documentacoes-client";

export const metadata: Metadata = {
  title: "Documentações & Manuais de Uso | EeyFood",
  description:
    "Documentação completa e manual de uso de todas as telas e recursos do EeyFood para autonomia total do usuário.",
};

export default function DocumentacoesPage() {
  return <DocumentacoesClient />;
}
