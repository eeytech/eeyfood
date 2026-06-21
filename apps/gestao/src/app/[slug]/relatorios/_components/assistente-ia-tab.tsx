"use client";

import {
  AlertTriangleIcon,
  BotIcon,
  ClockIcon,
  LoaderIcon,
  SparklesIcon,
} from "lucide-react";
import { useState } from "react";

import { gerarInsightsIA } from "@/app/[slug]/relatorios/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AssistenteIaTabProps {
  slug: string;
}

const MarkdownRenderer = ({ content }: { content: string }) => {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";

    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="mt-5 mb-2 flex items-center gap-2 text-lg font-semibold text-slate-800 first:mt-0">
          {line.replace(/^## /, "")}
        </h2>,
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="mt-4 mb-1 text-sm font-semibold uppercase tracking-wider text-slate-500">
          {line.replace(/^### /, "")}
        </h3>,
      );
    } else if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(
        <p key={i} className="mt-3 font-semibold text-slate-700">
          {line.replace(/\*\*/g, "")}
        </p>,
      );
    } else if (line.startsWith("- ")) {
      const text = line.replace(/^- /, "");
      const formatted = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      elements.push(
        <li
          key={i}
          className="ml-4 list-disc text-sm text-slate-600 [&>strong]:font-semibold [&>strong]:text-slate-800"
          dangerouslySetInnerHTML={{ __html: formatted }}
        />,
      );
    } else if (line.startsWith("---")) {
      elements.push(<hr key={i} className="my-4 border-slate-200" />);
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-1" />);
    } else {
      const formatted = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      elements.push(
        <p
          key={i}
          className="text-sm text-slate-600 [&>strong]:font-semibold [&>strong]:text-slate-800"
          dangerouslySetInnerHTML={{ __html: formatted }}
        />,
      );
    }
  }

  return <div className="space-y-0.5">{elements}</div>;
};

const AssistenteIaTab = ({ slug }: AssistenteIaTabProps) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ markdown: string; generatedAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await gerarInsightsIA(slug);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar insights.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-white/80 bg-white/90">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-2xl">
            <SparklesIcon className="text-primary" size={24} />
            Assistente Analítico IA
          </CardTitle>
          <CardDescription className="text-base">
            Análise preditiva de demanda, projeção de vendas e sugestões de preço geradas por
            inteligência artificial com base nos seus últimos 3 meses de operação.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="gap-2 rounded-full px-6 shadow-md shadow-primary/20"
          >
            {loading ? (
              <LoaderIcon size={16} className="animate-spin" />
            ) : (
              <BotIcon size={16} />
            )}
            {loading ? "Analisando dados..." : "Gerar Insights com IA"}
          </Button>
          {result && !loading && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ClockIcon size={12} />
              Gerado em{" "}
              {new Date(result.generatedAt).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangleIcon className="shrink-0 text-rose-600" size={20} />
            <p className="text-sm text-rose-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card className="border-white/80 bg-white/90">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
            <LoaderIcon size={32} className="animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Analisando seus dados de vendas, estoque e perdas...
            </p>
            <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos.</p>
          </CardContent>
        </Card>
      )}

      {result && !loading && (
        <Card className="border-white/80 bg-white/90">
          <CardContent className="p-6">
            <MarkdownRenderer content={result.markdown} />
          </CardContent>
        </Card>
      )}

      {!result && !loading && !error && (
        <Card className="border-white/80 border-dashed bg-white/40">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16">
            <SparklesIcon size={40} className="text-slate-300" />
            <p className="text-sm text-muted-foreground">
              Clique em &ldquo;Gerar Insights com IA&rdquo; para obter uma análise completa do
              seu negócio.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AssistenteIaTab;
