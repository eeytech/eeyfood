import type {
  BankAccount,
  BankStatement,
  BankStatementEntry,
  CompanyVehicle,
  Coupon,
  Courier,
  CustomerLedger,
  CustomerLedgerEntry,
  DiningTable,
  FinancialTransaction,
  FiscalSettings,
  InventoryBatch,
  InventoryLoss,
  LoyaltyRule,
  MenuCategory,
  Product,
  ProductOption,
  ProductOptionGroup,
  PurchaseInvoice,
  Restaurant,
  Supplier,
  VehicleStatus,
} from "@fsw/db";
import type { InventoryItem } from "@fsw/db";
import {
  aiSettingsTable,
  abandonedCartsTable,
  and,
  asc,
  bankAccountsTable,
  bankStatementsTable,
  bankStatementEntriesTable,
  buscarRestaurantePorSlug,
  buscarConfiguracoesFiscaisPorSlug,
  companyVehiclesTable,
  couponsTable,
  couriersTable,
  customersTable,
  customerLedgersTable,
  customerLedgerEntriesTable,
  db,
  desc,
  diningTablesTable,
  eq,
  financialCategoriesTable,
  financialTransactionsTable,
  gte,
  ilike,
  inventoryBatchesTable,
  inventoryItemsTable,
  inventoryLossesTable,
  isNotNull,
  listarCouriersPorSlug,
  listarGarconsPorSlug,
  listarReservasPorSlug,
  listarFilaEsperaPorSlug,
  listarComandasAvulsasPorSlug,
  listarMesasComandasPorSlug,
  listarPedidosRecebimentoPorSlug,
  loyaltyRulesTable,
  lt,
  lte,
  marketingSpendTable,
  menuCategoriesTable,
  ne,
  operatingHoursTable,
  or,
  orderProductOptionsTable,
  orderProductsTable,
  ordersTable,
  productOptionGroupsTable,
  productOptionsTable,
  productToOptionGroupsTable,
  productsTable,
  purchaseInvoicesTable,
  sql,
  suppliersTable,
  walletsTable,
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

export const listarGarconsGestao = async (slug: string) => {
  return listarGarconsPorSlug(slug);
};

export const listarReservasGestao = async (slug: string) => {
  return listarReservasPorSlug(slug);
};

export const listarFilaEsperaGestao = async (slug: string) => {
  return listarFilaEsperaPorSlug(slug);
};

export const listarComandasAvulsasGestao = async (slug: string) => {
  return listarComandasAvulsasPorSlug(slug);
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

export const listarContasBancariasGestao = async (slug: string): Promise<BankAccount[]> => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];
  return db
    .select()
    .from(bankAccountsTable)
    .where(eq(bankAccountsTable.restaurantId, restaurant.id))
    .orderBy(asc(bankAccountsTable.name));
};

export const buscarConfiguracoesFiscaisGestao = async (slug: string): Promise<FiscalSettings | null> => {
  return buscarConfiguracoesFiscaisPorSlug(slug);
};

export const listarFiadosGestao = async (slug: string): Promise<CustomerLedger[]> => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];
  return db
    .select()
    .from(customerLedgersTable)
    .where(eq(customerLedgersTable.restaurantId, restaurant.id))
    .orderBy(asc(customerLedgersTable.customerName));
};

export const buscarFiadoComLancamentos = async (
  ledgerId: string,
): Promise<(CustomerLedger & { entries: CustomerLedgerEntry[] }) | null> => {
  const [ledger] = await db
    .select()
    .from(customerLedgersTable)
    .where(eq(customerLedgersTable.id, ledgerId))
    .limit(1);

  if (!ledger) return null;

  const entries = await db
    .select()
    .from(customerLedgerEntriesTable)
    .where(eq(customerLedgerEntriesTable.ledgerId, ledgerId))
    .orderBy(desc(customerLedgerEntriesTable.createdAt));

  return { ...ledger, entries };
};

