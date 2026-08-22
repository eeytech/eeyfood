import { notFound } from "next/navigation";
import {
  buscarRestauranteParaGestao,
  buscarConfiguracoesFiscaisGestao,
} from "@/lib/admin-queries";
import { FiscalSettingsClient } from "./_components/fiscal-settings-client";

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
    <main>
      <FiscalSettingsClient
        slug={slug}
        restaurant={restaurant}
        fiscalSettings={fiscalSettings}
      />
    </main>
  );
};

export default ConfiguracoesFiscaisPage;
