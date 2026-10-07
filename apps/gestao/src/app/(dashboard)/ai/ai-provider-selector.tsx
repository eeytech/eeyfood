"use client";

import {
  CheckIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  KeyIcon,
  SparklesIcon,
  ZapIcon,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type AiProviderType = "GOOGLE_GEMINI" | "GROQ" | "OPENAI";

interface AiProviderSelectorProps {
  initialProvider?: string | null;
  initialGeminiKey?: string | null;
  initialGroqKey?: string | null;
  initialOpenAiKey?: string | null;
}

export function AiProviderSelector({
  initialProvider = "GOOGLE_GEMINI",
  initialGeminiKey = "",
  initialGroqKey = "",
  initialOpenAiKey = "",
}: AiProviderSelectorProps) {
  const [provider, setProvider] = useState<AiProviderType>(
    (initialProvider?.toUpperCase() as AiProviderType) || "GOOGLE_GEMINI",
  );

  const [geminiKey, setGeminiKey] = useState(initialGeminiKey || "");
  const [groqKey, setGroqKey] = useState(initialGroqKey || "");
  const [openAiKey, setOpenAiKey] = useState(initialOpenAiKey || "");
  const [showKey, setShowKey] = useState(false);

  return (
    <Card className="border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <SparklesIcon size={18} />
          </div>
          <div>
            <CardTitle className="font-display text-base font-semibold text-slate-900">
              Provedor de Inteligência Artificial
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Escolha a IA que responderá seus clientes. Você pode usar uma opção 100% gratuita ou paga por uso.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Input Oculto para envio no FormData */}
        <input type="hidden" name="aiProvider" value={provider} />

        {/* Seletor de Cards dos Provedores */}
        <div className="grid gap-3 sm:grid-cols-3">
          {/* Opção 1: Google Gemini */}
          <button
            type="button"
            onClick={() => setProvider("GOOGLE_GEMINI")}
            className={`relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all ${
              provider === "GOOGLE_GEMINI"
                ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/40"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Badge
                  className={
                    provider === "GOOGLE_GEMINI"
                      ? "bg-primary/10 text-primary hover:bg-primary/15 border-0 text-[10px] font-bold px-2 py-0.5"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200/80 border-0 text-[10px] font-bold px-2 py-0.5"
                  }
                >
                  100% Gratuito
                </Badge>
                {provider === "GOOGLE_GEMINI" && (
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <CheckIcon size={11} strokeWidth={3} />
                  </div>
                )}
              </div>
              <p className="font-display text-sm font-bold text-slate-900">
                Google Gemini
              </p>
              <p className="text-[11px] text-slate-500 leading-snug">
                Gemini 2.0 Flash. Até 1.500 msgs/dia sem cartão.
              </p>
            </div>
            <div
              className={`mt-3 flex items-center gap-1 text-[10px] font-medium ${
                provider === "GOOGLE_GEMINI" ? "text-primary" : "text-slate-500"
              }`}
            >
              <SparklesIcon size={12} />
              Recomendado
            </div>
          </button>

          {/* Opção 2: Groq (Llama 3) */}
          <button
            type="button"
            onClick={() => setProvider("GROQ")}
            className={`relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all ${
              provider === "GROQ"
                ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/40"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Badge
                  className={
                    provider === "GROQ"
                      ? "bg-primary/10 text-primary hover:bg-primary/15 border-0 text-[10px] font-bold px-2 py-0.5"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200/80 border-0 text-[10px] font-bold px-2 py-0.5"
                  }
                >
                  100% Gratuito
                </Badge>
                {provider === "GROQ" && (
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <CheckIcon size={11} strokeWidth={3} />
                  </div>
                )}
              </div>
              <p className="font-display text-sm font-bold text-slate-900">
                Groq (Llama 3.1 / 3.3)
              </p>
              <p className="text-[11px] text-slate-500 leading-snug">
                Respostas ultrarrápidas em menos de 1 segundo.
              </p>
            </div>
            <div
              className={`mt-3 flex items-center gap-1 text-[10px] font-medium ${
                provider === "GROQ" ? "text-primary" : "text-slate-500"
              }`}
            >
              <ZapIcon size={12} />
              Super Rápido
            </div>
          </button>

          {/* Opção 3: OpenAI (GPT-4o) */}
          <button
            type="button"
            onClick={() => setProvider("OPENAI")}
            className={`relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all ${
              provider === "OPENAI"
                ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/40"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Badge
                  variant="outline"
                  className={
                    provider === "OPENAI"
                      ? "border-primary/30 bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5"
                      : "border-slate-300 text-slate-700 text-[10px] font-medium px-2 py-0.5"
                  }
                >
                  Pago por uso
                </Badge>
                {provider === "OPENAI" && (
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <CheckIcon size={11} strokeWidth={3} />
                  </div>
                )}
              </div>
              <p className="font-display text-sm font-bold text-slate-900">
                OpenAI (GPT-4o)
              </p>
              <p className="text-[11px] text-slate-500 leading-snug">
                Padrão de referência. Requer recarga mínima de US$ 5.
              </p>
            </div>
            <div
              className={`mt-3 flex items-center gap-1 text-[10px] font-medium ${
                provider === "OPENAI" ? "text-primary" : "text-slate-500"
              }`}
            >
              <KeyIcon size={12} />
              API Paga
            </div>
          </button>
        </div>

        {/* Inputs de Chave Dinâmicos com base no Provedor Selecionado */}
        <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-4 space-y-3">
          {provider === "GOOGLE_GEMINI" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <KeyIcon size={13} className="text-primary" />
                  Chave de API do Google Gemini
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 hover:underline"
                >
                  Criar chave grátis no Google AI Studio
                  <ExternalLinkIcon size={11} />
                </a>
              </div>

              <div className="relative">
                <Input
                  name="geminiApiKey"
                  type={showKey ? "text" : "password"}
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="h-10 rounded-xl border-slate-200 bg-white font-mono text-xs pr-10 focus:border-primary focus-visible:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showKey ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                </button>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Totalmente gratuita! Não requer cartão de crédito. Permite até 1.500 mensagens por dia gratuitamente e transcreve áudios em português.
              </p>
            </div>
          )}

          {provider === "GROQ" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <KeyIcon size={13} className="text-primary" />
                  Chave de API da Groq Cloud
                </label>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 hover:underline"
                >
                  Obter chave grátis na Groq
                  <ExternalLinkIcon size={11} />
                </a>
              </div>

              <div className="relative">
                <Input
                  name="groqApiKey"
                  type={showKey ? "text" : "password"}
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  placeholder="gsk_..."
                  className="h-10 rounded-xl border-slate-200 bg-white font-mono text-xs pr-10 focus:border-primary focus-visible:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showKey ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                </button>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Gratuita e ultraveloz. Utiliza o modelo Llama 3.3 da Meta para texto e Whisper Large v3 para transcrição de áudios sem custo.
              </p>
            </div>
          )}

          {provider === "OPENAI" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <KeyIcon size={13} className="text-primary" />
                  OpenAI API Key (Chave Secreta)
                </label>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 hover:underline"
                >
                  Gerar chave na OpenAI Platform
                  <ExternalLinkIcon size={11} />
                </a>
              </div>

              <div className="relative">
                <Input
                  name="openaiApiKey"
                  type={showKey ? "text" : "password"}
                  value={openAiKey}
                  onChange={(e) => setOpenAiKey(e.target.value)}
                  placeholder="sk-..."
                  className="h-10 rounded-xl border-slate-200 bg-white font-mono text-xs pr-10 focus:border-primary focus-visible:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showKey ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                </button>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Utiliza GPT-4o e Whisper-1. Requer recarga de créditos pré-pagos (mínimo US$ 5) na sua conta da OpenAI Platform.
              </p>
            </div>
          )}

          {/* Salva os outros valores caso o usuário alterne de provedor para não perdê-los */}
          {provider !== "GOOGLE_GEMINI" && (
            <input type="hidden" name="geminiApiKey" value={geminiKey} />
          )}
          {provider !== "GROQ" && (
            <input type="hidden" name="groqApiKey" value={groqKey} />
          )}
          {provider !== "OPENAI" && (
            <input type="hidden" name="openaiApiKey" value={openAiKey} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