export const listarExtratosGestao = async (
  bankAccountId: string,
): Promise<(BankStatement & { entries: BankStatementEntry[] })[]> => {
  const statements = await db
    .select()
    .from(bankStatementsTable)
    .where(eq(bankStatementsTable.bankAccountId, bankAccountId))
    .orderBy(desc(bankStatementsTable.createdAt));

  if (statements.length === 0) return [];

  const statementIds = statements.map((s) => s.id);

  const allEntries = await db
    .select()
    .from(bankStatementEntriesTable)
    .where(
      statementIds.length === 1
        ? eq(bankStatementEntriesTable.statementId, statementIds[0]!)
        : sql`${bankStatementEntriesTable.statementId} = ANY(ARRAY[${sql.join(statementIds.map((id) => sql`${id}::uuid`), sql`, `)}])`,
    )
    .orderBy(asc(bankStatementEntriesTable.entryDate));

  const entriesMap = new Map<string, BankStatementEntry[]>();
  allEntries.forEach((e) => {
    const list = entriesMap.get(e.statementId) ?? [];
    list.push(e);
    entriesMap.set(e.statementId, list);
  });

  return statements.map((s) => ({ ...s, entries: entriesMap.get(s.id) ?? [] }));
};

export const listarTransacoesParaConciliacao = async (
  restaurantId: string,
  bankAccountId: string,
): Promise<FinancialTransaction[]> => {
  return db
    .select()
    .from(financialTransactionsTable)
    .where(
      and(
        eq(financialTransactionsTable.restaurantId, restaurantId),
        eq(financialTransactionsTable.bankAccountId, bankAccountId),
      ),
    )
    .orderBy(desc(financialTransactionsTable.dueDate));
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

export type GrupoAdicionalComOpcoes = ProductOptionGroup & { options: ProductOption[] };

export type ProdutoComOpcionais = Product & {
  optionGroups: GrupoAdicionalComOpcoes[];
};

export const buscarProdutoComOpcionaisGestao = async (
  productId: string,
  restaurantId: string,
): Promise<ProdutoComOpcionais | null> => {
  const [product] = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.id, productId), eq(productsTable.restaurantId, restaurantId)))
    .limit(1);

  if (!product) return null;

  const rows = await db
    .select({
      group: productOptionGroupsTable,
      option: productOptionsTable,
    })
    .from(productToOptionGroupsTable)
    .innerJoin(
      productOptionGroupsTable,
      eq(productOptionGroupsTable.id, productToOptionGroupsTable.productOptionGroupId),
    )
    .leftJoin(
      productOptionsTable,
      eq(productOptionsTable.productOptionGroupId, productOptionGroupsTable.id),
    )
    .where(eq(productToOptionGroupsTable.productId, productId))
    .orderBy(
      asc(productOptionGroupsTable.displayOrder),
      asc(productOptionGroupsTable.name),
      asc(productOptionsTable.displayOrder),
      asc(productOptionsTable.name),
    );

  const groupMap = new Map<string, GrupoAdicionalComOpcoes>();
  for (const row of rows) {
    const g = groupMap.get(row.group.id) ?? { ...row.group, options: [] };
    if (row.option?.id) g.options.push(row.option);
    groupMap.set(row.group.id, g);
  }

  return { ...product, optionGroups: Array.from(groupMap.values()) };
};

export const buscarGruposAdicionaisDoRestaurante = async (
  restaurantId: string,
): Promise<GrupoAdicionalComOpcoes[]> => {
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
    .where(eq(productOptionGroupsTable.restaurantId, restaurantId))
    .orderBy(
      asc(productOptionGroupsTable.displayOrder),
      asc(productOptionGroupsTable.name),
      asc(productOptionsTable.displayOrder),
      asc(productOptionsTable.name),
    );

  const groupMap = new Map<string, GrupoAdicionalComOpcoes>();
  for (const row of rows) {
    const g = groupMap.get(row.group.id) ?? { ...row.group, options: [] };
    if (row.option?.id) g.options.push(row.option);
    groupMap.set(row.group.id, g);
  }

  return Array.from(groupMap.values());
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

// ─── Inventário Geral ────────────────────────────────────────────────────────

export const listarInventarioGestao = async (slug: string): Promise<InventoryItem[]> => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];

  return db
    .select()
    .from(inventoryItemsTable)
    .where(eq(inventoryItemsTable.restaurantId, restaurant.id))
    .orderBy(asc(inventoryItemsTable.name));
};

