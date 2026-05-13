import type { MenuCategory, Product, Restaurant } from "@fsw/db";
import {
  asc,
  buscarRestaurantePorSlug,
  db,
  eq,
  listarPedidosRecebimentoPorSlug,
  menuCategoriesTable,
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
