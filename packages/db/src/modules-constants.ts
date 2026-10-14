export interface SystemModule {
  id: string;
  name: string;
  description: string;
  category: "operacoes" | "catalogo" | "financeiro" | "marketing" | "integracoes" | "gestao";
  categoryLabel: string;
  iconName: string;
}

export type PlanPresetId = "BASICO" | "INTERMEDIARIO" | "COMPLETO" | "CUSTOM";

export interface PlanPreset {
  id: PlanPresetId;
  name: string;
  badge: string;
  description: string;
  recommendedFor: string;
  moduleIds: string[];
}

export const AVAILABLE_MODULES: SystemModule[] = [
  // ── Operações ───────────────────────────────────────────────────────────
  {
    id: "pedidos",
    name: "Gestão de Pedidos",
    description: "Painel em tempo real para recebimento, aceite, despacho e acompanhamento de pedidos de delivery, balcão e salão.",
    category: "operacoes",
    categoryLabel: "Operações & Atendimento",
    iconName: "ClipboardListIcon",
  },
  {
    id: "pdv",
    name: "PDV (Frente de Caixa)",
    description: "Ponto de venda ágil para lançamentos expressos no balcão, sangrias, suprimentos e controle de turnos de caixa.",
    category: "operacoes",
    categoryLabel: "Operações & Atendimento",
    iconName: "MonitorSmartphoneIcon",
  },
  {
    id: "comandas",
    name: "Comandas & Atendimento",
    description: "Lançamento de pedidos em comandas individuais de clientes no salão, transferência de itens e divisão de conta.",
    category: "operacoes",
    categoryLabel: "Operações & Atendimento",
    iconName: "UsersRoundIcon",
  },
  {
    id: "mesas",
    name: "Mesas & QR Codes",
    description: "Mapa visual de mesas, acompanhamento de ocupação, união de mesas e geração de QR Codes para autoatendimento.",
    category: "operacoes",
    categoryLabel: "Operações & Atendimento",
    iconName: "LayoutGridIcon",
  },
  {
    id: "kds",
    name: "Cozinha Digital (KDS)",
    description: "Painel de produção digital para a cozinha e bar, separando itens por praças com temporizadores de preparo.",
    category: "operacoes",
    categoryLabel: "Operações & Atendimento",
    iconName: "ConciergeBellIcon",
  },
  {
    id: "entregas",
    name: "Logística & Motoboys",
    description: "Expedição de delivery, alocação de entregadores próprios ou terceirizados, taxas de entrega e histórico de viagens.",
    category: "operacoes",
    categoryLabel: "Operações & Atendimento",
    iconName: "BikeIcon",
  },
  {
    id: "senha",
    name: "Painel de Senhas / TV",
    description: "Exibição de chamada de senhas de pedidos prontos para retirada em telas de salão ou TVs dedicadas.",
    category: "operacoes",
    categoryLabel: "Operações & Atendimento",
    iconName: "TvIcon",
  },

  // ── Cardápio & Estoque ──────────────────────────────────────────────────
  {
    id: "cardapio",
    name: "Cardápio & Impressão",
    description: "Gestão de categorias, produtos, complementos, adicionais, regras de pizza e geração de versão para impressão.",
    category: "catalogo",
    categoryLabel: "Cardápio & Estoque",
    iconName: "UtensilsCrossedIcon",
  },
  {
    id: "estoque",
    name: "Estoque & Compras",
    description: "Controle de saldo de insumos, ficha técnica de receitas, apontamento de perdas e notas de entrada de fornecedores.",
    category: "catalogo",
    categoryLabel: "Cardápio & Estoque",
    iconName: "BoxesIcon",
  },

  // ── Financeiro & Métricas ───────────────────────────────────────────────
  {
    id: "financeiro",
    name: "Gestão Financeira & Fiscal",
    description: "DRE gerencial, fluxo de caixa, contas a pagar e receber, fiados de clientes, conciliação bancária e emissão fiscal.",
    category: "financeiro",
    categoryLabel: "Financeiro & Métricas",
    iconName: "CircleDollarSignIcon",
  },
  {
    id: "relatorios",
    name: "Relatórios & Métricas",
    description: "Gráficos analíticos de faturamento, ticket médio, produtos mais vendidos, clientes frequentes e horários de pico.",
    category: "financeiro",
    categoryLabel: "Financeiro & Métricas",
    iconName: "BarChart3Icon",
  },

  // ── Marketing & Vendas ──────────────────────────────────────────────────
  {
    id: "crm",
    name: "Clientes & CRM",
    description: "Base consolidada de clientes, histórico de consumo, LTV, preferências, endereços e identificação de clientes inativos.",
    category: "marketing",
    categoryLabel: "Marketing & Fidelidade",
    iconName: "HeartHandshakeIcon",
  },
  {
    id: "campanhas",
    name: "Campanhas Promocionais",
    description: "Gestão de disparos promocionais e promoções programadas para alavancar vendas em dias de menor movimento.",
    category: "marketing",
    categoryLabel: "Marketing & Fidelidade",
    iconName: "MegaphoneIcon",
  },
  {
    id: "cupons",
    name: "Cupons de Desconto",
    description: "Criação de cupons promocionais em percentual ou valor fixo, com regras de pedido mínimo e limites de uso.",
    category: "marketing",
    categoryLabel: "Marketing & Fidelidade",
    iconName: "TagIcon",
  },
  {
    id: "cashback",
    name: "Fidelidade & Cashback",
    description: "Programa de fidelidade com acúmulo de saldo percentual por pedido para incentivar pedidos recorrentes.",
    category: "marketing",
    categoryLabel: "Marketing & Fidelidade",
    iconName: "CoinsIcon",
  },
  {
    id: "frete",
    name: "Regras de Frete Grátis",
    description: "Configuração de incentivo de frete grátis por distância (km) ou valor mínimo de compras no pedido.",
    category: "marketing",
    categoryLabel: "Marketing & Fidelidade",
    iconName: "GiftIcon",
  },
  {
    id: "marketing_banners",
    name: "Gerador de Banners",
    description: "Criação assistida de banners visuais promocionais para divulgação de pratos no topo do aplicativo e cardápio.",
    category: "marketing",
    categoryLabel: "Marketing & Fidelidade",
    iconName: "SparklesIcon",
  },
  {
    id: "marketing",
    name: "Rastreamento & Pixels",
    description: "Conexão de tags de conversão do Meta Ads (Facebook/Instagram), Google Ads e TikTok para remarketing profissional.",
    category: "marketing",
    categoryLabel: "Marketing & Fidelidade",
    iconName: "TargetIcon",
  },

  // ── Integrações & IA ────────────────────────────────────────────────────
  {
    id: "marketplaces",
    name: "Integração Marketplaces",
    description: "Centralização e importação de pedidos de marketplaces como iFood e Keeta diretamente para o fluxo da loja.",
    category: "integracoes",
    categoryLabel: "Integrações & Inovação",
    iconName: "ShoppingBagIcon",
  },
  {
    id: "whatsapp",
    name: "Automação WhatsApp",
    description: "Disparo automático de mensagens sobre o progresso do pedido e atendimento interativo para clientes.",
    category: "integracoes",
    categoryLabel: "Integrações & Inovação",
    iconName: "MessageSquareIcon",
  },
  {
    id: "ai",
    name: "Inteligência Artificial (IA)",
    description: "Assistente de inteligência artificial para otimização de cardápio, sugestões de vendas e suporte automatizado.",
    category: "integracoes",
    categoryLabel: "Integrações & Inovação",
    iconName: "SparklesIcon",
  },

  // ── Gestão & Suporte ────────────────────────────────────────────────────
  {
    id: "documentacoes",
    name: "Documentações & Manuais",
    description: "Guias operacionais passo a passo e manuais interativos de cada tela do sistema para treinamento da equipe.",
    category: "gestao",
    categoryLabel: "Gestão & Acessos",
    iconName: "BookOpenIcon",
  },
  {
    id: "usuarios",
    name: "Acessos & Funcionários",
    description: "Cadastro de usuários, atendentes, caixas e garçons com atribuição de funções e limites de acesso na plataforma.",
    category: "gestao",
    categoryLabel: "Gestão & Acessos",
    iconName: "Users2Icon",
  },
];

