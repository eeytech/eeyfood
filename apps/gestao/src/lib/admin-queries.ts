import type {
  DiningTable,
  MenuCategory,
  Product,
  ProductOption,
  ProductOptionGroup,
  Restaurant,
} from "@fsw/db";
import {
  aiSettingsTable,
  and,
  asc,
  buscarRestaurantePorSlug,
  db,
  desc,
  diningTablesTable,
  eq,
  financialCategoriesTable,
  financialTransactionsTable,
  listarCouriersPorSlug,
  listarMesasComandasPorSlug,
  listarPedidosRecebimentoPorSlug,
  menuCategoriesTable,
  operatingHoursTable,
  productOptionGroupsTable,
  productOptionsTable,
  productsTable,
} from "@fsw/db";

export interface CategoriaComProdutos extends MenuCategory {
  products: Product[];
}

export interface CardapioGestao {
  restaurant: Restaurant;
  categories: CategoriaComProdutos[];
  products: Array<Product & { categoryName: string; categoryId: string }>;
}

export interface RelatorioResumoDiario {
  referenceDate: string;
  totalOrders: number;
  grossRevenue: number;
  estimatedCost: number;
  estimatedProfit: number;
}

export interface ProdutoMaisVendido {
  productId: string;
  productName: string;
  totalQuantity: number;
  grossRevenue: number;
}

export interface RelatorioBasico {
  today: RelatorioResumoDiario;
  history: RelatorioResumoDiario[];
  topProducts: ProdutoMaisVendido[];
}

export const listarMesasComandasGestao = async (slug: string) => {
  return listarMesasComandasPorSlug(slug);
};

export const listarMesasGestao = async (slug: string): Promise<DiningTable[]> => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];

  return db
    .select()
    .from(diningTablesTable)
    .where(eq(diningTablesTable.restaurantId, restaurant.id))
    .orderBy(asc(diningTablesTable.displayOrder), asc(diningTablesTable.name));
};

export const buscarRestauranteParaGestao = async (
  slug: string,
): Promise<Restaurant | null> => {
  return buscarRestaurantePorSlug(slug);
};

export const buscarCardapioGestao = async (
  slug: string,
): Promise<CardapioGestao | null> => {
  const restaurant = await buscarRestaurantePorSlug(slug);

  if (!restaurant) {
    return null;
  }

  const rows = await db
    .select({
      category: menuCategoriesTable,
      product: productsTable,
    })
    .from(menuCategoriesTable)
    .leftJoin(
      productsTable,
      eq(productsTable.menuCategoryId, menuCategoriesTable.id),
    )
    .where(eq(menuCategoriesTable.restaurantId, restaurant.id))
    .orderBy(
      asc(menuCategoriesTable.displayOrder),
      asc(menuCategoriesTable.name),
      asc(productsTable.name),
    );

  const categoryMap = new Map<string, CategoriaComProdutos>();

  for (const row of rows) {
    const currentCategory = categoryMap.get(row.category.id) ?? {
      ...row.category,
      products: [],
    };

    if (row.product) {
      currentCategory.products.push(row.product);
    }

    categoryMap.set(row.category.id, currentCategory);
  }

  const categories = Array.from(categoryMap.values());
  const products = categories.flatMap((category) =>
    category.products.map((product) => ({
      ...product,
      categoryId: category.id,
      categoryName: category.name,
    })),
  );

  return {
    restaurant,
    categories,
    products,
  };
};

const toDateKey = (date: Date | string) => {
  return new Date(date).toISOString().slice(0, 10);
};

const isOrderEligibleForRevenue = (
  orderStatus: string,
  paymentStatus: string,
): boolean => {
  if (orderStatus === "CANCELLED") {
    return false;
  }

  if (paymentStatus === "FAILED" || paymentStatus === "CANCELLED") {
    return false;
  }

  return true;
};

