"use client";

import {
  AlertTriangleIcon,
  BotIcon,
  ClockIcon,
  LoaderIcon,
  SparklesIcon,
} from "lucide-react";
import { useState } from "react";

import { gerarInsightsIA } from "../actions";
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
    <div className="space-y-6">
      <Card className="border-slate-200/80 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="flex items-center gap-2 font-display text-xl font-bold text-slate-900">
            <SparklesIcon className="text-amber-500" size={22} />
            Assistente Analítico IA
          </CardTitle>
          <CardDescription className="text-sm text-slate-500">
            Análise preditiva de demanda, projeção de vendas e sugestões de precificação geradas por
            inteligência artificial com base no histórico do seu restaurante.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center">
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="h-10 gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? (
              <LoaderIcon size={16} className="animate-spin" />
            ) : (
              <BotIcon size={16} />
            )}
            {loading ? "Analisando dados..." : "Gerar Insights com IA"}
          </Button>
          {result && !loading && (
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <ClockIcon size={13} className="text-slate-400" />
              Gerado em{" "}
              <strong className="font-semibold text-slate-700">
                {new Date(result.generatedAt).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </strong>
            </span>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card className="border-rose-200 bg-rose-50/70 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangleIcon className="shrink-0 text-rose-600" size={20} />
            <p className="text-xs font-medium text-rose-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card className="border-slate-200/80 bg-white shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
            <LoaderIcon size={32} className="animate-spin text-slate-900" />
            <p className="font-display text-sm font-semibold text-slate-900">
              Processando inteligência analítica...
            </p>
            <p className="text-xs text-slate-500">Isso pode levar alguns segundos.</p>
          </CardContent>
        </Card>
      )}

      {result && !loading && (
        <Card className="border-slate-200/80 bg-white shadow-sm">
          <CardContent className="p-6">
            <MarkdownRenderer content={result.markdown} />
          </CardContent>
        </Card>
      )}

      {!result && !loading && !error && (
        <Card className="border-dashed border-slate-200 bg-slate-50/60 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="rounded-full bg-slate-100 p-3.5 text-slate-400">
              <SparklesIcon size={30} />
            </div>
            <h3 className="font-display text-base font-semibold text-slate-900">
              Assistente de Inteligência Artificial
            </h3>
            <p className="max-w-md text-xs text-slate-500">
              Clique em &ldquo;Gerar Insights com IA&rdquo; para processar dados de faturamento, pratos mais vendidos, horários de pico e oportunidades de crescimento.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AssistenteIaTab;
