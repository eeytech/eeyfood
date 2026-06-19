"use client";

import autoTable from "jspdf-autotable";
import { DownloadIcon } from "lucide-react";
import { jsPDF } from "jspdf";

import { Button } from "@/components/ui/button";
import type { RelatorioBasico } from "@/lib/admin-queries";

interface ExportPDFButtonProps {
  report: RelatorioBasico;
}

type DocWithAutoTable = jsPDF & { lastAutoTable: { finalY: number } };

const fmt = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const fmtDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));

const HEAD_COLOR: [number, number, number] = [228, 29, 44];

const ExportPDFButton = ({ report }: ExportPDFButtonProps) => {
  const handleExport = () => {
    const doc = new jsPDF() as DocWithAutoTable;
    const todayLabel = new Date().toLocaleDateString("pt-BR");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Relatório Operacional", 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Gerado em ${todayLabel}`, 14, 27);
    doc.setTextColor(0);

    // — Resumo do dia ————————————————————————————
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Resumo do Dia", 14, 40);

    autoTable(doc, {
      startY: 45,
      head: [["Métrica", "Valor"]],
      body: [
        ["Faturamento do dia", fmt(report.today.grossRevenue)],
        ["Lucro estimado", fmt(report.today.estimatedProfit)],
        ["Custo estimado", fmt(report.today.estimatedCost)],
        ["Total de pedidos", String(report.today.totalOrders)],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: HEAD_COLOR },
      columnStyles: { 1: { halign: "right" } },
    });

    // — Histórico diário ————————————————————————————
    let y = doc.lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Histórico Diário", 14, y);

    autoTable(doc, {
      startY: y + 5,
      head: [["Data", "Pedidos", "Faturamento", "Custo estimado", "Lucro estimado"]],
      body:
        report.history.length > 0
          ? report.history.map((row) => [
              fmtDate(row.referenceDate),
              String(row.totalOrders),
              fmt(row.grossRevenue),
              fmt(row.estimatedCost),
              fmt(row.estimatedProfit),
            ])
          : [["—", "—", "Sem dados", "—", "—"]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: HEAD_COLOR },
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    });

    // — Produtos mais vendidos ————————————————————————————
    y = doc.lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Produtos Mais Vendidos", 14, y);

    autoTable(doc, {
      startY: y + 5,
      head: [["#", "Produto", "Unidades vendidas", "Receita"]],
      body:
        report.topProducts.length > 0
          ? report.topProducts.map((p, i) => [
              String(i + 1),
              p.productName,
              String(p.totalQuantity),
              fmt(p.grossRevenue),
            ])
          : [["—", "Nenhum produto vendido ainda.", "—", "—"]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: HEAD_COLOR },
      columnStyles: { 3: { halign: "right" } },
    });

    doc.save(`relatorio-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <Button onClick={handleExport} variant="outline" size="sm" className="print:hidden">
      <DownloadIcon className="mr-2 size-4" />
      Exportar PDF
    </Button>
  );
};

export default ExportPDFButton;
