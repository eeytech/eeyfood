import type {
  CompanyVehicle,
  Coupon,
  Courier,
  DiningTable,
  LoyaltyRule,
  MenuCategory,
  Product,
  ProductOption,
  ProductOptionGroup,
  Restaurant,
  VehicleStatus,
} from "@fsw/db";
import {
  aiSettingsTable,
  and,
  asc,
  buscarRestaurantePorSlug,
  companyVehiclesTable,
  couponsTable,
  couriersTable,
  db,
  desc,
  diningTablesTable,
  eq,
  financialCategoriesTable,
  financialTransactionsTable,
  ilike,
  listarCouriersPorSlug,
  listarMesasComandasPorSlug,
  listarPedidosRecebimentoPorSlug,
  loyaltyRulesTable,
  menuCategoriesTable,
  operatingHoursTable,
  or,
  productOptionGroupsTable,
  productOptionsTable,
  productsTable,
  sql,
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

const COURIERS_PER_PAGE = 10;

export interface ListarCouriersFiltradoParams {
  slug: string;
  page?: number;
  search?: string;
  vehicleType?: string;
  availability?: string;
  status?: string;
  workDay?: string;
}

export interface ListarCouriersFiltradoResult {
  couriers: Courier[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export const listarCouriersGestaoFiltrado = async (
  params: ListarCouriersFiltradoParams,
): Promise<ListarCouriersFiltradoResult> => {
  const { slug, page = 1, search, vehicleType, availability, status, workDay } = params;

  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) {
    return { couriers: [], total: 0, totalPages: 0, currentPage: 1 };
  }

  const conditions = and(
    eq(couriersTable.restaurantId, restaurant.id),
    search
      ? or(
          ilike(couriersTable.name, `%${search}%`),
          ilike(couriersTable.phone, `%${search}%`),
        )
      : undefined,
    vehicleType && vehicleType !== "all"
      ? eq(couriersTable.vehicleType, vehicleType)
      : undefined,
    availability === "available"
      ? eq(couriersTable.isAvailable, true)
      : availability === "unavailable"
        ? eq(couriersTable.isAvailable, false)
        : undefined,
    status === "active"
      ? eq(couriersTable.isActive, true)
      : status === "inactive"
        ? eq(couriersTable.isActive, false)
        : undefined,
    workDay && workDay !== "all"
      ? sql`${couriersTable.workDays} @> ARRAY[${workDay}]::text[]`
      : undefined,
  );

  const [{ total }] = await db
    .select({ total: sql<number>`cast(count(*) as int)` })
    .from(couriersTable)
    .where(conditions);

  const totalCount = total ?? 0;
  const totalPages = Math.ceil(totalCount / COURIERS_PER_PAGE);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));

  const couriers = await db
    .select()
    .from(couriersTable)
    .where(conditions)
    .orderBy(asc(couriersTable.name))
    .limit(COURIERS_PER_PAGE)
    .offset((currentPage - 1) * COURIERS_PER_PAGE);

  return { couriers, total: totalCount, totalPages, currentPage };
};

const VEHICLES_PER_PAGE = 10;

export interface ListarVeiculosFiltradoParams {
  slug: string;
  page?: number;
  search?: string;
  status?: string;
}

export interface ListarVeiculosFiltradoResult {
  vehicles: CompanyVehicle[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export const listarVeiculosGestao = async (
  params: ListarVeiculosFiltradoParams,
): Promise<ListarVeiculosFiltradoResult> => {
  const { slug, page = 1, search, status } = params;

  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) {
    return { vehicles: [], total: 0, totalPages: 0, currentPage: 1 };
  }

  const conditions = and(
    eq(companyVehiclesTable.restaurantId, restaurant.id),
    search
      ? or(
          ilike(companyVehiclesTable.brand, `%${search}%`),
          ilike(companyVehiclesTable.model, `%${search}%`),
          ilike(companyVehiclesTable.licensePlate, `%${search}%`),
        )
      : undefined,
    status && status !== "all"
      ? eq(companyVehiclesTable.status, status as VehicleStatus)
      : undefined,
  );

  const [{ total }] = await db
    .select({ total: sql<number>`cast(count(*) as int)` })
    .from(companyVehiclesTable)
    .where(conditions);

  const totalCount = total ?? 0;
  const totalPages = Math.ceil(totalCount / VEHICLES_PER_PAGE);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));

  const vehicles = await db
    .select()
    .from(companyVehiclesTable)
    .where(conditions)
    .orderBy(asc(companyVehiclesTable.brand), asc(companyVehiclesTable.model))
    .limit(VEHICLES_PER_PAGE)
    .offset((currentPage - 1) * VEHICLES_PER_PAGE);

  return { vehicles, total: totalCount, totalPages, currentPage };
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

export const listarCuponsGestao = async (slug: string): Promise<Coupon[]> => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];

  return db
    .select()
    .from(couponsTable)
    .where(eq(couponsTable.restaurantId, restaurant.id))
    .orderBy(asc(couponsTable.code));
};

export type RegraLoyaltyComDetalhes = LoyaltyRule & {
  menuCategory: Pick<MenuCategory, "id" | "name"> | null;
  product: Pick<Product, "id" | "name"> | null;
};

export const listarRegrasLoyaltyGestao = async (
  slug: string,
): Promise<RegraLoyaltyComDetalhes[]> => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];

  const rows = await db
    .select({
      rule: loyaltyRulesTable,
      menuCategory: {
        id: menuCategoriesTable.id,
        name: menuCategoriesTable.name,
      },
      product: {
        id: productsTable.id,
        name: productsTable.name,
      },
    })
    .from(loyaltyRulesTable)
    .leftJoin(menuCategoriesTable, eq(menuCategoriesTable.id, loyaltyRulesTable.menuCategoryId))
    .leftJoin(productsTable, eq(productsTable.id, loyaltyRulesTable.productId))
    .where(eq(loyaltyRulesTable.restaurantId, restaurant.id))
    .orderBy(asc(loyaltyRulesTable.name));

  return rows.map((row) => ({
    ...row.rule,
    menuCategory: row.menuCategory?.id ? row.menuCategory : null,
    product: row.product?.id ? row.product : null,
  }));
};
