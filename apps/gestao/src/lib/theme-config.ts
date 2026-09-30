export type ThemeId =
  | "red"
  | "rose"
  | "orange"
  | "green"
  | "blue"
  | "yellow"
  | "violet"
  | "zinc"
  | "slate"
  | "stone"
  | "gray"
  | "neutral";

export interface SystemTheme {
  id: ThemeId;
  name: string;
  label: string;
  category: "Cromático" | "Neutro";
  hex: string;
  bgSample: string;
  hoverHex: string;
  description: string;
}

export const SYSTEM_THEMES: SystemTheme[] = [
  {
    id: "red",
    name: "Red (Padrão)",
    label: "Vermelho Carmesim",
    category: "Cromático",
    hex: "#e11d48",
    bgSample: "bg-red-600",
    hoverHex: "#be123c",
    description: "Tema dinâmico e marcante, identidade padrão do delivery.",
  },
  {
    id: "rose",
    name: "Rose",
    label: "Rosa Intenso",
    category: "Cromático",
    hex: "#f43f5e",
    bgSample: "bg-rose-500",
    hoverHex: "#e11d48",
    description: "Visual moderno, vibrante e caloroso.",
  },
  {
    id: "orange",
    name: "Orange",
    label: "Laranja Solar",
    category: "Cromático",
    hex: "#f97316",
    bgSample: "bg-orange-500",
    hoverHex: "#ea580c",
    description: "Energético e apetitoso, estimula a ação e pedidos.",
  },
  {
    id: "green",
    name: "Green",
    label: "Verde Esmeralda",
    category: "Cromático",
    hex: "#16a34a",
    bgSample: "bg-green-600",
    hoverHex: "#15803d",
    description: "Equilibrado, associado a saúde, frescor e eficiência.",
  },
  {
    id: "blue",
    name: "Blue",
    label: "Azul Safira",
    category: "Cromático",
    hex: "#2563eb",
    bgSample: "bg-blue-600",
    hoverHex: "#1d4ed8",
    description: "Profissional, corporativo e focado em produtividade.",
  },
  {
    id: "yellow",
    name: "Yellow",
    label: "Âmbar Dourado",
    category: "Cromático",
    hex: "#ca8a04",
    bgSample: "bg-yellow-500",
    hoverHex: "#a16207",
    description: "Quente, radiante e com alto contraste para gestão rápida.",
  },
  {
    id: "violet",
    name: "Violet",
    label: "Violeta Tecnológico",
    category: "Cromático",
    hex: "#7c3aed",
    bgSample: "bg-violet-600",
    hoverHex: "#6d28d9",
    description: "Estilo sofisticado, criativo e inovador.",
  },
  {
    id: "zinc",
    name: "Zinc",
    label: "Grafite Zinc",
    category: "Neutro",
    hex: "#18181b",
    bgSample: "bg-zinc-900",
    hoverHex: "#27272a",
    description: "Monocromático contemporâneo de alto contraste.",
  },
  {
    id: "slate",
    name: "Slate",
    label: "Ardósia Escura",
    category: "Neutro",
    hex: "#0f172a",
    bgSample: "bg-slate-900",
    hoverHex: "#1e293b",
    description: "Tons azulados profundos e discretos, ideal para longas jornadas.",
  },
  {
    id: "stone",
    name: "Stone",
    label: "Terracota Stone",
    category: "Neutro",
    hex: "#1c1917",
    bgSample: "bg-stone-900",
    hoverHex: "#292524",
    description: "Acabamento mineral suave com tons quentes acolhedores.",
  },
  {
    id: "gray",
    name: "Gray",
    label: "Cinza Urbano",
    category: "Neutro",
    hex: "#111827",
    bgSample: "bg-gray-900",
    hoverHex: "#1f2937",
    description: "Elegância minimalista com cinza puro e clean.",
  },
  {
    id: "neutral",
    name: "Neutral",
    label: "Neutro Absoluto",
    category: "Neutro",
    hex: "#171717",
    bgSample: "bg-neutral-900",
    hoverHex: "#262626",
    description: "Design neutro rigoroso e atemporal.",
  },
];

export const DEFAULT_THEME: ThemeId = "red";
export const THEME_COOKIE_NAME = "eey_theme";
export const THEME_LOCAL_STORAGE_KEY = "eey_system_theme";
