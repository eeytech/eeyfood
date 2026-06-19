"use client";

import autoTable from "jspdf-autotable";
import { DownloadIcon } from "lucide-react";
import { jsPDF } from "jspdf";

import { Button } from "@/components/ui/button";
import type { DashboardData } from "@/lib/admin-queries";

type DocAT = jsPDF & { lastAutoTable: { finalY: number } };

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const HEAD: [number, number, number] = [228, 29, 44];

const PAYMENT_LABELS: Record<string, string> = {
  MERCADO_PAGO: "Mercado Pago",
  DINHEIRO: "Dinheiro",
  CARTAO_PRESENCIAL: "Cartão Presencial",
};

const CONSUMPTION_LABELS: Record<string, string> = {
  DELIVERY: "Delivery",
  TAKEAWAY: "Retirada",
  DINE_IN: "Mesa/Comanda",
};

const TAB_LABELS: Record<string, string> = {
  overview: "Painel Geral",
  produtos: "Produtos e Opcionais",
  logistica: "Logística e Entregadores",
  marketing: "Marketing — Cupons e Cashback",
  pagamentos: "Pagamentos e Custos",
};

interface ExportPDFButtonProps {
  data: DashboardData;
  activeTab: string;
  from: string;
  to: string;
}

const ExportPDFButton = ({ data, activeTab, from, to }: ExportPDFButtonProps) => {
  const handleExport = () => {
    const doc = new jsPDF() as DocAT;
    const todayLabel = new Date().toLocaleDateString("pt-BR");
    const periodLabel = `${fmtDate(from)} — ${fmtDate(to)}`;

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`Relatório: ${TAB_LABELS[activeTab] ?? activeTab}`, 14, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Período: ${periodLabel}   •   Gerado em: ${todayLabel}`, 14, 25);
    doc.setTextColor(0);

    let y = 32;

    const section = (title: string) => {
      y = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : y;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(title, 14, y);
      y += 4;
    };

    // ── PAINEL GERAL ──────────────────────────────────────────────────────────
    if (activeTab === "overview") {
      autoTable(doc, {
        startY: y,
        head: [["Indicador", "Valor"]],
        body: [
          ["Faturamento bruto", fmt(data.summary.grossRevenue)],
          ["Custo estimado", fmt(data.summary.estimatedCost)],
          ["Lucro estimado", fmt(data.summary.estimatedProfit)],
          ["Ticket médio", fmt(data.summary.avgTicket)],
          ["Total de pedidos", String(data.summary.totalOrders)],
          ["Margem de lucro", `${data.summary.profitMargin.toFixed(1)}%`],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: HEAD },
        columnStyles: { 1: { halign: "right" } },
      });

      section("Evolução diária");
      autoTable(doc, {
        startY: y,
        head: [["Data", "Pedidos", "Faturamento", "Lucro estimado"]],
        body:
          data.dailyRevenue.length > 0
            ? data.dailyRevenue.map((r) => [
                fmtDate(r.date),
                String(r.totalOrders),
                fmt(r.grossRevenue),
                fmt(r.estimatedProfit),
              ])
            : [["—", "—", "Sem dados", "—"]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: HEAD },
        columnStyles: { 2: { halign: "right" }, 3: { halign: "right" } },
      });

      section("Faturamento por canal");
      autoTable(doc, {
        startY: y,
        head: [["Canal", "Pedidos", "Faturamento"]],
        body: data.revenueByConsumption.map((r) => [
          CONSUMPTION_LABELS[r.consumptionMethod] ?? r.consumptionMethod,
          String(r.count),
          fmt(r.total),
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: HEAD },
        columnStyles: { 2: { halign: "right" } },
      });
    }

    // ── PRODUTOS ──────────────────────────────────────────────────────────────
    if (activeTab === "produtos") {
      autoTable(doc, {
        startY: y,
        head: [["#", "Produto", "Unidades", "Receita"]],
        body:
          data.topProducts.length > 0
            ? data.topProducts.map((p, i) => [
                `#${i + 1}`,
                p.productName,
                String(p.totalQuantity),
                fmt(p.grossRevenue),
              ])
            : [["—", "Nenhum produto vendido no período.", "—", "—"]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: HEAD },
        columnStyles: { 3: { halign: "right" } },
      });

      section("Produtos com menor saída");
      autoTable(doc, {
        startY: y,
        head: [["Produto", "Unidades", "Receita"]],
        body: data.bottomProducts.map((p) => [p.productName, String(p.totalQuantity), fmt(p.grossRevenue)]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: HEAD },
        columnStyles: { 2: { halign: "right" } },
      });

      section("Opcionais mais pedidos");
      autoTable(doc, {
        startY: y,
        head: [["#", "Opcional", "Qtd.", "Receita extra"]],
        body: data.topModifiers.map((m, i) => [
          `#${i + 1}`,
          m.optionName,
          String(m.totalCount),
          fmt(m.estimatedRevenue),
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: HEAD },
        columnStyles: { 3: { halign: "right" } },
      });
    }

    // ── LOGÍSTICA ─────────────────────────────────────────────────────────────
    if (activeTab === "logistica") {
      autoTable(doc, {
        startY: y,
        head: [["#", "Entregador", "Entregas", "Taxa total"]],
        body:
          data.courierMetrics.length > 0
            ? data.courierMetrics.map((c, i) => [
                `#${i + 1}`,
                c.courierName,
                String(c.deliveryCount),
                fmt(c.totalFees),
              ])
            : [["—", "Nenhum entregador cadastrado.", "—", "—"]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: HEAD },
        columnStyles: { 3: { halign: "right" } },
      });
    }

    // ── MARKETING ─────────────────────────────────────────────────────────────
    if (activeTab === "marketing") {
      autoTable(doc, {
        startY: y,
        head: [["Métrica de Cashback", "Valor"]],
        body: [
          ["Cashback gerado (creditado)", fmt(data.cashbackMetrics.totalEarned)],
          ["Cashback resgatado (utilizado)", fmt(data.cashbackMetrics.totalRedeemed)],
          ["Saldo em circulação", fmt(data.cashbackMetrics.currentBalance)],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: HEAD },
        columnStyles: { 1: { halign: "right" } },
      });

      section("Uso de cupons");
      autoTable(doc, {
        startY: y,
        head: [["Cupom", "Utilizações", "Desconto total", "Desconto médio"]],
        body:
          data.couponUsage.length > 0
            ? data.couponUsage.map((c) => [
                c.couponCode,
                `${c.usageCount}×`,
                fmt(c.totalDiscount),
                fmt(c.usageCount > 0 ? c.totalDiscount / c.usageCount : 0),
              ])
            : [["—", "—", "Nenhum cupom utilizado.", "—"]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: HEAD },
        columnStyles: { 2: { halign: "right" }, 3: { halign: "right" } },
      });
    }

    // ── PAGAMENTOS ────────────────────────────────────────────────────────────
    if (activeTab === "pagamentos") {
      autoTable(doc, {
        startY: y,
        head: [["Forma de pagamento", "Pedidos", "Total"]],
        body:
          data.paymentMethods.length > 0
            ? data.paymentMethods.map((p) => [
                PAYMENT_LABELS[p.paymentMethod] ?? p.paymentMethod,
                String(p.count),
                fmt(p.total),
              ])
            : [["—", "—", "Sem dados de pagamento."]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: HEAD },
        columnStyles: { 2: { halign: "right" } },
      });

      section("Transações financeiras por categoria");
      autoTable(doc, {
        startY: y,
        head: [["Categoria", "Tipo", "Qtd.", "Total"]],
        body:
          data.financialBreakdown.length > 0
            ? data.financialBreakdown.map((f) => [
                f.categoryName ?? "Sem categoria",
                f.type === "EXPENSE" ? "Despesa" : "Receita",
                String(f.count),
                `${f.type === "EXPENSE" ? "−" : "+"}${fmt(f.total)}`,
              ])
            : [["—", "—", "—", "Sem transações no período."]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: HEAD },
        columnStyles: { 3: { halign: "right" } },
      });
    }

    const filename = `relatorio-${activeTab}-${from}-${to}.pdf`;
    doc.save(filename);
  };

  return (
    <Button onClick={handleExport} variant="outline" size="sm" className="print:hidden">
      <DownloadIcon className="mr-2 size-4" />
      Exportar PDF
    </Button>
  );
};

export default ExportPDFButton;
