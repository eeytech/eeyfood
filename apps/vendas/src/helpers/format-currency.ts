export const formatCurrency = (value: number | string) => {
  const num = typeof value === "number" ? value : Number(value || 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(isNaN(num) ? 0 : num);
};

