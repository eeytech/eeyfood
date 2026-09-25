import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  buscarRestauranteParaGestao,
  buscarConfiguracoesFiscaisGestao,
} from "@/lib/admin-queries";
import { FiscalSettingsClient } from "./_components/fiscal-settings-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Configurações Fiscais | Gestão",
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

const ConfiguracoesFiscaisPage = async ({ params }: PageProps) => {
  const { slug } = await params;
  const [restaurant, fiscalSettings] = await Promise.all([
    buscarRestauranteParaGestao(slug),
    buscarConfiguracoesFiscaisGestao(slug),
  ]);

  if (!restaurant) return notFound();

  return (
    <FiscalSettingsClient
      slug={slug}
      restaurant={restaurant}
      fiscalSettings={fiscalSettings}
    />
  );
};

export default ConfiguracoesFiscaisPage;