export const ALL_MODULE_IDS: string[] = AVAILABLE_MODULES.map((m) => m.id);

export const PLAN_PRESETS: PlanPreset[] = [
  {
    id: "BASICO",
    name: "Plano Básico / Delivery",
    badge: "Essencial",
    description: "Ideal para operações enxutas de delivery e retirada no balcão que necessitam apenas das ferramentas fundamentais.",
    recommendedFor: "Pequenos deliveries, dark kitchens e estabelecimentos iniciantes.",
    moduleIds: [
      "pedidos",
      "pdv",
      "cardapio",
      "relatorios",
      "documentacoes",
      "usuarios",
    ],
  },
  {
    id: "INTERMEDIARIO",
    name: "Plano Intermediário / Salão & Operação",
    badge: "Mais Popular",
    description: "Solução completa para restaurantes com salão, garçons, praças de cozinha e controle operacional de estoque.",
    recommendedFor: "Restaurantes, pizzarias, hamburguerias e bares com atendimento presencial e entregas.",
    moduleIds: [
      "pedidos",
      "pdv",
      "comandas",
      "mesas",
      "kds",
      "entregas",
      "cardapio",
      "estoque",
      "relatorios",
      "crm",
      "cupons",
      "senha",
      "documentacoes",
      "usuarios",
    ],
  },
  {
    id: "COMPLETO",
    name: "Plano Avançado / Enterprise",
    badge: "Completo",
    description: "Acesso irrestrito a todo o ecossistema EeyFood: financeiro completo, IA, automação WhatsApp, fidelidade e marketplaces.",
    recommendedFor: "Grandes restaurantes, redes e estabelecimentos que buscam máxima escala e automação.",
    moduleIds: [...ALL_MODULE_IDS],
  },
  {
    id: "CUSTOM",
    name: "Plano Personalizado",
    badge: "Sob Medida",
    description: "Módulos selecionados manualmente pelo Super Administrador de acordo com o contrato específico do cliente.",
    recommendedFor: "Clientes com pacotes customizados de funcionalidades.",
    moduleIds: [],
  },
];

