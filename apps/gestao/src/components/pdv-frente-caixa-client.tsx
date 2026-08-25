"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

import type PdvFrenteCaixa from "./pdv-frente-caixa";

const PdvFrenteCaixaDynamic = dynamic(
  () => import("./pdv-frente-caixa"),
  { ssr: false },
);

export default function PdvFrenteCaixaClient(
  props: ComponentProps<typeof PdvFrenteCaixa>,
) {
  return <PdvFrenteCaixaDynamic {...props} />;
}
