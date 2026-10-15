import { DEFAULT_AI_SYSTEM_PROMPT } from "@fsw/db";
import { notFound } from "next/navigation";

import {
  buscarAiSettingsPorSlug,
  buscarClientesPausadosPorSlug,
  buscarRestauranteParaGestao,
} from "@/lib/admin-queries";

import { AiSettingsForm } from "./ai-settings-form";

export const dynamic = "force-dynamic";

interface AiSettingsPageProps {
  params?: Promise<{ slug?: string }>;
}

export default async function AiSettingsPage({ params }: AiSettingsPageProps) {
  const resolvedParams = params ? await params : undefined;
  const restaurant = await buscarRestauranteParaGestao(resolvedParams?.slug);

  if (!restaurant) {
    return notFound();
  }

  const slug = restaurant.slug;
  const [aiSettings, clientesPausados] = await Promise.all([
    buscarAiSettingsPorSlug(slug),
    buscarClientesPausadosPorSlug(slug),
  ]);

  return (
    <AiSettingsForm
      slug={slug}
      aiSettings={aiSettings}
      clientesPausados={clientesPausados}
      defaultPrompt={DEFAULT_AI_SYSTEM_PROMPT}
    />
  );
}