// ─── Lotes de Estoque ─────────────────────────────────────────────────────────

export interface LoteComInsumo extends InventoryBatch {
  inventoryItemName: string;
  inventoryItemUnit: string;
}

export const listarLotesGestao = async (slug: string): Promise<LoteComInsumo[]> => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];

  const rows = await db
    .select({
      id: inventoryBatchesTable.id,
      restaurantId: inventoryBatchesTable.restaurantId,
      inventoryItemId: inventoryBatchesTable.inventoryItemId,
      purchaseInvoiceId: inventoryBatchesTable.purchaseInvoiceId,
      batchCode: inventoryBatchesTable.batchCode,
      quantity: inventoryBatchesTable.quantity,
      manufacturingDate: inventoryBatchesTable.manufacturingDate,
      expirationDate: inventoryBatchesTable.expirationDate,
      unitCost: inventoryBatchesTable.unitCost,
      createdAt: inventoryBatchesTable.createdAt,
      updatedAt: inventoryBatchesTable.updatedAt,
      inventoryItemName: inventoryItemsTable.name,
      inventoryItemUnit: inventoryItemsTable.unitOfMeasure,
    })
    .from(inventoryBatchesTable)
    .innerJoin(inventoryItemsTable, eq(inventoryItemsTable.id, inventoryBatchesTable.inventoryItemId))
    .where(eq(inventoryBatchesTable.restaurantId, restaurant.id))
    .orderBy(asc(inventoryBatchesTable.expirationDate));

  return rows;
};

// ─── Perdas de Estoque ────────────────────────────────────────────────────────

export interface PerdaComInsumo extends InventoryLoss {
  inventoryItemName: string;
  inventoryItemUnit: string;
}

export const listarPerdasGestao = async (slug: string): Promise<PerdaComInsumo[]> => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];

  const rows = await db
    .select({
      id: inventoryLossesTable.id,
      restaurantId: inventoryLossesTable.restaurantId,
      inventoryItemId: inventoryLossesTable.inventoryItemId,
      quantity: inventoryLossesTable.quantity,
      occurredAt: inventoryLossesTable.occurredAt,
      reason: inventoryLossesTable.reason,
      financialLoss: inventoryLossesTable.financialLoss,
      notes: inventoryLossesTable.notes,
      createdAt: inventoryLossesTable.createdAt,
      updatedAt: inventoryLossesTable.updatedAt,
      inventoryItemName: inventoryItemsTable.name,
      inventoryItemUnit: inventoryItemsTable.unitOfMeasure,
    })
    .from(inventoryLossesTable)
    .innerJoin(inventoryItemsTable, eq(inventoryItemsTable.id, inventoryLossesTable.inventoryItemId))
    .where(eq(inventoryLossesTable.restaurantId, restaurant.id))
    .orderBy(desc(inventoryLossesTable.occurredAt));

  return rows;
};

// ─── Fornecedores ─────────────────────────────────────────────────────────────

export const listarFornecedoresGestao = async (slug: string): Promise<Supplier[]> => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];

  return db
    .select()
    .from(suppliersTable)
    .where(eq(suppliersTable.restaurantId, restaurant.id))
    .orderBy(asc(suppliersTable.companyName));
};

// ─── Notas de Compra ──────────────────────────────────────────────────────────

export interface NotaCompraComFornecedor extends PurchaseInvoice {
  supplierName: string | null;
}