/**
 * Verifica se um módulo específico está habilitado para o restaurante.
 * Se `enabledModules` for null ou undefined (estabelecimentos antigos ou sem restrição explícita configurada),
 * retorna `true` garantindo compatibilidade total e retroativa.
 */
export function isModuleEnabled(
  moduleId: string,
  enabledModules?: string[] | null,
): boolean {
  if (!enabledModules || !Array.isArray(enabledModules)) {
    return true;
  }
  return enabledModules.includes(moduleId);
}

/**
 * Retorna o ID do módulo associado a uma rota URL do painel de gestão.
 */
export function getModuleForRoute(pathname: string): string | null {
  const normalized = pathname.replace(/^\/+/, "");
  const segments = normalized.split("/");
  const first = segments[0] || "";
  const sub = segments.slice(0, 2).join("/");

  // Rotas aninhadas específicas
  if (sub === "configuracoes/documentacoes") return "documentacoes";
  if (sub === "configuracoes/usuarios") return "usuarios";
  if (sub === "marketing/banners") return "marketing_banners";
  if (sub === "mesas/qrcodes") return "mesas";
  if (sub === "cardapio/impressao") return "cardapio";
  if (sub === "estoque/compras") return "estoque";

  // Rotas de primeiro nível
  if (first === "pedidos") return "pedidos";
  if (first === "pdv") return "pdv";
  if (first === "comandas" || first === "garcom") return "comandas";
  if (first === "mesas") return "mesas";
  if (first === "kds") return "kds";
  if (first === "entregas" || first === "logistica") return "entregas";
  if (first === "cardapio") return "cardapio";
  if (first === "estoque") return "estoque";
  if (first === "financeiro") return "financeiro";
  if (first === "relatorios") return "relatorios";
  if (first === "crm") return "crm";
  if (first === "campanhas") return "campanhas";
  if (first === "cupons") return "cupons";
  if (first === "cashback") return "cashback";
  if (first === "frete") return "frete";
  if (first === "marketplaces") return "marketplaces";
  if (first === "whatsapp") return "whatsapp";
  if (first === "ai") return "ai";
  if (first === "marketing") return "marketing";
  if (first === "senha") return "senha";

  return null;
}

/**
 * Busca a definição de um módulo pelo seu ID.
 */
export function getModuleById(moduleId: string): SystemModule | undefined {
  return AVAILABLE_MODULES.find((m) => m.id === moduleId);
}