export const gerarRelatorioBasico = async (
  slug: string,
): Promise<RelatorioBasico | null> => {
  const restaurant = await buscarRestaurantePorSlug(slug);

  if (!restaurant) {
    return null;
  }

  const orders = await listarPedidosRecebimentoPorSlug(slug);
  const eligibleOrders = orders.filter((order) =>
    isOrderEligibleForRevenue(order.status, order.paymentStatus),
  );

  const historyMap = new Map<string, RelatorioResumoDiario>();
  const topProductsMap = new Map<string, ProdutoMaisVendido>();

  for (const order of eligibleOrders) {
    const dateKey = toDateKey(order.createdAt);
    const currentDay = historyMap.get(dateKey) ?? {
      referenceDate: dateKey,
      totalOrders: 0,
      grossRevenue: 0,
      estimatedCost: 0,
      estimatedProfit: 0,
    };

    currentDay.totalOrders += 1;
    currentDay.grossRevenue += order.total;
    currentDay.estimatedCost += order.estimatedCost;
    currentDay.estimatedProfit += order.estimatedProfit;
    historyMap.set(dateKey, currentDay);

    for (const item of order.orderProducts) {
      const currentProduct = topProductsMap.get(item.product.id) ?? {
        productId: item.product.id,
        productName: item.product.name,
        totalQuantity: 0,
        grossRevenue: 0,
      };

      currentProduct.totalQuantity += item.quantity;
      currentProduct.grossRevenue += item.lineTotal;
      topProductsMap.set(item.product.id, currentProduct);
    }
  }

  const history = Array.from(historyMap.values()).sort((left, right) =>
    right.referenceDate.localeCompare(left.referenceDate),
  );

  const todayKey = new Date().toISOString().slice(0, 10);
  const today =
    history.find((item) => item.referenceDate === todayKey) ?? {
      referenceDate: todayKey,
      totalOrders: 0,
      grossRevenue: 0,
      estimatedCost: 0,
      estimatedProfit: 0,
    };

  const topProducts = Array.from(topProductsMap.values())
    .sort((left, right) => right.totalQuantity - left.totalQuantity)
    .slice(0, 5);

  return {
    today,
    history,
    topProducts,
  };
};

export const listarCouriersGestao = async (slug: string) => {
  return listarCouriersPorSlug(slug);
};

export const listarTransacoesFinanceirasPorSlug = async (slug: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];

  return db
    .select({
      transaction: financialTransactionsTable,
      category: {
        id: financialCategoriesTable.id,
        name: financialCategoriesTable.name,
        type: financialCategoriesTable.type,
      },
    })
    .from(financialTransactionsTable)
    .leftJoin(
      financialCategoriesTable,
      eq(financialCategoriesTable.id, financialTransactionsTable.categoryId),
    )
    .where(eq(financialTransactionsTable.restaurantId, restaurant.id))
    .orderBy(desc(financialTransactionsTable.dueDate));
};

export const listarCategoriasFinanceirasGestao = async (slug: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];

  return db
    .select()
    .from(financialCategoriesTable)
    .where(eq(financialCategoriesTable.restaurantId, restaurant.id))
    .orderBy(asc(financialCategoriesTable.name));
};

export const buscarAiSettingsPorSlug = async (slug: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return null;

  const [settings] = await db
    .select()
    .from(aiSettingsTable)
    .where(eq(aiSettingsTable.restaurantId, restaurant.id))
    .limit(1);

  return settings ?? null;
};

export type ProdutoComOpcionais = Product & {
  optionGroups: (ProductOptionGroup & { options: ProductOption[] })[];
};

export const buscarProdutoComOpcionaisGestao = async (
  productId: string,
  restaurantId: string,
): Promise<ProdutoComOpcionais | null> => {
  const rows = await db
    .select({
      group: productOptionGroupsTable,
      option: productOptionsTable,
    })
    .from(productOptionGroupsTable)
    .leftJoin(
      productOptionsTable,
      eq(productOptionsTable.productOptionGroupId, productOptionGroupsTable.id),
    )
    .where(eq(productOptionGroupsTable.productId, productId))
    .orderBy(
      asc(productOptionGroupsTable.displayOrder),
      asc(productOptionGroupsTable.name),
      asc(productOptionsTable.displayOrder),
      asc(productOptionsTable.name),
    );

  const [product] = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.id, productId), eq(productsTable.restaurantId, restaurantId)))
    .limit(1);

  if (!product) return null;

  const groupMap = new Map<string, ProductOptionGroup & { options: ProductOption[] }>();
  for (const row of rows) {
    const g = groupMap.get(row.group.id) ?? { ...row.group, options: [] };
    if (row.option) g.options.push(row.option);
    groupMap.set(row.group.id, g);
  }

  return { ...product, optionGroups: Array.from(groupMap.values()) };
};

export const buscarConfiguracoesRestaurante = async (slug: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return null;

  const operatingHours = await db
    .select()
    .from(operatingHoursTable)
    .where(eq(operatingHoursTable.restaurantId, restaurant.id))
    .orderBy(asc(operatingHoursTable.dayOfWeek));

  return {
    restaurant,
    operatingHours,
  };
};