export const listarNotasCompraGestao = async (slug: string): Promise<NotaCompraComFornecedor[]> => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];

  const rows = await db
    .select({
      id: purchaseInvoicesTable.id,
      restaurantId: purchaseInvoicesTable.restaurantId,
      supplierId: purchaseInvoicesTable.supplierId,
      accessKey: purchaseInvoicesTable.accessKey,
      invoiceNumber: purchaseInvoicesTable.invoiceNumber,
      totalAmount: purchaseInvoicesTable.totalAmount,
      xmlContent: purchaseInvoicesTable.xmlContent,
      issuedAt: purchaseInvoicesTable.issuedAt,
      items: purchaseInvoicesTable.items,
      createdAt: purchaseInvoicesTable.createdAt,
      updatedAt: purchaseInvoicesTable.updatedAt,
      supplierName: suppliersTable.companyName,
    })
    .from(purchaseInvoicesTable)
    .leftJoin(suppliersTable, eq(suppliersTable.id, purchaseInvoicesTable.supplierId))
    .where(eq(purchaseInvoicesTable.restaurantId, restaurant.id))
    .orderBy(desc(purchaseInvoicesTable.createdAt));

  return rows;
};

// ─── Dashboard de Relatórios ──────────────────────────────────────────────────

export interface DashboardSummary {
  totalOrders: number;
  grossRevenue: number;
  estimatedCost: number;
  estimatedProfit: number;
  avgTicket: number;
  profitMargin: number;
}

export interface DailyRevenue {
  date: string;
  totalOrders: number;
  grossRevenue: number;
  estimatedProfit: number;
}

export interface RevenueByConsumption {
  consumptionMethod: string;
  total: number;
  count: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  totalQuantity: number;
  grossRevenue: number;
}

export interface TopModifier {
  optionName: string;
  totalCount: number;
  estimatedRevenue: number;
}

export interface CourierMetric {
  courierId: string;
  courierName: string;
  deliveryCount: number;
  totalFees: number;
}

export interface CouponUsage {
  couponCode: string;
  usageCount: number;
  totalDiscount: number;
}

export interface CashbackMetrics {
  totalEarned: number;
  totalRedeemed: number;
  currentBalance: number;
}

export interface PaymentMethodBreakdown {
  paymentMethod: string;
  total: number;
  count: number;
}

export interface FinancialBreakdown {
  categoryName: string | null;
  type: string;
  total: number;
  count: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  dailyRevenue: DailyRevenue[];
  revenueByConsumption: RevenueByConsumption[];
  topProducts: TopProduct[];
  bottomProducts: TopProduct[];
  topModifiers: TopModifier[];
  courierMetrics: CourierMetric[];
  couponUsage: CouponUsage[];
  cashbackMetrics: CashbackMetrics;
  paymentMethods: PaymentMethodBreakdown[];
  financialBreakdown: FinancialBreakdown[];
}

export const buscarDadosDashboard = async (
  slug: string,
  startDate: Date,
  endDate: Date,
): Promise<DashboardData | null> => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return null;

  const restaurantId = restaurant.id;

  const eligibleOrderWhere = and(
    eq(ordersTable.restaurantId, restaurantId),
    ne(ordersTable.status, "CANCELLED"),
    eq(ordersTable.paymentStatus, "PAID"),
    gte(ordersTable.createdAt, startDate),
    lt(ordersTable.createdAt, endDate),
  );

  const [
    summaryRows,
    dailyRows,
    consumptionRows,
    topProductRows,
    bottomProductRows,
    modifierRows,
    courierRows,
    couponRows,
    cashbackRows,
    walletRows,
    paymentRows,
    financialRows,
  ] = await Promise.all([
    // 1. Totais consolidados
    db
      .select({
        totalOrders: sql<number>`cast(count(*) as int)`,
        grossRevenue: sql<number>`coalesce(sum(${ordersTable.total}), 0)`,
        estimatedCost: sql<number>`coalesce(sum(${ordersTable.estimatedCost}), 0)`,
        estimatedProfit: sql<number>`coalesce(sum(${ordersTable.estimatedProfit}), 0)`,
      })
      .from(ordersTable)
      .where(eligibleOrderWhere),

    // 2. Faturamento diário
    db
      .select({
        date: sql<string>`to_char(${ordersTable.createdAt}, 'YYYY-MM-DD')`,
        totalOrders: sql<number>`cast(count(*) as int)`,
        grossRevenue: sql<number>`coalesce(sum(${ordersTable.total}), 0)`,
        estimatedProfit: sql<number>`coalesce(sum(${ordersTable.estimatedProfit}), 0)`,
      })
      .from(ordersTable)
      .where(eligibleOrderWhere)
      .groupBy(sql`to_char(${ordersTable.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${ordersTable.createdAt}, 'YYYY-MM-DD')`),

    // 3. Faturamento por método de consumo
    db
      .select({
        consumptionMethod: ordersTable.consumptionMethod,
        total: sql<number>`coalesce(sum(${ordersTable.total}), 0)`,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(ordersTable)
      .where(eligibleOrderWhere)
      .groupBy(ordersTable.consumptionMethod),

    // 4. Top 10 produtos mais vendidos
    db
      .select({
        productId: orderProductsTable.productId,
        productName: orderProductsTable.productNameSnapshot,
        totalQuantity: sql<number>`cast(coalesce(sum(${orderProductsTable.quantity}), 0) as int)`,
        grossRevenue: sql<number>`coalesce(sum(${orderProductsTable.lineTotal}), 0)`,
      })
      .from(orderProductsTable)
      .innerJoin(ordersTable, eq(ordersTable.id, orderProductsTable.orderId))
      .where(eligibleOrderWhere)
      .groupBy(orderProductsTable.productId, orderProductsTable.productNameSnapshot)
      .orderBy(sql`sum(${orderProductsTable.quantity}) desc`)
      .limit(10),

    // 5. Bottom 10 produtos menos vendidos (inclui produtos com zero saídas)
    db
      .select({
        productId: productsTable.id,
        productName: productsTable.name,
        totalQuantity: sql<number>`cast(coalesce(sum(${orderProductsTable.quantity}), 0) as int)`,
        grossRevenue: sql<number>`coalesce(sum(${orderProductsTable.lineTotal}), 0)`,
      })
      .from(productsTable)
      .leftJoin(orderProductsTable, eq(orderProductsTable.productId, productsTable.id))
      .leftJoin(
        ordersTable,
        and(
          eq(ordersTable.id, orderProductsTable.orderId),
          eq(ordersTable.restaurantId, restaurantId),
          ne(ordersTable.status, "CANCELLED"),
          eq(ordersTable.paymentStatus, "PAID"),
          gte(ordersTable.createdAt, startDate),
          lt(ordersTable.createdAt, endDate),
        ),
      )
      .where(eq(productsTable.restaurantId, restaurantId))
      .groupBy(productsTable.id, productsTable.name)
      .orderBy(sql`coalesce(sum(${orderProductsTable.quantity}), 0) asc`)
      .limit(10),

    // 6. Top 10 opcionais/adicionais
    db
      .select({
        optionName: orderProductOptionsTable.nameSnapshot,
        totalCount: sql<number>`cast(count(*) as int)`,
        estimatedRevenue: sql<number>`coalesce(sum(${orderProductOptionsTable.priceSnapshot} * ${orderProductsTable.quantity}), 0)`,
      })
      .from(orderProductOptionsTable)
      .innerJoin(
        orderProductsTable,
        eq(orderProductsTable.id, orderProductOptionsTable.orderProductId),
      )
      .innerJoin(ordersTable, eq(ordersTable.id, orderProductsTable.orderId))
      .where(eligibleOrderWhere)
      .groupBy(orderProductOptionsTable.nameSnapshot)
      .orderBy(sql`count(*) desc`)
      .limit(10),

    // 7. Métricas por entregador
    db
      .select({
        courierId: couriersTable.id,
        courierName: couriersTable.name,
        deliveryCount: sql<number>`cast(count(${ordersTable.id}) as int)`,
        totalFees: sql<number>`coalesce(sum(${ordersTable.deliveryFee}), 0)`,
      })
      .from(couriersTable)
      .leftJoin(
        ordersTable,
        and(
          eq(ordersTable.courierId, couriersTable.id),
          ne(ordersTable.status, "CANCELLED"),
          eq(ordersTable.paymentStatus, "PAID"),
          gte(ordersTable.createdAt, startDate),
          lt(ordersTable.createdAt, endDate),
        ),
      )
      .where(eq(couriersTable.restaurantId, restaurantId))
      .groupBy(couriersTable.id, couriersTable.name)
      .orderBy(sql`count(${ordersTable.id}) desc`),

    // 8. Uso de cupons
    db
      .select({
        couponCode: ordersTable.couponCode,
        usageCount: sql<number>`cast(count(*) as int)`,
        totalDiscount: sql<number>`coalesce(sum(${ordersTable.couponDiscountAmount}), 0)`,
      })
      .from(ordersTable)
      .where(and(eligibleOrderWhere, isNotNull(ordersTable.couponCode)))
      .groupBy(ordersTable.couponCode)
      .orderBy(sql`count(*) desc`),

    // 9. Cashback gerado/resgatado no período
    db
      .select({
        totalEarned: sql<number>`coalesce(sum(${ordersTable.cashbackEarnedAmount}), 0)`,
        totalRedeemed: sql<number>`coalesce(sum(${ordersTable.cashbackRedeemedAmount}), 0)`,
      })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.restaurantId, restaurantId),
          ne(ordersTable.status, "CANCELLED"),
          gte(ordersTable.createdAt, startDate),
          lt(ordersTable.createdAt, endDate),
        ),
      ),

    // 10. Saldo atual de cashback em circulação
    db
      .select({
        currentBalance: sql<number>`coalesce(sum(${walletsTable.balance}), 0)`,
      })
      .from(walletsTable)
      .where(eq(walletsTable.restaurantId, restaurantId)),

    // 11. Faturamento por método de pagamento
    db
      .select({
        paymentMethod: ordersTable.paymentMethod,
        total: sql<number>`coalesce(sum(${ordersTable.total}), 0)`,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(ordersTable)
      .where(eligibleOrderWhere)
      .groupBy(ordersTable.paymentMethod),

    // 12. Transações financeiras agrupadas por categoria
    db
      .select({
        categoryName: financialCategoriesTable.name,
        type: financialTransactionsTable.type,
        total: sql<number>`coalesce(sum(${financialTransactionsTable.amount}), 0)`,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(financialTransactionsTable)
      .leftJoin(
        financialCategoriesTable,
        eq(financialCategoriesTable.id, financialTransactionsTable.categoryId),
      )
      .where(
        and(
          eq(financialTransactionsTable.restaurantId, restaurantId),
          eq(financialTransactionsTable.status, "PAID"),
          isNotNull(financialTransactionsTable.paidAt),
          gte(financialTransactionsTable.paidAt, startDate),
          lt(financialTransactionsTable.paidAt, endDate),
        ),
      )
      .groupBy(financialCategoriesTable.name, financialTransactionsTable.type)
      .orderBy(sql`sum(${financialTransactionsTable.amount}) desc`),
  ]);

  const summary = summaryRows[0] ?? {
    totalOrders: 0,
    grossRevenue: 0,
    estimatedCost: 0,
    estimatedProfit: 0,
  };

  const cashback = cashbackRows[0] ?? { totalEarned: 0, totalRedeemed: 0 };
  const wallet = walletRows[0] ?? { currentBalance: 0 };

  return {
    summary: {
      totalOrders: summary.totalOrders ?? 0,
      grossRevenue: summary.grossRevenue ?? 0,
      estimatedCost: summary.estimatedCost ?? 0,
      estimatedProfit: summary.estimatedProfit ?? 0,
      avgTicket:
        (summary.totalOrders ?? 0) > 0
          ? (summary.grossRevenue ?? 0) / (summary.totalOrders ?? 1)
          : 0,
      profitMargin:
        (summary.grossRevenue ?? 0) > 0
          ? ((summary.estimatedProfit ?? 0) / (summary.grossRevenue ?? 1)) * 100
          : 0,
    },
    dailyRevenue: dailyRows.map((r) => ({
      date: r.date,
      totalOrders: r.totalOrders ?? 0,
      grossRevenue: r.grossRevenue ?? 0,
      estimatedProfit: r.estimatedProfit ?? 0,
    })),
    revenueByConsumption: consumptionRows.map((r) => ({
      consumptionMethod: r.consumptionMethod,
      total: r.total ?? 0,
      count: r.count ?? 0,
    })),
    topProducts: topProductRows.map((r) => ({
      productId: r.productId,
      productName: r.productName,
      totalQuantity: r.totalQuantity ?? 0,
      grossRevenue: r.grossRevenue ?? 0,
    })),
    bottomProducts: bottomProductRows.map((r) => ({
      productId: r.productId,
      productName: r.productName,
      totalQuantity: r.totalQuantity ?? 0,
      grossRevenue: r.grossRevenue ?? 0,
    })),
    topModifiers: modifierRows.map((r) => ({
      optionName: r.optionName,
      totalCount: r.totalCount ?? 0,
      estimatedRevenue: r.estimatedRevenue ?? 0,
    })),
    courierMetrics: courierRows.map((r) => ({
      courierId: r.courierId,
      courierName: r.courierName,
      deliveryCount: r.deliveryCount ?? 0,
      totalFees: r.totalFees ?? 0,
    })),
    couponUsage: couponRows.map((r) => ({
      couponCode: r.couponCode ?? "",
      usageCount: r.usageCount ?? 0,
      totalDiscount: r.totalDiscount ?? 0,
    })),
    cashbackMetrics: {
      totalEarned: cashback.totalEarned ?? 0,
      totalRedeemed: cashback.totalRedeemed ?? 0,
      currentBalance: wallet.currentBalance ?? 0,
    },
    paymentMethods: paymentRows.map((r) => ({
      paymentMethod: r.paymentMethod ?? "Não informado",
      total: r.total ?? 0,
      count: r.count ?? 0,
    })),
    financialBreakdown: financialRows.map((r) => ({
      categoryName: r.categoryName ?? null,
      type: r.type,
      total: r.total ?? 0,
      count: r.count ?? 0,
    })),
  };
};

// ─── Advanced BI KPIs ────────────────────────────────────────────────────────

export interface AdvancedKPIs {
  ltv: number;
  churnRate: number;
  cac: number;
  roi: number;
  conversionFunnel: {
    sessions: number;
    carts: number;
    checkouts: number;
    orders: number;
  };
  marketingSpend: number;
  newCustomers: number;
}

export const buscarKPIsAvancados = async (
  slug: string,
  startDate: Date,
  endDate: Date,
): Promise<AdvancedKPIs | null> => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return null;

  const restaurantId = restaurant.id;

  const [
    ltvRow,
    segmentRows,
    newCustomersRow,
    marketingSpendRow,
    couponDiscountRow,
    funnelCartsRow,
    funnelOrdersRow,
  ] = await Promise.all([
    // LTV médio da base (todos os clientes com pedidos)
    db
      .select({
        avgLtv: sql<number>`coalesce(avg(${customersTable.totalSpent}), 0)`,
      })
      .from(customersTable)
      .where(
        and(
          eq(customersTable.restaurantId, restaurantId),
          sql`${customersTable.totalSpent} > 0`,
        ),
      ),

    // Churn: total de clientes vs inativos/em risco
    db
      .select({
        segment: customersTable.segment,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(customersTable)
      .where(eq(customersTable.restaurantId, restaurantId))
      .groupBy(customersTable.segment),

    // Novos clientes no período (firstOrderAt dentro do intervalo)
    db
      .select({
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(customersTable)
      .where(
        and(
          eq(customersTable.restaurantId, restaurantId),
          gte(customersTable.firstOrderAt, startDate),
          lt(customersTable.firstOrderAt, endDate),
        ),
      ),

    // Gasto total de marketing no período
    db
      .select({
        total: sql<number>`coalesce(sum(${marketingSpendTable.amountSpent}), 0)`,
      })
      .from(marketingSpendTable)
      .where(
        and(
          eq(marketingSpendTable.restaurantId, restaurantId),
          gte(
            sql`${marketingSpendTable.referenceMonth}::timestamp`,
            startDate,
          ),
          lte(
            sql`${marketingSpendTable.referenceMonth}::timestamp`,
            endDate,
          ),
        ),
      ),

    // ROI: total de desconto em cupons vs faturamento gerado por cupons
    db
      .select({
        totalDiscount: sql<number>`coalesce(sum(${ordersTable.couponDiscountAmount}), 0)`,
        revenueWithCoupon: sql<number>`coalesce(sum(case when ${ordersTable.couponCode} is not null then ${ordersTable.total} else 0 end), 0)`,
      })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.restaurantId, restaurantId),
          ne(ordersTable.status, "CANCELLED"),
          eq(ordersTable.paymentStatus, "PAID"),
          gte(ordersTable.createdAt, startDate),
          lt(ordersTable.createdAt, endDate),
        ),
      ),

    // Funil: carrinhos criados vs checkouts no período
    db
      .select({
        totalCarts: sql<number>`cast(count(*) as int)`,
        convertedCarts: sql<number>`cast(count(case when ${abandonedCartsTable.status} = 'CONVERTED' then 1 end) as int)`,
      })
      .from(abandonedCartsTable)
      .where(
        and(
          eq(abandonedCartsTable.restaurantId, restaurantId),
          gte(abandonedCartsTable.createdAt, startDate),
          lt(abandonedCartsTable.createdAt, endDate),
        ),
      ),

    // Funil: pedidos finalizados no período
    db
      .select({
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.restaurantId, restaurantId),
          ne(ordersTable.status, "CANCELLED"),
          eq(ordersTable.paymentStatus, "PAID"),
          gte(ordersTable.createdAt, startDate),
          lt(ordersTable.createdAt, endDate),
        ),
      ),
  ]);

  const totalCustomers = segmentRows.reduce((sum, r) => sum + (r.count ?? 0), 0);
  const churnCount = segmentRows
    .filter((r) => r.segment === "INACTIVE" || r.segment === "AT_RISK")
    .reduce((sum, r) => sum + (r.count ?? 0), 0);
  const churnRate = totalCustomers > 0 ? (churnCount / totalCustomers) * 100 : 0;

  const ltv = ltvRow[0]?.avgLtv ?? 0;
  const newCustomers = newCustomersRow[0]?.count ?? 0;
  const totalMarketingSpend = marketingSpendRow[0]?.total ?? 0;
  const cac = newCustomers > 0 ? totalMarketingSpend / newCustomers : 0;

  const totalDiscount = couponDiscountRow[0]?.totalDiscount ?? 0;
  const revenueWithCoupon = couponDiscountRow[0]?.revenueWithCoupon ?? 0;
  const roi = totalDiscount > 0 ? ((revenueWithCoupon - totalDiscount) / totalDiscount) * 100 : 0;

  const totalCarts = funnelCartsRow[0]?.totalCarts ?? 0;
  const convertedCarts = funnelCartsRow[0]?.convertedCarts ?? 0;
  const totalOrders = funnelOrdersRow[0]?.count ?? 0;

  return {
    ltv,
    churnRate,
    cac,
    roi,
    marketingSpend: totalMarketingSpend,
    newCustomers,
    conversionFunnel: {
      sessions: totalCarts,
      carts: totalCarts,
      checkouts: convertedCarts,
      orders: totalOrders,
    },
  };
};
