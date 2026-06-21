import { and, asc, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";

import { db } from "./client.js";
import { isRestaurantOpen } from "./restaurant-utils.js";
import {
  abandonedCartsTable,
  aiSettingsTable,
  bankAccountsTable,
  bankStatementsTable,
  bankStatementEntriesTable,
  couponsTable,
  couriersTable,
  courierTripsTable,
  customerLedgersTable,
  customerLedgerEntriesTable,
  deliveryFeeRulesTable,
  fiscalSettingsTable,
  marketingSpendTable,
  marketplaceIntegrationsTable,
  diningTablesTable,
  financialCategoriesTable,
  financialTransactionsTable,
  inventoryItemsTable,
  menuCategoriesTable,
  operatingHoursTable,
  orderProductsTable,
  orderRatingsTable,
  ordersTable,
  productsTable,
  productionSectorsTable,
  recipeItemsTable,
  restaurantsTable,
  stockMovementsTable,
  walletsTable,
  loyaltyRulesTable,
  productOptionsTable,
  productOptionGroupsTable,
  productToOptionGroupsTable,
  orderProductOptionsTable,
  waitersTable,
  tableReservationsTable,
  waitingQueueTable,
  comandasAvulsasTable,
} from "./schema.js";
import type {
  AbandonedCart,
  CourierTrip,
  DeliveryFeeRule,
  MarketplaceIntegration,
  MarketplaceType,
  Waiter,
  TableReservation,
  WaitingQueueEntry,
  ComandaAvulsaComPedido,
  ConsumptionMethod,
  Coupon,
  Courier,
  DiningTable,
  FinancialCategory,
  FinancialTransaction,
  MesaComanda,
  Order,
  OrderComItens,
  OrderProduct,
  OrderProductItemStatus,
  OrderProductOption,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PedidoBeneficiosValidado,
  PedidoRecebimento,
  Product,
  ProductComRestaurante,
  ProductionSector,
  ProductOption,
  ProductOptionGroup,
  Restaurant,
  RestaurantComCategoriasEProdutos,
  TransactionStatus,
  TransactionType,
  Wallet,
} from "./types.js";

// ... (rest of queries)

export const listarCategoriasFinanceirasPorSlug = async (
  slug: string,
): Promise<FinancialCategory[]> => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];

  return db
    .select()
    .from(financialCategoriesTable)
    .where(eq(financialCategoriesTable.restaurantId, restaurant.id))
    .orderBy(asc(financialCategoriesTable.name));
};

export const criarTransacaoFinanceira = async (
  input: Omit<FinancialTransaction, "id" | "createdAt" | "updatedAt"> & { bankAccountId?: string | null },
): Promise<FinancialTransaction> => {
  const [transaction] = await db
    .insert(financialTransactionsTable)
    .values(input)
    .returning();

  if (!transaction) {
    throw new Error("Falha ao criar transação financeira.");
  }

  return transaction;
};

export const atualizarStatusTransacao = async (
  transactionId: string,
  status: TransactionStatus,
  paidAt?: Date | null,
): Promise<FinancialTransaction | null> => {
  const [updated] = await db
    .update(financialTransactionsTable)
    .set({
      status,
      paidAt: status === "PAID" ? paidAt ?? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(financialTransactionsTable.id, transactionId))
    .returning();

  return updated ?? null;
};

export const buscarDREBasico = async (
  slug: string,
  startDate: Date,
  endDate: Date,
) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return null;

  const transactions = await db
    .select()
    .from(financialTransactionsTable)
    .where(
      and(
        eq(financialTransactionsTable.restaurantId, restaurant.id),
        gte(financialTransactionsTable.dueDate, startDate),
        // Adicionar filtro de data fim se necessário
      ),
    );

  // Lógica de agrupamento para DRE
  const revenue = transactions
    .filter((t) => t.type === "REVENUE" && t.status === "PAID")
    .reduce((acc, t) => acc + t.amount, 0);

  const expenses = transactions
    .filter((t) => t.type === "EXPENSE" && t.status === "PAID")
    .reduce((acc, t) => acc + t.amount, 0);

  return {
    revenue,
    expenses,
    netProfit: revenue - expenses,
  };
};


export interface CriarPedidoInput {
  customerName: string;
  customerPhone: string;
  slug: string;
  consumptionMethod: ConsumptionMethod;
  paymentMethod: PaymentMethod;
  changeFor?: number;
  notes?: string;
  scheduledFor?: Date;
  abandonedCartSessionId?: string;
  couponCode?: string;
  useWalletBalance?: boolean;
  deliveryAddress?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  marketplaceOrderId?: string;
  marketplaceType?: MarketplaceType;
  products: Array<{
    id: string;
    quantity: number;
    selectedOptions?: string[]; // IDs de ProductOption
    notes?: string;
  }>;
  diningTableId?: string;
}

export interface ValidarBeneficiosPedidoInput {
  customerPhone: string;
  slug: string;
  consumptionMethod?: ConsumptionMethod;
  couponCode?: string;
  useWalletBalance?: boolean;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  products: Array<{
    id: string;
    quantity: number;
    selectedOptions?: string[];
    notes?: string;
  }>;
}

export interface SalvarCarrinhoAbandonadoInput {
  sessionId: string;
  slug: string;
  customerName?: string;
  customerPhone?: string;
  consumptionMethod: ConsumptionMethod;
  paymentMethod?: PaymentMethod;
  couponCode?: string;
  useWalletBalance?: boolean;
  scheduledFor?: Date;
  products: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
}

export interface AbrirComandaMesaInput {
  slug: string;
  diningTableId: string;
  customerName?: string;
}

export interface AdicionarItensComandaInput {
  orderId: number;
  products: Array<{
    id: string;
    quantity: number;
  }>;
}

export interface FecharComandaInput {
  orderId: number;
  paymentMethod: Extract<PaymentMethod, "DINHEIRO" | "CARTAO_PRESENCIAL">;
}

interface AtualizacaoPedidoBase {
  id: number;
  restaurantSlug: string;
}

export interface AtualizarStatusPedidoInput {
  orderId: number;
  status: OrderStatus;
}

export interface AtualizarStatusPagamentoPedidoInput {
  orderId: number;
  paymentStatus: PaymentStatus;
}

export interface DespacharPedidoInput {
  orderId: number;
  courierId: string;
}

interface ItemPedidoCalculado {
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  price: number;
  unitCost: number;
  lineTotal: number;
  notes?: string;
  currentProduct: Product;
  selectedOptions?: Array<{
    id: string;
    name: string;
    price: number;
  }>;
}

interface CupomAplicado {
  coupon: Pick<
    Coupon,
    "id" | "code" | "description" | "discountType" | "discountValue"
  >;
  discountAmount: number;
}

interface ContextoPedidoCalculado {
  restaurant: Restaurant;
  itens: ItemPedidoCalculado[];
  subtotal: number;
  estimatedCost: number;
  coupon: CupomAplicado | null;
  wallet: Wallet | null;
  couponDiscountAmount: number;
  cashbackRedeemedAmount: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  cashbackEarnedAmount: number;
  nextLoyaltyRule: {
    minOrderValue: number;
    cashbackPercent: number;
    remainingAmount: number;
  } | null;
}

const arredondarMoeda = (value: number) => {
  return Number(value.toFixed(2));
};

const calcularDistanciaKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const normalizarCodigoCupom = (couponCode?: string) => {
  const normalizedCouponCode = couponCode?.trim().toUpperCase();
  return normalizedCouponCode ? normalizedCouponCode : undefined;
};

const normalizarProdutosPedido = (
  products: ValidarBeneficiosPedidoInput["products"],
) => {
  return Array.from(
    products.reduce((map, product) => {
      const currentQuantity = map.get(product.id) ?? 0;
      map.set(product.id, currentQuantity + product.quantity);
      return map;
    }, new Map<string, number>()),
  ).map(([id, quantity]) => ({
    id,
    quantity,
  }));
};

const agruparItensPorPedido = (
  pedidos: Array<Omit<OrderComItens, "orderProducts">>,
  itens: Array<{
    orderId: number;
    item: OrderComItens["orderProducts"][number];
  }>,
): OrderComItens[] => {
  const itensPorPedido = new Map<number, OrderComItens["orderProducts"]>();

  for (const { orderId, item } of itens) {
    const listaAtual = itensPorPedido.get(orderId) ?? [];
    listaAtual.push(item);
    itensPorPedido.set(orderId, listaAtual);
  }

  return pedidos.map((pedido) => ({
    ...pedido,
    orderProducts: itensPorPedido.get(pedido.id) ?? [],
  }));
};

const resolverSlugRestaurante = async (
  restaurantId: string,
): Promise<string | null> => {
  const [restaurant] = await db
    .select({
      slug: restaurantsTable.slug,
    })
    .from(restaurantsTable)
    .where(eq(restaurantsTable.id, restaurantId))
    .limit(1);

  return restaurant?.slug ?? null;
};

const getOrderStatusTimestamps = (status: OrderStatus) => {
  const now = new Date();

  if (status === "FINISHED") {
    return {
      finishedAt: now,
      closedAt: now,
      cancelledAt: null,
    };
  }

  if (status === "CANCELLED") {
    return {
      finishedAt: null,
      closedAt: now,
      cancelledAt: now,
    };
  }

  return {};
};

const normalizarTelefoneLead = (phone?: string) => {
  const normalizedPhone = phone?.replace(/\D/g, "") ?? "";
  return normalizedPhone.length > 0 ? normalizedPhone : null;
};

const isTelefoneElegivelParaCarteira = (phone: string) => {
  if (!/^\d{11}$/.test(phone)) {
    return false;
  }

  if (/^(\d)\1+$/.test(phone)) {
    return false;
  }

  return phone.charAt(2) === "9";
};

const normalizarNomeLead = (name?: string) => {
  const normalizedName = name?.trim() ?? "";
  return normalizedName.length > 0 ? normalizedName : null;
};

const validarAgendamentoPedido = ({
  consumptionMethod,
  scheduledFor,
}: Pick<CriarPedidoInput, "consumptionMethod" | "scheduledFor">) => {
  if (!scheduledFor) {
    return null;
  }

  if (consumptionMethod === "DINE_IN") {
    throw new Error("Pedidos no salão não podem ser agendados.");
  }

  const now = new Date();
  const minimumLeadTimeInMs = 15 * 60 * 1000;
  const maximumWindowInMs = 30 * 24 * 60 * 60 * 1000;
  const scheduledTime = scheduledFor.getTime();

  if (Number.isNaN(scheduledTime)) {
    throw new Error("Data e hora de agendamento inválidas.");
  }

  if (scheduledTime < now.getTime() + minimumLeadTimeInMs) {
    throw new Error(
      "O agendamento precisa ter pelo menos 15 minutos de antecedência.",
    );
  }

  if (scheduledTime > now.getTime() + maximumWindowInMs) {
    throw new Error("O agendamento pode ser feito em até 30 dias.");
  }

  return scheduledFor;
};

const pedidoEstaAtivo = (status: OrderStatus) => {
  return status !== "FINISHED" && status !== "CANCELLED";
};

export const buscarRestaurantePorSlug = async (
  slug: string,
): Promise<Restaurant | null> => {
  const [restaurant] = await db
    .select()
    .from(restaurantsTable)
    .where(eq(restaurantsTable.slug, slug))
    .limit(1);

  return restaurant ?? null;
};

const marcarCarrinhoAbandonadoComoConvertido = async ({
  orderId,
  restaurantId,
  sessionId,
}: {
  orderId: number;
  restaurantId: string;
  sessionId?: string;
}) => {
  if (!sessionId) {
    return;
  }

  await db
    .update(abandonedCartsTable)
    .set({
      status: "CONVERTED",
      convertedOrderId: orderId,
      convertedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(abandonedCartsTable.restaurantId, restaurantId),
        eq(abandonedCartsTable.sessionId, sessionId),
      ),
    );
};

export const salvarCarrinhoAbandonado = async (
  input: SalvarCarrinhoAbandonadoInput,
): Promise<AbandonedCart | null> => {
  const restaurant = await buscarRestaurantePorSlug(input.slug);

  if (!restaurant) {
    throw new Error("Restaurante nao encontrado.");
  }

  if (input.products.length === 0) {
    return null;
  }

  const scheduledFor = input.scheduledFor
    ? validarAgendamentoPedido({
        consumptionMethod: input.consumptionMethod,
        scheduledFor: input.scheduledFor,
      })
    : null;

  const customerName = normalizarNomeLead(input.customerName);
  const customerPhone = normalizarTelefoneLead(input.customerPhone);

  if (!customerName && !customerPhone) {
    return null;
  }

  const cartSnapshot = input.products.map((product) => ({
    productId: product.id,
    name: product.name,
    quantity: product.quantity,
    unitPrice: product.price,
    lineTotal: arredondarMoeda(product.price * product.quantity),
  }));

  const subtotal = arredondarMoeda(
    cartSnapshot.reduce((accumulator, item) => {
      return accumulator + item.lineTotal;
    }, 0),
  );
  const itemCount = cartSnapshot.reduce((accumulator, item) => {
    return accumulator + item.quantity;
  }, 0);

  const values = {
    sessionId: input.sessionId,
    status: "ACTIVE" as const,
    restaurantId: restaurant.id,
    customerName,
    customerPhone,
    consumptionMethod: input.consumptionMethod,
    paymentMethod: input.paymentMethod,
    couponCode: normalizarCodigoCupom(input.couponCode),
    useWalletBalance: input.useWalletBalance ?? false,
    scheduledFor,
    subtotal,
    total: subtotal,
    itemCount,
    cartSnapshot,
    convertedOrderId: null,
    convertedAt: null,
    updatedAt: new Date(),
  };

  const [abandonedCart] = await db
    .insert(abandonedCartsTable)
    .values(values)
    .onConflictDoUpdate({
      target: [
        abandonedCartsTable.restaurantId,
        abandonedCartsTable.sessionId,
      ],
      set: values,
    })
    .returning();

  return abandonedCart ?? null;
};

const resolverCupomAplicado = async ({
  couponCode,
  restaurantId,
  customerPhone,
  subtotal,
}: {
  couponCode?: string;
  restaurantId: string;
  customerPhone: string;
  subtotal: number;
}): Promise<CupomAplicado | null> => {
  const normalizedCouponCode = normalizarCodigoCupom(couponCode);

  if (!normalizedCouponCode) {
    return null;
  }

  const [coupon] = await db
    .select()
    .from(couponsTable)
    .where(
      and(
        eq(couponsTable.restaurantId, restaurantId),
        eq(couponsTable.code, normalizedCouponCode),
      ),
    )
    .limit(1);

  if (!coupon) {
    throw new Error("Cupom invalido ou indisponivel para este restaurante.");
  }

  if (!coupon.isActive) {
    throw new Error("Este cupom esta inativo no momento.");
  }

  const now = new Date();

  if (coupon.startsAt && coupon.startsAt > now) {
    throw new Error("Este cupom ainda nao esta disponivel para uso.");
  }

  if (coupon.endsAt && coupon.endsAt < now) {
    throw new Error("Este cupom expirou.");
  }

  if (subtotal < coupon.minimumOrderValue) {
    throw new Error(
      `Este cupom exige pedido minimo de R$ ${coupon.minimumOrderValue
        .toFixed(2)
        .replace(".", ",")}.`,
    );
  }

  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    throw new Error("Este cupom ja atingiu o limite total de uso.");
  }

  const [usageByCustomer] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.restaurantId, restaurantId),
        eq(ordersTable.customerPhone, customerPhone),
        eq(ordersTable.couponId, coupon.id),
      ),
    );

  const customerUsageCount = Number(usageByCustomer?.count ?? 0);

  if (customerUsageCount >= coupon.perCustomerLimit) {
    throw new Error(
      "Este cupom ja foi utilizado o maximo permitido para este celular.",
    );
  }

  const grossDiscount =
    coupon.discountType === "PERCENTAGE"
      ? subtotal * (coupon.discountValue / 100)
      : coupon.discountValue;

  const discountWithCap =
    coupon.maxDiscountAmount !== null
      ? Math.min(grossDiscount, coupon.maxDiscountAmount)
      : grossDiscount;

  return {
    coupon: {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    },
    discountAmount: arredondarMoeda(Math.min(discountWithCap, subtotal)),
  };
};

const carregarContextoPedidoCalculado = async (
  input: ValidarBeneficiosPedidoInput,
): Promise<ContextoPedidoCalculado> => {
  const restaurant = await buscarRestaurantePorSlug(input.slug);

  if (!restaurant) {
    throw new Error("Restaurante nao encontrado.");
  }

  const operatingHours = await db
    .select()
    .from(operatingHoursTable)
    .where(eq(operatingHoursTable.restaurantId, restaurant.id));

  const isOpen = isRestaurantOpen(restaurant.status, operatingHours);
  const isScheduled = (input as any).scheduledFor !== undefined;

  if (!isOpen && !isScheduled) {
    throw new Error(
      "O restaurante está fechado no momento e não aceita novos pedidos.",
    );
  }

  // Usamos os produtos originais do input para preservar as opções selecionadas por item
  const productsInput = input.products;

  if (productsInput.length === 0) {
    throw new Error("O pedido precisa ter pelo menos um item.");
  }

  const productIds = Array.from(new Set(productsInput.map((p) => p.id)));
  const productsWithPrices = await db
    .select()
    .from(productsTable)
    .where(
      and(
        inArray(productsTable.id, productIds),
        eq(productsTable.restaurantId, restaurant.id),
        eq(productsTable.isActive, true),
      ),
    );

  const productsMap = new Map<string, Product>(
    productsWithPrices.map((product) => [product.id, product]),
  );

  // Carregar todas as opções selecionadas de uma vez para otimizar
  const allOptionIds = Array.from(
    new Set(productsInput.flatMap((p) => p.selectedOptions || [])),
  );
  const optionsMap = new Map<string, ProductOption>();

  if (allOptionIds.length > 0) {
    const options = await db
      .select()
      .from(productOptionsTable)
      .where(inArray(productOptionsTable.id, allOptionIds));
    options.forEach((o) => optionsMap.set(o.id, o));
  }

  // Verificar disponibilidade de insumos via Ficha Técnica antes de confirmar o pedido
  const allProductIds = Array.from(new Set(productsInput.map((p) => p.id)));
  const allRecipeItemsForCheck = await db
    .select({
      productId: recipeItemsTable.productId,
      inventoryItemId: recipeItemsTable.inventoryItemId,
      quantityNeeded: recipeItemsTable.quantityNeeded,
      inventoryName: inventoryItemsTable.name,
      currentQuantity: inventoryItemsTable.currentQuantity,
    })
    .from(recipeItemsTable)
    .innerJoin(inventoryItemsTable, eq(inventoryItemsTable.id, recipeItemsTable.inventoryItemId))
    .where(inArray(recipeItemsTable.productId, allProductIds));

  const consumoTotal = new Map<string, { name: string; needed: number; available: number }>();
  for (const prodInput of productsInput) {
    for (const ri of allRecipeItemsForCheck.filter((r) => r.productId === prodInput.id)) {
      const key = ri.inventoryItemId;
      const existing = consumoTotal.get(key) ?? { name: ri.inventoryName, needed: 0, available: ri.currentQuantity };
      existing.needed += ri.quantityNeeded * prodInput.quantity;
      consumoTotal.set(key, existing);
    }
  }

  for (const [, info] of consumoTotal) {
    if (info.needed > info.available) {
      throw new Error(`Desculpe, ingrediente "${info.name}" temporariamente indisponível.`);
    }
  }

  const itens: ItemPedidoCalculado[] = productsInput.map((itemInput) => {
    const currentProduct = productsMap.get(itemInput.id);

    if (!currentProduct) {
      throw new Error("Produto nao encontrado.");
    }

    if (
      currentProduct.trackInventory &&
      currentProduct.stockQuantity < itemInput.quantity
    ) {
      throw new Error(`Estoque insuficiente para o produto ${currentProduct.name}.`);
    }

    const selectedOptions = (itemInput.selectedOptions || []).map((optId) => {
      const option = optionsMap.get(optId);
      if (!option) throw new Error("Opção selecionada não encontrada.");
      return {
        id: option.id,
        name: option.name,
        price: option.price,
      };
    });

    const optionsPrice = selectedOptions.reduce(
      (acc, opt) => acc + opt.price,
      0,
    );
    const unitPrice = currentProduct.price + optionsPrice;
    const lineTotal = arredondarMoeda(unitPrice * itemInput.quantity);

    return {
      productId: currentProduct.id,
      productNameSnapshot: currentProduct.name,
      quantity: itemInput.quantity,
      price: currentProduct.price,
      unitCost: currentProduct.costPrice,
      lineTotal,
      notes: itemInput.notes,
      currentProduct,
      selectedOptions,
    };
  });

  const subtotal = arredondarMoeda(
    itens.reduce((accumulator, item) => {
      return accumulator + item.lineTotal;
    }, 0),
  );

  const estimatedCost = arredondarMoeda(
    itens.reduce((accumulator, item) => {
      return accumulator + item.unitCost * item.quantity;
    }, 0),
  );

  const coupon = await resolverCupomAplicado({
    couponCode: input.couponCode,
    restaurantId: restaurant.id,
    customerPhone: input.customerPhone,
    subtotal,
  });

  const [wallet] = await db
    .select()
    .from(walletsTable)
    .where(
      and(
        eq(walletsTable.restaurantId, restaurant.id),
        eq(walletsTable.customerPhone, input.customerPhone),
      ),
    )
    .limit(1);

  if (input.useWalletBalance && (!wallet || wallet.balance <= 0)) {
    throw new Error("Voce nao possui saldo de cashback disponivel para resgate.");
  }

  const couponDiscountAmount = coupon?.discountAmount ?? 0;
  const totalAfterCoupon = Math.max(subtotal - couponDiscountAmount, 0);
  const cashbackRedeemedAmount =
    input.useWalletBalance && wallet
      ? arredondarMoeda(Math.min(wallet.balance, totalAfterCoupon))
      : 0;

  let deliveryFee = restaurant.deliveryFee ?? 0;

  if (input.consumptionMethod === "DELIVERY") {
    const lat = (input as ValidarBeneficiosPedidoInput).deliveryLatitude;
    const lng = (input as ValidarBeneficiosPedidoInput).deliveryLongitude;
    const feeRules = await db
      .select()
      .from(deliveryFeeRulesTable)
      .where(
        and(
          eq(deliveryFeeRulesTable.restaurantId, restaurant.id),
          eq(deliveryFeeRulesTable.isActive, true),
        ),
      )
      .orderBy(asc(deliveryFeeRulesTable.displayOrder));

    if (feeRules.length > 0) {
      const matchedRule = lat !== undefined && lng !== undefined && restaurant.latitude && restaurant.longitude
        ? feeRules.find((rule) => {
            if (rule.type === "RADIUS_KM" && rule.maxDistanceKm !== null) {
              const distKm = calcularDistanciaKm(
                restaurant.latitude!,
                restaurant.longitude!,
                lat,
                lng,
              );
              return distKm <= rule.maxDistanceKm;
            }
            return false;
          }) ?? feeRules[0]
        : feeRules[0];

      if (matchedRule) {
        if (matchedRule.freeDeliveryThreshold !== null && subtotal >= matchedRule.freeDeliveryThreshold) {
          deliveryFee = 0;
        } else {
          deliveryFee = matchedRule.fee;
        }
      }
    } else if (restaurant.freeDeliveryThreshold !== null && subtotal >= (restaurant.freeDeliveryThreshold ?? Infinity)) {
      deliveryFee = 0;
    }
  } else {
    deliveryFee = 0;
  }

  const discountAmount = arredondarMoeda(
    couponDiscountAmount + cashbackRedeemedAmount,
  );
  const total = arredondarMoeda(
    Math.max(subtotal + deliveryFee - discountAmount, 0),
  );

  // Buscar regras de fidelidade ativas para o restaurante
  const loyaltyRules = await db
    .select()
    .from(loyaltyRulesTable)
    .where(
      and(
        eq(loyaltyRulesTable.restaurantId, restaurant.id),
        eq(loyaltyRulesTable.isActive, true),
      ),
    )
    .orderBy(desc(loyaltyRulesTable.minOrderValue));

  // Encontrar a melhor regra aplicável ao subtotal atual
  const applicableRule = loyaltyRules.find(
    (rule) => subtotal >= rule.minOrderValue,
  );

  const cashbackPercent = applicableRule
    ? applicableRule.cashbackPercent
    : restaurant.cashbackPercent;

  const cashbackEarnedAmount = arredondarMoeda(
    total * (cashbackPercent / 100),
  );

  // Encontrar a próxima regra de fidelidade (para upsell)
  const nextLoyaltyRule = [...loyaltyRules]
    .reverse()
    .find((rule) => rule.minOrderValue > subtotal);

  const nextLoyaltyRuleFormatted = nextLoyaltyRule
    ? {
        minOrderValue: nextLoyaltyRule.minOrderValue,
        cashbackPercent: nextLoyaltyRule.cashbackPercent,
        remainingAmount: arredondarMoeda(nextLoyaltyRule.minOrderValue - subtotal),
      }
    : null;

  return {
    restaurant,
    itens,
    subtotal,
    estimatedCost,
    coupon,
    wallet: wallet ?? null,
    couponDiscountAmount,
    cashbackRedeemedAmount,
    deliveryFee,
    discountAmount,
    total,
    cashbackEarnedAmount,
    nextLoyaltyRule: nextLoyaltyRuleFormatted,
  };
};

export const buscarRestauranteComCardapioPorSlug = async (
  slug: string,
): Promise<(RestaurantComCategoriasEProdutos & { rating: number; ratingCount: number }) | null> => {
  const restaurant = await buscarRestaurantePorSlug(slug);

  if (!restaurant) {
    return null;
  }

  // Buscar estatísticas de avaliação
  const ratings = await db
    .select({
      avgStars: sql<number>`avg(${orderRatingsTable.stars})`,
      count: sql<number>`count(*)`,
    })
    .from(orderRatingsTable)
    .where(
      and(
        eq(orderRatingsTable.restaurantId, restaurant.id),
        eq(orderRatingsTable.isActive, true),
      ),
    );

  const rating = Number(ratings[0]?.avgStars || 0);
  const ratingCount = Number(ratings[0]?.count || 0);

  // Contar produtos ativos por categoria
  const categoryProductCounts = await db
    .select({
      categoryId: menuCategoriesTable.id,
      activeCount: sql<number>`count(case when ${productsTable.isActive} = true then 1 end)`.as('activeCount'),
    })
    .from(menuCategoriesTable)
    .leftJoin(productsTable, eq(productsTable.menuCategoryId, menuCategoriesTable.id))
    .where(
      and(
        eq(menuCategoriesTable.restaurantId, restaurant.id),
        eq(menuCategoriesTable.isActive, true),
      ),
    )
    .groupBy(menuCategoriesTable.id);

  const categoryCountMap = new Map(
    categoryProductCounts.map((cc) => [cc.categoryId, cc.activeCount]),
  );

  // Buscar bestsellers por categoria usando window function
  // A consulta agrupa produtos por categoria, soma as vendas,
  // e ordena por quantidade vendida dentro de cada categoria
  const bestsellersRaw = await db
    .select({
      productId: orderProductsTable.productId,
      categoryId: productsTable.menuCategoryId,
      totalQuantity: sql<number>`sum(${orderProductsTable.quantity})`.as('totalQuantity'),
      rowNumber: sql<number>`row_number() over (partition by ${productsTable.menuCategoryId} order by sum(${orderProductsTable.quantity}) desc, ${productsTable.id})`.as('rowNumber'),
    })
    .from(orderProductsTable)
    .innerJoin(ordersTable, eq(ordersTable.id, orderProductsTable.orderId))
    .innerJoin(productsTable, eq(productsTable.id, orderProductsTable.productId))
    .where(eq(ordersTable.restaurantId, restaurant.id))
    .groupBy(orderProductsTable.productId, productsTable.menuCategoryId, productsTable.id);

  // Determinar bestsellers baseado nas regras de negócio:
  // - Categorias com ≤5 produtos: TOP 1
  // - Categorias com >5 produtos: TOP 3
  const topSellerIds = new Set<string>();
  for (const product of bestsellersRaw) {
    const activeCount = categoryCountMap.get(product.categoryId) || 0;
    const limit = activeCount <= 5 ? 1 : 3;
    if (product.rowNumber <= limit) {
      topSellerIds.add(product.productId);
    }
  }

  const operatingHours = await db
    .select()
    .from(operatingHoursTable)
    .where(eq(operatingHoursTable.restaurantId, restaurant.id))
    .orderBy(asc(operatingHoursTable.dayOfWeek));

  const rows = await db
    .select({
      category: menuCategoriesTable,
      product: productsTable,
    })
    .from(menuCategoriesTable)
    .leftJoin(
      productsTable,
      and(
        eq(productsTable.menuCategoryId, menuCategoriesTable.id),
        eq(productsTable.isActive, true),
      ),
    )
    .where(
      and(
        eq(menuCategoriesTable.restaurantId, restaurant.id),
        eq(menuCategoriesTable.isActive, true),
      ),
    )
    .orderBy(
      asc(menuCategoriesTable.displayOrder),
      asc(menuCategoriesTable.name),
      asc(productsTable.name),
    );

  const categoriesMap = new Map<
    string,
    RestaurantComCategoriasEProdutos["menuCategories"][number]
  >();

  for (const row of rows) {
    const currentCategory = categoriesMap.get(row.category.id) ?? {
      ...row.category,
      products: [],
    };

    if (row.product) {
      currentCategory.products.push({
        ...row.product,
        isBestseller: topSellerIds.has(row.product.id),
      } as any);
    }

    categoriesMap.set(row.category.id, currentCategory);
  }

  return {
    ...restaurant,
    menuCategories: Array.from(categoriesMap.values()),
    operatingHours,
    rating,
    ratingCount,
  };
};

export const buscarProdutoDoRestaurante = async ({
  slug,
  productId,
}: {
  slug: string;
  productId: string;
}): Promise<(ProductComRestaurante & { optionGroups: (ProductOptionGroup & { options: ProductOption[] })[] }) | null> => {
  const product = await db.query.productsTable.findFirst({
    where: and(
      eq(productsTable.id, productId),
      eq(productsTable.isActive, true),
    ),
    with: {
      restaurant: {
        with: {
          operatingHours: true,
        },
      },
    },
  });

  if (!product || product.restaurant.slug !== slug) {
    return null;
  }

  const groupRows = await db
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
      asc(productOptionsTable.displayOrder),
    );

  const groupMap = new Map<string, ProductOptionGroup & { options: ProductOption[] }>();
  for (const row of groupRows) {
    const g = groupMap.get(row.group.id) ?? { ...row.group, options: [] };
    if (row.option) g.options.push(row.option);
    groupMap.set(row.group.id, g);
  }

  return { ...product, optionGroups: Array.from(groupMap.values()) } as any;
};

export const buscarPedidosPorTelefone = async (
  customerPhone: string,
): Promise<OrderComItens[]> => {
  const pedidos = await db
    .select({
      order: ordersTable,
      restaurant: {
        name: restaurantsTable.name,
        avatarImageUrl: restaurantsTable.avatarImageUrl,
        slug: restaurantsTable.slug,
      },
      diningTable: {
        id: diningTablesTable.id,
        name: diningTablesTable.name,
        seats: diningTablesTable.seats,
      },
      courier: {
        id: couriersTable.id,
        name: couriersTable.name,
        phone: couriersTable.phone,
      },
    })
    .from(ordersTable)
    .innerJoin(
      restaurantsTable,
      eq(restaurantsTable.id, ordersTable.restaurantId),
    )
    .leftJoin(diningTablesTable, eq(diningTablesTable.id, ordersTable.diningTableId))
    .leftJoin(couriersTable, eq(couriersTable.id, ordersTable.courierId))
    .where(eq(ordersTable.customerPhone, customerPhone))
    .orderBy(desc(ordersTable.createdAt));

  if (pedidos.length === 0) {
    return [];
  }

  const orderIds = pedidos.map(({ order }) => order.id);
  const itens = await db
    .select({
      orderId: orderProductsTable.orderId,
      orderProduct: orderProductsTable,
      product: productsTable,
    })
    .from(orderProductsTable)
    .innerJoin(productsTable, eq(productsTable.id, orderProductsTable.productId))
    .where(inArray(orderProductsTable.orderId, orderIds));

  const orderProductIds = itens.map((i) => i.orderProduct.id);
  const options = orderProductIds.length > 0
    ? await db
        .select()
        .from(orderProductOptionsTable)
        .where(inArray(orderProductOptionsTable.orderProductId, orderProductIds))
    : [];

  const optionsMap = new Map<string, OrderProductOption[]>();
  options.forEach((opt) => {
    const list = optionsMap.get(opt.orderProductId) ?? [];
    list.push(opt);
    optionsMap.set(opt.orderProductId, list);
  });

  const pedidosNormalizados = pedidos.map(({ order, restaurant, diningTable, courier }) => ({
    ...order,
    restaurant,
    diningTable: diningTable ? diningTable : null,
    courier: courier ? courier : null,
  }));

  return agruparItensPorPedido(
    pedidosNormalizados,
    itens.map((item) => ({
      orderId: item.orderId,
      item: {
        ...item.orderProduct,
        product: item.product,
        orderProductOptions: optionsMap.get(item.orderProduct.id) ?? [],
      },
    })),
  );
};

export const validarBeneficiosPedido = async (
  input: ValidarBeneficiosPedidoInput,
): Promise<PedidoBeneficiosValidado> => {
  const contexto = await carregarContextoPedidoCalculado(input);

  return {
    subtotal: contexto.subtotal,
    deliveryFee: contexto.deliveryFee,
    discountAmount: contexto.discountAmount,
    couponDiscountAmount: contexto.couponDiscountAmount,
    cashbackRedeemedAmount: contexto.cashbackRedeemedAmount,
    total: contexto.total,
    cashbackEarnedAmount: contexto.cashbackEarnedAmount,
    appliedCoupon: contexto.coupon?.coupon ?? null,
    wallet: contexto.wallet
      ? {
          id: contexto.wallet.id,
          currentBalance: contexto.wallet.balance,
          remainingBalance: arredondarMoeda(
            Math.max(
              contexto.wallet.balance - contexto.cashbackRedeemedAmount,
              0,
            ),
          ),
          availableToRedeem: contexto.cashbackRedeemedAmount,
        }
      : null,
  };
};

export const buscarProximaRegraFidelidade = async (
  slug: string,
  subtotal: number,
): Promise<{
  minOrderValue: number;
  cashbackPercent: number;
  remainingAmount: number;
} | null> => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return null;

  const loyaltyRules = await db
    .select()
    .from(loyaltyRulesTable)
    .where(
      and(
        eq(loyaltyRulesTable.restaurantId, restaurant.id),
        eq(loyaltyRulesTable.isActive, true),
      ),
    )
    .orderBy(desc(loyaltyRulesTable.minOrderValue));

  const nextRule = [...loyaltyRules]
    .reverse()
    .find((rule) => rule.minOrderValue > subtotal);

  if (!nextRule) return null;

  return {
    minOrderValue: nextRule.minOrderValue,
    cashbackPercent: nextRule.cashbackPercent,
    remainingAmount: arredondarMoeda(nextRule.minOrderValue - subtotal),
  };
};

export const criarPedido = async (input: CriarPedidoInput): Promise<Order> => {
  const contexto = await carregarContextoPedidoCalculado(input);
  const scheduledFor = validarAgendamentoPedido({
    consumptionMethod: input.consumptionMethod,
    scheduledFor: input.scheduledFor,
  });
  const estimatedProfit = arredondarMoeda(
    contexto.total - contexto.estimatedCost,
  );

  const order = await db.transaction(async (tx) => {
    if (contexto.coupon) {
      const [couponSnapshot] = await tx
        .select({
          id: couponsTable.id,
          usageCount: couponsTable.usageCount,
          usageLimit: couponsTable.usageLimit,
          perCustomerLimit: couponsTable.perCustomerLimit,
        })
        .from(couponsTable)
        .where(eq(couponsTable.id, contexto.coupon.coupon.id))
        .limit(1);

      if (!couponSnapshot) {
        throw new Error("Cupom invalido ou indisponivel para este pedido.");
      }

      if (
        couponSnapshot.usageLimit !== null &&
        couponSnapshot.usageCount >= couponSnapshot.usageLimit
      ) {
        throw new Error("Este cupom acabou de atingir o limite de uso.");
      }

      const [usageByCustomer] = await tx
        .select({
          count: sql<number>`count(*)`,
        })
        .from(ordersTable)
        .where(
          and(
            eq(ordersTable.restaurantId, contexto.restaurant.id),
            eq(ordersTable.customerPhone, input.customerPhone),
            eq(ordersTable.couponId, couponSnapshot.id),
          ),
        );

      if (
        Number(usageByCustomer?.count ?? 0) >= couponSnapshot.perCustomerLimit
      ) {
        throw new Error(
          "Este cupom ja foi utilizado o maximo permitido para este celular.",
        );
      }

      await tx
        .update(couponsTable)
        .set({
          usageCount: couponSnapshot.usageCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(couponsTable.id, couponSnapshot.id));
    }

    if (contexto.cashbackRedeemedAmount > 0 && contexto.wallet) {
      const [updatedWallet] = await tx
        .update(walletsTable)
        .set({
          balance: arredondarMoeda(
            contexto.wallet.balance - contexto.cashbackRedeemedAmount,
          ),
          totalRedeemed: arredondarMoeda(
            contexto.wallet.totalRedeemed + contexto.cashbackRedeemedAmount,
          ),
          lastRedeemAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(walletsTable.id, contexto.wallet.id),
            gte(walletsTable.balance, contexto.cashbackRedeemedAmount),
          ),
        )
        .returning({
          id: walletsTable.id,
        });

      if (!updatedWallet) {
        throw new Error("O saldo de cashback nao esta mais disponivel para uso.");
      }
    }

    const [order] = await tx
      .insert(ordersTable)
      .values({
        subtotal: contexto.subtotal,
        discountAmount: contexto.discountAmount,
        couponDiscountAmount: contexto.couponDiscountAmount,
        cashbackRedeemedAmount: contexto.cashbackRedeemedAmount,
        cashbackEarnedAmount: contexto.cashbackEarnedAmount,
        deliveryFee: contexto.deliveryFee,
        total: contexto.total,
        estimatedCost: contexto.estimatedCost,
        estimatedProfit,
        status: "PENDING",
        paymentStatus: "PENDING",
        consumptionMethod: input.consumptionMethod,
        paymentMethod: input.paymentMethod,
        changeFor: input.changeFor,
        notes: input.notes,
        couponId: contexto.coupon?.coupon.id,
        couponCode: contexto.coupon?.coupon.code,
        restaurantId: contexto.restaurant.id,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        scheduledFor,
        diningTableId: input.diningTableId,
        deliveryAddress: input.deliveryAddress,
        deliveryLatitude: input.deliveryLatitude,
        deliveryLongitude: input.deliveryLongitude,
        marketplaceOrderId: input.marketplaceOrderId,
        marketplaceType: input.marketplaceType,
      })
      .returning();

    await tx.insert(orderProductsTable).values(
      contexto.itens.map((item) => ({
        productId: item.productId,
        orderId: order.id,
        quantity: item.quantity,
        price: item.price,
        unitCost: item.unitCost,
        lineTotal: item.lineTotal,
        productNameSnapshot: item.productNameSnapshot,
        notes: item.notes,
      })),
    );

    for (const item of contexto.itens) {
      if (!item.currentProduct.trackInventory) {
        continue;
      }

      const previousQuantity = item.currentProduct.stockQuantity;
      const currentQuantity = previousQuantity - item.quantity;

      await tx
        .update(productsTable)
        .set({
          stockQuantity: currentQuantity,
          updatedAt: new Date(),
        })
        .where(eq(productsTable.id, item.productId));

      await tx.insert(stockMovementsTable).values({
        restaurantId: contexto.restaurant.id,
        productId: item.productId,
        orderId: order.id,
        type: "OUT",
        quantityDelta: -item.quantity,
        previousQuantity,
        currentQuantity,
        reason: `Baixa automatica do pedido #${String(order.id)}`,
      });
    }

    // Baixa proporcional de insumos via Ficha Técnica
    for (const item of contexto.itens) {
      const recipeItems = await tx
        .select({
          inventoryItemId: recipeItemsTable.inventoryItemId,
          quantityNeeded: recipeItemsTable.quantityNeeded,
          currentQuantity: inventoryItemsTable.currentQuantity,
        })
        .from(recipeItemsTable)
        .innerJoin(
          inventoryItemsTable,
          eq(inventoryItemsTable.id, recipeItemsTable.inventoryItemId),
        )
        .where(eq(recipeItemsTable.productId, item.productId));

      for (const ri of recipeItems) {
        const totalConsumed = ri.quantityNeeded * item.quantity;
        const prevQty = ri.currentQuantity;
        const nextQty = prevQty - totalConsumed;

        await tx
          .update(inventoryItemsTable)
          .set({ currentQuantity: nextQty, updatedAt: new Date() })
          .where(eq(inventoryItemsTable.id, ri.inventoryItemId));

        await tx.insert(stockMovementsTable).values({
          restaurantId: contexto.restaurant.id,
          inventoryItemId: ri.inventoryItemId,
          orderId: order.id,
          type: "OUT",
          quantityDelta: -totalConsumed,
          previousQuantity: prevQty,
          currentQuantity: nextQty,
          reason: `Venda automatica - Pedido #${String(order.id)}`,
        });
      }
    }

    return order;
  });

  await marcarCarrinhoAbandonadoComoConvertido({
    orderId: order.id,
    restaurantId: contexto.restaurant.id,
    sessionId: input.abandonedCartSessionId,
  });

  // Desativar produtos cujo ingrediente principal zerou no estoque
  await desativarProdutosSemInsumo(contexto.restaurant.id);

  return order;
};

const desativarProdutosSemInsumo = async (restaurantId: string) => {
  // Busca todos os insumos zerados deste restaurante
  const esgotados = await db
    .select({ id: inventoryItemsTable.id })
    .from(inventoryItemsTable)
    .where(
      and(
        eq(inventoryItemsTable.restaurantId, restaurantId),
        sql`${inventoryItemsTable.currentQuantity} <= 0`,
      ),
    );

  if (esgotados.length === 0) return;

  const esgotadosIds = esgotados.map((e) => e.id);

  // Busca produtos ativos que dependem exclusivamente desses insumos esgotados
  const produtosAfetados = await db
    .selectDistinct({ productId: recipeItemsTable.productId })
    .from(recipeItemsTable)
    .innerJoin(productsTable, eq(productsTable.id, recipeItemsTable.productId))
    .where(
      and(
        eq(productsTable.restaurantId, restaurantId),
        eq(productsTable.isActive, true),
        inArray(recipeItemsTable.inventoryItemId, esgotadosIds),
      ),
    );

  if (produtosAfetados.length === 0) return;

  await db
    .update(productsTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        inArray(
          productsTable.id,
          produtosAfetados.map((p) => p.productId),
        ),
        eq(productsTable.restaurantId, restaurantId),
      ),
    );
};

export const listarMesasComandasPorSlug = async (
  slug: string,
): Promise<MesaComanda[]> => {
  const restaurant = await buscarRestaurantePorSlug(slug);

  if (!restaurant) {
    return [];
  }

  const tables = await db
    .select()
    .from(diningTablesTable)
    .where(
      and(
        eq(diningTablesTable.restaurantId, restaurant.id),
        eq(diningTablesTable.isActive, true),
      ),
    )
    .orderBy(asc(diningTablesTable.displayOrder), asc(diningTablesTable.name));

  const activeOrders = await db
    .select({
      id: ordersTable.id,
      diningTableId: ordersTable.diningTableId,
      createdAt: ordersTable.createdAt,
      status: ordersTable.status,
      consumptionMethod: ordersTable.consumptionMethod,
    })
    .from(ordersTable)
    .where(eq(ordersTable.restaurantId, restaurant.id))
    .orderBy(desc(ordersTable.createdAt));

  const activeOrdersByTable = new Map<string, number>();

  for (const order of activeOrders) {
    if (
      order.consumptionMethod !== "DINE_IN" ||
      !order.diningTableId ||
      !pedidoEstaAtivo(order.status)
    ) {
      continue;
    }

    if (!activeOrdersByTable.has(order.diningTableId)) {
      activeOrdersByTable.set(order.diningTableId, order.id);
    }
  }

  const detailedOrders = await Promise.all(
    Array.from(activeOrdersByTable.values()).map((orderId) =>
      buscarPedidoRecebimentoPorId(orderId),
    ),
  );

  const orderMap = new Map<number, PedidoRecebimento>();

  for (const order of detailedOrders) {
    if (order) {
      orderMap.set(order.id, order);
    }
  }

  return tables.map((table) => {
    const orderId = activeOrdersByTable.get(table.id);

    return {
      table,
      currentOrder: orderId ? orderMap.get(orderId) ?? null : null,
    };
  });
};

export const abrirComandaMesa = async ({
  slug,
  diningTableId,
  customerName,
}: AbrirComandaMesaInput): Promise<PedidoRecebimento> => {
  const restaurant = await buscarRestaurantePorSlug(slug);

  if (!restaurant) {
    throw new Error("Restaurante nao encontrado.");
  }

  const [table] = await db
    .select()
    .from(diningTablesTable)
    .where(
      and(
        eq(diningTablesTable.id, diningTableId),
        eq(diningTablesTable.restaurantId, restaurant.id),
        eq(diningTablesTable.isActive, true),
      ),
    )
    .limit(1);

  if (!table) {
    throw new Error("Mesa nao encontrada.");
  }

  const [existingOrder] = await db
    .select({
      id: ordersTable.id,
      status: ordersTable.status,
    })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.restaurantId, restaurant.id),
        eq(ordersTable.diningTableId, table.id),
        eq(ordersTable.consumptionMethod, "DINE_IN"),
      ),
    )
    .orderBy(desc(ordersTable.createdAt))
    .limit(1);

  if (existingOrder && pedidoEstaAtivo(existingOrder.status)) {
    const currentOrder = await buscarPedidoRecebimentoPorId(existingOrder.id);

    if (!currentOrder) {
      throw new Error("Nao foi possivel carregar a comanda aberta.");
    }

    return currentOrder;
  }

  const [order] = await db
    .insert(ordersTable)
    .values({
      subtotal: 0,
      discountAmount: 0,
      couponDiscountAmount: 0,
      cashbackRedeemedAmount: 0,
      cashbackEarnedAmount: 0,
      deliveryFee: 0,
      total: 0,
      estimatedCost: 0,
      estimatedProfit: 0,
      status: "PENDING",
      paymentStatus: "PENDING",
      consumptionMethod: "DINE_IN",
      paymentMethod: "DINHEIRO",
      restaurantId: restaurant.id,
      diningTableId: table.id,
      customerName: customerName?.trim() || table.name,
      customerPhone: `MESA-${table.id.slice(0, 8)}-${Date.now().toString()}`,
    })
    .returning({
      id: ordersTable.id,
    });

  const createdOrder = await buscarPedidoRecebimentoPorId(order.id);

  if (!createdOrder) {
    throw new Error("Nao foi possivel abrir a comanda da mesa.");
  }

  return createdOrder;
};

export const adicionarItensComanda = async ({
  orderId,
  products,
}: AdicionarItensComandaInput): Promise<PedidoRecebimento> => {
  const normalizedProducts = normalizarProdutosPedido(products);

  if (normalizedProducts.length === 0) {
    throw new Error("Selecione pelo menos um item para lancar na comanda.");
  }

  const result = await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1);

    if (!order) {
      throw new Error("Comanda nao encontrada.");
    }

    if (order.consumptionMethod !== "DINE_IN" || !order.diningTableId) {
      throw new Error("Este pedido nao pertence a uma comanda de mesa.");
    }

    if (!pedidoEstaAtivo(order.status)) {
      throw new Error("Nao e possivel adicionar itens a uma comanda encerrada.");
    }

    const [table] = await tx
      .select()
      .from(diningTablesTable)
      .where(eq(diningTablesTable.id, order.diningTableId))
      .limit(1);

    const productsWithPrices = await tx
      .select()
      .from(productsTable)
      .where(
        and(
          inArray(
            productsTable.id,
            normalizedProducts.map((product) => product.id),
          ),
          eq(productsTable.restaurantId, order.restaurantId),
          eq(productsTable.isActive, true),
        ),
      );

    const productsMap = new Map(
      productsWithPrices.map((product) => [product.id, product]),
    );

    const currentOrderProducts = await tx
      .select()
      .from(orderProductsTable)
      .where(eq(orderProductsTable.orderId, order.id));

    const currentOrderProductsMap = new Map(
      currentOrderProducts.map((orderProduct) => [orderProduct.productId, orderProduct]),
    );

    for (const selectedProduct of normalizedProducts) {
      const product = productsMap.get(selectedProduct.id);

      if (!product) {
        throw new Error("Produto nao encontrado para esta comanda.");
      }

      if (product.trackInventory && product.stockQuantity < selectedProduct.quantity) {
        throw new Error(`Estoque insuficiente para o produto ${product.name}.`);
      }

      const existingOrderProduct = currentOrderProductsMap.get(product.id);

      if (existingOrderProduct) {
        const nextQuantity = existingOrderProduct.quantity + selectedProduct.quantity;
        const nextLineTotal = arredondarMoeda(nextQuantity * existingOrderProduct.price);

        await tx
          .update(orderProductsTable)
          .set({
            quantity: nextQuantity,
            lineTotal: nextLineTotal,
            updatedAt: new Date(),
          })
          .where(eq(orderProductsTable.id, existingOrderProduct.id));
      } else {
        await tx.insert(orderProductsTable).values({
          orderId: order.id,
          productId: product.id,
          quantity: selectedProduct.quantity,
          price: product.price,
          unitCost: product.costPrice,
          lineTotal: arredondarMoeda(product.price * selectedProduct.quantity),
          productNameSnapshot: product.name,
        });
      }

      if (product.trackInventory) {
        const previousQuantity = product.stockQuantity;
        const currentQuantity = previousQuantity - selectedProduct.quantity;

        await tx
          .update(productsTable)
          .set({
            stockQuantity: currentQuantity,
            updatedAt: new Date(),
          })
          .where(eq(productsTable.id, product.id));

        await tx.insert(stockMovementsTable).values({
          restaurantId: order.restaurantId,
          productId: product.id,
          orderId: order.id,
          type: "OUT",
          quantityDelta: -selectedProduct.quantity,
          previousQuantity,
          currentQuantity,
          reason: `Lancamento na comanda ${table?.name ?? "mesa"} do pedido #${String(order.id)}`,
        });
      }

      // Baixa proporcional de insumos via Ficha Técnica
      const recipeItems = await tx
        .select({
          inventoryItemId: recipeItemsTable.inventoryItemId,
          quantityNeeded: recipeItemsTable.quantityNeeded,
          currentQuantity: inventoryItemsTable.currentQuantity,
        })
        .from(recipeItemsTable)
        .innerJoin(
          inventoryItemsTable,
          eq(inventoryItemsTable.id, recipeItemsTable.inventoryItemId),
        )
        .where(eq(recipeItemsTable.productId, product.id));

      for (const ri of recipeItems) {
        const totalConsumed = ri.quantityNeeded * selectedProduct.quantity;
        const prevQty = ri.currentQuantity;
        const nextQty = prevQty - totalConsumed;

        await tx
          .update(inventoryItemsTable)
          .set({ currentQuantity: nextQty, updatedAt: new Date() })
          .where(eq(inventoryItemsTable.id, ri.inventoryItemId));

        await tx.insert(stockMovementsTable).values({
          restaurantId: order.restaurantId,
          inventoryItemId: ri.inventoryItemId,
          orderId: order.id,
          type: "OUT",
          quantityDelta: -totalConsumed,
          previousQuantity: prevQty,
          currentQuantity: nextQty,
          reason: `Venda automatica - Comanda ${table?.name ?? "mesa"} - Pedido #${String(order.id)}`,
        });
      }
    }

    const updatedOrderProducts = await tx
      .select()
      .from(orderProductsTable)
      .where(eq(orderProductsTable.orderId, order.id));

    const subtotal = arredondarMoeda(
      updatedOrderProducts.reduce((accumulator, item) => {
        return accumulator + item.lineTotal;
      }, 0),
    );
    const estimatedCost = arredondarMoeda(
      updatedOrderProducts.reduce((accumulator, item) => {
        return accumulator + item.unitCost * item.quantity;
      }, 0),
    );
    const total = arredondarMoeda(
      subtotal + order.deliveryFee - order.discountAmount,
    );
    const estimatedProfit = arredondarMoeda(total - estimatedCost);

    await tx
      .update(ordersTable)
      .set({
        subtotal,
        total,
        estimatedCost,
        estimatedProfit,
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, order.id));

    return {
      orderId: order.id,
      hadItemsBefore: currentOrderProducts.length > 0,
    };
  });

  const updatedOrder = await buscarPedidoRecebimentoPorId(result.orderId);

  if (!updatedOrder) {
    throw new Error("Nao foi possivel carregar a comanda atualizada.");
  }

  return updatedOrder;
};

export const fecharComanda = async ({
  orderId,
  paymentMethod,
}: FecharComandaInput): Promise<PedidoRecebimento> => {
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .limit(1);

  if (!order) {
    throw new Error("Comanda nao encontrada.");
  }

  if (order.consumptionMethod !== "DINE_IN") {
    throw new Error("Este pedido nao pertence a uma mesa.");
  }

  if (!pedidoEstaAtivo(order.status)) {
    throw new Error("A comanda selecionada ja foi encerrada.");
  }

  await db
    .update(ordersTable)
    .set({
      paymentMethod,
      updatedAt: new Date(),
    })
    .where(eq(ordersTable.id, orderId));

  await atualizarStatusPagamentoPedido({
    orderId,
    paymentStatus: "PAID",
  });

  await atualizarStatusPedido({
    orderId,
    status: "FINISHED",
  });

  const updatedOrder = await buscarPedidoRecebimentoPorId(orderId);

  if (!updatedOrder) {
    throw new Error("Nao foi possivel carregar a comanda encerrada.");
  }

  return updatedOrder;
};

export const atualizarStatusPedido = async ({
  orderId,
  status,
}: AtualizarStatusPedidoInput): Promise<
  (AtualizacaoPedidoBase & { status: OrderStatus }) | null
> => {
  const result = await db.transaction(async (tx) => {
    const [existingOrder] = await tx
      .select({
        id: ordersTable.id,
        status: ordersTable.status,
        restaurantId: ordersTable.restaurantId,
      })
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1);

    if (!existingOrder) {
      return null;
    }

    const [updatedOrder] = await tx
      .update(ordersTable)
      .set({
        status,
        ...getOrderStatusTimestamps(status),
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, orderId))
      .returning({
        id: ordersTable.id,
        status: ordersTable.status,
        restaurantId: ordersTable.restaurantId,
      });

    if (!updatedOrder) {
      return null;
    }

    if (status === "CANCELLED" && existingOrder.status !== "CANCELLED") {
      const orderItems = await tx
        .select({
          orderProduct: orderProductsTable,
          product: productsTable,
        })
        .from(orderProductsTable)
        .innerJoin(
          productsTable,
          eq(productsTable.id, orderProductsTable.productId),
        )
        .where(eq(orderProductsTable.orderId, orderId));

      for (const item of orderItems) {
        if (!item.product.trackInventory) {
          continue;
        }

        const previousQuantity = item.product.stockQuantity;
        const currentQuantity = previousQuantity + item.orderProduct.quantity;

        await tx
          .update(productsTable)
          .set({
            stockQuantity: currentQuantity,
            updatedAt: new Date(),
          })
          .where(eq(productsTable.id, item.product.id));

        await tx.insert(stockMovementsTable).values({
          restaurantId: updatedOrder.restaurantId,
          productId: item.product.id,
          orderId,
          type: "IN",
          quantityDelta: item.orderProduct.quantity,
          previousQuantity,
          currentQuantity,
          reason: `Reposicao por cancelamento do pedido #${String(orderId)}`,
        });
      }

      // Restaurar insumos de Ficha Técnica baixados neste pedido
      const inventoryOutMovements = await tx
        .select()
        .from(stockMovementsTable)
        .where(
          and(
            eq(stockMovementsTable.orderId, orderId),
            eq(stockMovementsTable.type, "OUT"),
            isNotNull(stockMovementsTable.inventoryItemId),
          ),
        );

      for (const mov of inventoryOutMovements) {
        if (!mov.inventoryItemId) continue;

        const [invItem] = await tx
          .select({ currentQuantity: inventoryItemsTable.currentQuantity })
          .from(inventoryItemsTable)
          .where(eq(inventoryItemsTable.id, mov.inventoryItemId))
          .limit(1);

        if (!invItem) continue;

        const restoredQty = -mov.quantityDelta;
        const prevQty = invItem.currentQuantity;
        const nextQty = prevQty + restoredQty;

        await tx
          .update(inventoryItemsTable)
          .set({ currentQuantity: nextQty, updatedAt: new Date() })
          .where(eq(inventoryItemsTable.id, mov.inventoryItemId));

        await tx.insert(stockMovementsTable).values({
          restaurantId: updatedOrder.restaurantId,
          inventoryItemId: mov.inventoryItemId,
          orderId,
          type: "IN",
          quantityDelta: restoredQty,
          previousQuantity: prevQty,
          currentQuantity: nextQty,
          reason: `Reposicao por cancelamento do pedido #${String(orderId)}`,
        });
      }
    }

    return updatedOrder;
  });

  if (!result) {
    return null;
  }

  const restaurantSlug = await resolverSlugRestaurante(result.restaurantId);

  if (!restaurantSlug) {
    return null;
  }

  return {
    id: result.id,
    status: result.status,
    restaurantSlug,
  };
};

export const atualizarStatusPagamentoPedido = async ({
  orderId,
  paymentStatus,
}: AtualizarStatusPagamentoPedidoInput): Promise<
  (AtualizacaoPedidoBase & { paymentStatus: PaymentStatus }) | null
> => {
  const result = await db.transaction(async (tx) => {
    const [existingOrder] = await tx
      .select({
        id: ordersTable.id,
        restaurantId: ordersTable.restaurantId,
        customerPhone: ordersTable.customerPhone,
        paymentStatus: ordersTable.paymentStatus,
        cashbackEarnedAmount: ordersTable.cashbackEarnedAmount,
        cashbackCreditedAt: ordersTable.cashbackCreditedAt,
      })
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1);

    if (!existingOrder) {
      return null;
    }

    const now = new Date();

    const [updatedOrder] = await tx
      .update(ordersTable)
      .set({
        paymentStatus,
        paidAt: paymentStatus === "PAID" ? now : null,
        updatedAt: now,
      })
      .where(eq(ordersTable.id, orderId))
      .returning({
        id: ordersTable.id,
        paymentStatus: ordersTable.paymentStatus,
        restaurantId: ordersTable.restaurantId,
      });

    if (!updatedOrder) {
      return null;
    }

    const shouldCreditCashback =
      paymentStatus === "PAID" &&
      existingOrder.paymentStatus !== "PAID" &&
      existingOrder.cashbackEarnedAmount > 0 &&
      existingOrder.cashbackCreditedAt === null &&
      isTelefoneElegivelParaCarteira(existingOrder.customerPhone);

    if (shouldCreditCashback) {
      const [wallet] = await tx
        .select()
        .from(walletsTable)
        .where(
          and(
            eq(walletsTable.restaurantId, existingOrder.restaurantId),
            eq(walletsTable.customerPhone, existingOrder.customerPhone),
          ),
        )
        .limit(1);

      if (wallet) {
        await tx
          .update(walletsTable)
          .set({
            balance: arredondarMoeda(
              wallet.balance + existingOrder.cashbackEarnedAmount,
            ),
            totalEarned: arredondarMoeda(
              wallet.totalEarned + existingOrder.cashbackEarnedAmount,
            ),
            lastCreditAt: now,
            updatedAt: now,
          })
          .where(eq(walletsTable.id, wallet.id));
      } else {
        await tx.insert(walletsTable).values({
          restaurantId: existingOrder.restaurantId,
          customerPhone: existingOrder.customerPhone,
          balance: existingOrder.cashbackEarnedAmount,
          totalEarned: existingOrder.cashbackEarnedAmount,
          totalRedeemed: 0,
          lastCreditAt: now,
        });
      }

      await tx
        .update(ordersTable)
        .set({
          cashbackCreditedAt: now,
          updatedAt: now,
        })
        .where(eq(ordersTable.id, orderId));
    }

    return updatedOrder;
  });

  if (!result) {
    return null;
  }

  const restaurantSlug = await resolverSlugRestaurante(result.restaurantId);

  if (!restaurantSlug) {
    return null;
  }

  return {
    id: result.id,
    paymentStatus: result.paymentStatus,
    restaurantSlug,
  };
};

export const buscarPedidoRecebimentoPorId = async (
  orderId: number,
): Promise<PedidoRecebimento | null> => {
  const [pedido] = await db
    .select({
      order: ordersTable,
      restaurant: {
        id: restaurantsTable.id,
        name: restaurantsTable.name,
        slug: restaurantsTable.slug,
      },
      diningTable: {
        id: diningTablesTable.id,
        name: diningTablesTable.name,
        seats: diningTablesTable.seats,
      },
      courier: {
        id: couriersTable.id,
        name: couriersTable.name,
        phone: couriersTable.phone,
      },
    })
    .from(ordersTable)
    .innerJoin(
      restaurantsTable,
      eq(restaurantsTable.id, ordersTable.restaurantId),
    )
    .leftJoin(diningTablesTable, eq(diningTablesTable.id, ordersTable.diningTableId))
    .leftJoin(couriersTable, eq(couriersTable.id, ordersTable.courierId))
    .where(eq(ordersTable.id, orderId))
    .limit(1);

  if (!pedido) {
    return null;
  }

  const itens = await db
    .select({
      orderProduct: orderProductsTable,
      product: {
        id: productsTable.id,
        name: productsTable.name,
        imageUrl: productsTable.imageUrl,
      },
      productionSector: {
        id: productionSectorsTable.id,
        name: productionSectorsTable.name,
        color: productionSectorsTable.color,
      },
    })
    .from(orderProductsTable)
    .innerJoin(productsTable, eq(productsTable.id, orderProductsTable.productId))
    .leftJoin(
      productionSectorsTable,
      eq(productionSectorsTable.id, productsTable.productionSectorId),
    )
    .where(eq(orderProductsTable.orderId, orderId));

  const orderProductIds = itens.map((i) => i.orderProduct.id);
  const options = orderProductIds.length > 0
    ? await db
        .select()
        .from(orderProductOptionsTable)
        .where(inArray(orderProductOptionsTable.orderProductId, orderProductIds))
    : [];

  const optionsMap = new Map<string, OrderProductOption[]>();
  options.forEach((opt) => {
    const list = optionsMap.get(opt.orderProductId) ?? [];
    list.push(opt);
    optionsMap.set(opt.orderProductId, list);
  });

  return {
    ...pedido.order,
    restaurant: pedido.restaurant,
    diningTable: pedido.diningTable ? pedido.diningTable : null,
    courier: pedido.courier ? pedido.courier : null,
    orderProducts: itens.map((item) => ({
      ...item.orderProduct,
      product: item.product,
      orderProductOptions: optionsMap.get(item.orderProduct.id) ?? [],
      productionSector: item.productionSector?.id ? item.productionSector : null,
    })),
  };
};

export const listarPedidosRecebimentoPorSlug = async (
  slug: string,
): Promise<PedidoRecebimento[]> => {
  const restaurant = await buscarRestaurantePorSlug(slug);

  if (!restaurant) {
    return [];
  }

  const pedidos = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.restaurantId, restaurant.id))
    .orderBy(desc(ordersTable.createdAt));

  const pedidosDetalhados = await Promise.all(
    pedidos.map((pedido) => buscarPedidoRecebimentoPorId(pedido.id)),
  );

  return pedidosDetalhados.filter(
    (pedido): pedido is PedidoRecebimento =>
      pedido !== null &&
      !(
        pedido.consumptionMethod === "DINE_IN" &&
        pedido.orderProducts.length === 0 &&
        pedidoEstaAtivo(pedido.status)
      ),
  );
};

export const listarCouriersPorSlug = async (
  slug: string,
): Promise<Courier[]> => {
  const restaurant = await buscarRestaurantePorSlug(slug);

  if (!restaurant) {
    return [];
  }

  return db
    .select()
    .from(couriersTable)
    .where(
      and(
        eq(couriersTable.restaurantId, restaurant.id),
        eq(couriersTable.isActive, true),
      ),
    )
    .orderBy(asc(couriersTable.name));
};

export const buscarPedidoParaRastreamento = async (orderId: number) => {
  const pedido = await db.query.ordersTable.findFirst({
    where: eq(ordersTable.id, orderId),
    with: {
      restaurant: true,
      courier: true,
    },
  });

  return pedido;
};

export const listarGarconsPorSlug = async (slug: string): Promise<Waiter[]> => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];
  return db
    .select()
    .from(waitersTable)
    .where(eq(waitersTable.restaurantId, restaurant.id))
    .orderBy(asc(waitersTable.name));
};

export const listarReservasPorSlug = async (slug: string): Promise<TableReservation[]> => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];
  return db
    .select()
    .from(tableReservationsTable)
    .where(eq(tableReservationsTable.restaurantId, restaurant.id))
    .orderBy(asc(tableReservationsTable.scheduledFor));
};

export const listarFilaEsperaPorSlug = async (slug: string): Promise<WaitingQueueEntry[]> => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];
  return db
    .select()
    .from(waitingQueueTable)
    .where(
      and(
        eq(waitingQueueTable.restaurantId, restaurant.id),
        eq(waitingQueueTable.status, "WAITING"),
      ),
    )
    .orderBy(asc(waitingQueueTable.position));
};

export const listarComandasAvulsasPorSlug = async (
  slug: string,
): Promise<ComandaAvulsaComPedido[]> => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];

  const comandas = await db
    .select()
    .from(comandasAvulsasTable)
    .where(
      and(
        eq(comandasAvulsasTable.restaurantId, restaurant.id),
        eq(comandasAvulsasTable.status, "ACTIVE"),
      ),
    )
    .orderBy(asc(comandasAvulsasTable.numero));

  const results: ComandaAvulsaComPedido[] = await Promise.all(
    comandas.map(async (comanda) => {
      const order = comanda.orderId
        ? await buscarPedidoRecebimentoPorId(comanda.orderId)
        : null;
      return { ...comanda, order };
    }),
  );

  return results;
};

export interface TransferirItensInput {
  sourceOrderId: number;
  destinationOrderId: number;
  orderProductIds: string[];
}

export const transferirItensComanda = async ({
  sourceOrderId,
  destinationOrderId,
  orderProductIds,
}: TransferirItensInput): Promise<void> => {
  if (orderProductIds.length === 0) return;

  await db.transaction(async (tx) => {
    const items = await tx
      .select()
      .from(orderProductsTable)
      .where(
        and(
          eq(orderProductsTable.orderId, sourceOrderId),
          inArray(orderProductsTable.id, orderProductIds),
        ),
      );

    if (items.length === 0) return;

    const transferredTotal = items.reduce((acc, item) => acc + item.lineTotal, 0);

    for (const item of items) {
      await tx
        .update(orderProductsTable)
        .set({ orderId: destinationOrderId, updatedAt: new Date() })
        .where(eq(orderProductsTable.id, item.id));
    }

    const [srcItems] = await tx
      .select({ total: sql<number>`COALESCE(SUM(${orderProductsTable.lineTotal}),0)` })
      .from(orderProductsTable)
      .where(eq(orderProductsTable.orderId, sourceOrderId));

    await tx
      .update(ordersTable)
      .set({
        total: Number((srcItems?.total ?? 0).toFixed(2)),
        subtotal: Number((srcItems?.total ?? 0).toFixed(2)),
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, sourceOrderId));

    const [dstItems] = await tx
      .select({ total: sql<number>`COALESCE(SUM(${orderProductsTable.lineTotal}),0)` })
      .from(orderProductsTable)
      .where(eq(orderProductsTable.orderId, destinationOrderId));

    await tx
      .update(ordersTable)
      .set({
        total: Number((dstItems?.total ?? 0).toFixed(2)),
        subtotal: Number((dstItems?.total ?? 0).toFixed(2)),
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, destinationOrderId));
  });
};

export interface UnirMesasInput {
  mainOrderId: number;
  secondaryOrderId: number;
}

export const unirMesas = async ({ mainOrderId, secondaryOrderId }: UnirMesasInput): Promise<void> => {
  await db.transaction(async (tx) => {
    await tx
      .update(orderProductsTable)
      .set({ orderId: mainOrderId, updatedAt: new Date() })
      .where(eq(orderProductsTable.orderId, secondaryOrderId));

    const [mainItems] = await tx
      .select({ total: sql<number>`COALESCE(SUM(${orderProductsTable.lineTotal}),0)` })
      .from(orderProductsTable)
      .where(eq(orderProductsTable.orderId, mainOrderId));

    await tx
      .update(ordersTable)
      .set({
        total: Number((mainItems?.total ?? 0).toFixed(2)),
        subtotal: Number((mainItems?.total ?? 0).toFixed(2)),
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, mainOrderId));

    await tx
      .update(ordersTable)
      .set({
        status: "FINISHED",
        paymentStatus: "PAID",
        diningTableId: null,
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, secondaryOrderId));
  });
};

export const buscarProdutosPorCategoria = async (
  categoryId: string,
  restaurantId: string,
): Promise<Product[]> => {
  return db
    .select()
    .from(productsTable)
    .where(
      and(
        eq(productsTable.menuCategoryId, categoryId),
        eq(productsTable.restaurantId, restaurantId),
        eq(productsTable.isActive, true),
      ),
    )
    .orderBy(asc(productsTable.name));
};

export const buscarUltimoPedidoPorTelefone = async (
  customerPhone: string,
  restaurantId: string,
): Promise<OrderComItens | null> => {
  const [pedido] = await db
    .select({
      order: ordersTable,
      restaurant: {
        name: restaurantsTable.name,
        avatarImageUrl: restaurantsTable.avatarImageUrl,
        slug: restaurantsTable.slug,
      },
      diningTable: {
        id: diningTablesTable.id,
        name: diningTablesTable.name,
        seats: diningTablesTable.seats,
      },
      courier: {
        id: couriersTable.id,
        name: couriersTable.name,
        phone: couriersTable.phone,
      },
    })
    .from(ordersTable)
    .innerJoin(restaurantsTable, eq(restaurantsTable.id, ordersTable.restaurantId))
    .leftJoin(diningTablesTable, eq(diningTablesTable.id, ordersTable.diningTableId))
    .leftJoin(couriersTable, eq(couriersTable.id, ordersTable.courierId))
    .where(
      and(
        eq(ordersTable.customerPhone, customerPhone),
        eq(ordersTable.restaurantId, restaurantId),
        eq(ordersTable.status, "FINISHED"),
      ),
    )
    .orderBy(desc(ordersTable.createdAt))
    .limit(1);

  if (!pedido) return null;

  const itens = await db
    .select({
      orderId: orderProductsTable.orderId,
      orderProduct: orderProductsTable,
      product: productsTable,
    })
    .from(orderProductsTable)
    .innerJoin(productsTable, eq(productsTable.id, orderProductsTable.productId))
    .where(eq(orderProductsTable.orderId, pedido.order.id));

  const orderProductIds = itens.map((i) => i.orderProduct.id);
  const options = orderProductIds.length > 0
    ? await db
        .select()
        .from(orderProductOptionsTable)
        .where(inArray(orderProductOptionsTable.orderProductId, orderProductIds))
    : [];

  const optionsMap = new Map<string, OrderProductOption[]>();
  options.forEach((opt) => {
    const list = optionsMap.get(opt.orderProductId) ?? [];
    list.push(opt);
    optionsMap.set(opt.orderProductId, list);
  });

  const pedidoNormalizado = {
    ...pedido.order,
    restaurant: pedido.restaurant,
    diningTable: pedido.diningTable ?? null,
    courier: pedido.courier ?? null,
    orderProducts: itens.map((item) => ({
      ...item.orderProduct,
      product: item.product,
      orderProductOptions: optionsMap.get(item.orderProduct.id) ?? [],
    })),
  };

  return pedidoNormalizado as OrderComItens;
};

export interface CriarRegraFreteInput {
  restaurantId: string;
  name: string;
  type: "RADIUS_KM" | "NEIGHBORHOOD" | "CEP_RANGE";
  fee: number;
  minimumOrderValue?: number;
  freeDeliveryThreshold?: number | null;
  maxDistanceKm?: number | null;
  neighborhood?: string | null;
  cepFrom?: string | null;
  cepTo?: string | null;
  displayOrder?: number;
}

export const buscarRegrasFreteAtivas = async (restaurantId: string): Promise<DeliveryFeeRule[]> => {
  return db
    .select()
    .from(deliveryFeeRulesTable)
    .where(eq(deliveryFeeRulesTable.restaurantId, restaurantId))
    .orderBy(asc(deliveryFeeRulesTable.displayOrder));
};

export const criarRegraFrete = async (input: CriarRegraFreteInput): Promise<DeliveryFeeRule> => {
  const [rule] = await db.insert(deliveryFeeRulesTable).values(input).returning();
  if (!rule) throw new Error("Falha ao criar regra de frete.");
  return rule;
};

export const atualizarRegraFrete = async (
  id: string,
  data: Partial<CriarRegraFreteInput>,
): Promise<DeliveryFeeRule> => {
  const [rule] = await db
    .update(deliveryFeeRulesTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(deliveryFeeRulesTable.id, id))
    .returning();
  if (!rule) throw new Error("Regra de frete não encontrada.");
  return rule;
};

export const excluirRegraFrete = async (id: string): Promise<void> => {
  await db.delete(deliveryFeeRulesTable).where(eq(deliveryFeeRulesTable.id, id));
};

export const buscarPedidosParaEntregador = async (courierId: string) => {
  const courier = await db.select().from(couriersTable).where(eq(couriersTable.id, courierId)).limit(1);
  if (!courier[0]) return [];

  return db
    .select({
      id: ordersTable.id,
      customerName: ordersTable.customerName,
      deliveryAddress: ordersTable.deliveryAddress,
      deliveryLatitude: ordersTable.deliveryLatitude,
      deliveryLongitude: ordersTable.deliveryLongitude,
      total: ordersTable.total,
      status: ordersTable.status,
      courierId: ordersTable.courierId,
      createdAt: ordersTable.createdAt,
    })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.restaurantId, courier[0].restaurantId),
        eq(ordersTable.consumptionMethod, "DELIVERY"),
        eq(ordersTable.status, "READY_FOR_PICKUP"),
      ),
    )
    .orderBy(asc(ordersTable.createdAt));
};

export const atualizarLocalizacaoEntregador = async (
  courierId: string,
  latitude: number,
  longitude: number,
): Promise<void> => {
  await db
    .update(couriersTable)
    .set({ latitude, longitude, updatedAt: new Date() })
    .where(eq(couriersTable.id, courierId));
};

export const registrarComprovanteEntrega = async (
  orderId: number,
  proofUrl: string,
  latitude?: number,
  longitude?: number,
): Promise<void> => {
  await db
    .update(ordersTable)
    .set({
      deliveryProofUrl: proofUrl,
      deliveryConfirmationLatitude: latitude,
      deliveryConfirmationLongitude: longitude,
      status: "FINISHED",
      deliveredAt: new Date(),
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(ordersTable.id, orderId));
};

export interface CriarViagemMotoboyInput {
  restaurantId: string;
  courierId: string;
  orderIds: number[];
  commissionAmount?: number;
}

export const criarViagemMotoboy = async (input: CriarViagemMotoboyInput): Promise<CourierTrip> => {
  const [trip] = await db
    .insert(courierTripsTable)
    .values({
      restaurantId: input.restaurantId,
      courierId: input.courierId,
      orderIds: input.orderIds,
      commissionAmount: input.commissionAmount ?? 0,
      status: "IN_TRANSIT",
    })
    .returning();
  if (!trip) throw new Error("Falha ao criar viagem.");
  return trip;
};

export const concluirViagemMotoboy = async (tripId: string): Promise<void> => {
  await db
    .update(courierTripsTable)
    .set({ status: "COMPLETED", returnedAt: new Date(), updatedAt: new Date() })
    .where(eq(courierTripsTable.id, tripId));
};

export const buscarIntegracaoMarketplace = async (
  restaurantId: string,
  type: MarketplaceType,
): Promise<MarketplaceIntegration | null> => {
  const [integration] = await db
    .select()
    .from(marketplaceIntegrationsTable)
    .where(
      and(
        eq(marketplaceIntegrationsTable.restaurantId, restaurantId),
        eq(marketplaceIntegrationsTable.type, type),
      ),
    )
    .limit(1);
  return integration ?? null;
};

export const salvarIntegracaoMarketplace = async (
  restaurantId: string,
  type: MarketplaceType,
  data: { apiToken?: string; merchantId?: string; isActive?: boolean; menuMappings?: Record<string, string> },
): Promise<MarketplaceIntegration> => {
  const values = { restaurantId, type, ...data, updatedAt: new Date() };
  const [integration] = await db
    .insert(marketplaceIntegrationsTable)
    .values(values)
    .onConflictDoUpdate({
      target: [marketplaceIntegrationsTable.restaurantId, marketplaceIntegrationsTable.type],
      set: { ...data, updatedAt: new Date() },
    })
    .returning();
  if (!integration) throw new Error("Falha ao salvar integração.");
  return integration;
};

export const listarSetoresProducaoPorSlug = async (
  slug: string,
): Promise<ProductionSector[]> => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];

  return db
    .select()
    .from(productionSectorsTable)
    .where(eq(productionSectorsTable.restaurantId, restaurant.id))
    .orderBy(asc(productionSectorsTable.displayOrder), asc(productionSectorsTable.name));
};

export const atualizarStatusItemPedido = async ({
  itemId,
  itemStatus,
}: {
  itemId: string;
  itemStatus: OrderProductItemStatus;
}): Promise<OrderProduct | null> => {
  const [updated] = await db
    .update(orderProductsTable)
    .set({ itemStatus, updatedAt: new Date() })
    .where(eq(orderProductsTable.id, itemId))
    .returning();
  return updated ?? null;
};

export const despacharPedido = async ({
  orderId,
  courierId,
}: DespacharPedidoInput): Promise<
  (AtualizacaoPedidoBase & { courierId: string; dispatchedAt: Date }) | null
> => {
  const [updatedOrder] = await db
    .update(ordersTable)
    .set({
      courierId,
      status: "OUT_FOR_DELIVERY",
      dispatchedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(ordersTable.id, orderId))
    .returning({
      id: ordersTable.id,
      courierId: ordersTable.courierId,
      dispatchedAt: ordersTable.dispatchedAt,
      restaurantId: ordersTable.restaurantId,
    });

  if (!updatedOrder || !updatedOrder.courierId || !updatedOrder.dispatchedAt) {
    return null;
  }

  const restaurantSlug = await resolverSlugRestaurante(updatedOrder.restaurantId);

  if (!restaurantSlug) {
    return null;
  }

  return {
    id: updatedOrder.id,
    courierId: updatedOrder.courierId,
    dispatchedAt: updatedOrder.dispatchedAt,
    restaurantSlug,
  };
};

// ─── Contas Bancárias ─────────────────────────────────────────────────────────

export const listarContasBancariasPorSlug = async (slug: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];
  return db
    .select()
    .from(bankAccountsTable)
    .where(eq(bankAccountsTable.restaurantId, restaurant.id))
    .orderBy(asc(bankAccountsTable.name));
};

export const criarContaBancaria = async (
  input: Omit<typeof bankAccountsTable.$inferInsert, "id" | "createdAt" | "updatedAt">,
) => {
  const [account] = await db.insert(bankAccountsTable).values(input).returning();
  if (!account) throw new Error("Falha ao criar conta bancária.");
  return account;
};

export const atualizarContaBancaria = async (
  id: string,
  data: Partial<Omit<typeof bankAccountsTable.$inferInsert, "id" | "restaurantId" | "createdAt">>,
) => {
  const [account] = await db
    .update(bankAccountsTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(bankAccountsTable.id, id))
    .returning();
  if (!account) throw new Error("Conta bancária não encontrada.");
  return account;
};

export const excluirContaBancaria = async (id: string) => {
  await db.delete(bankAccountsTable).where(eq(bankAccountsTable.id, id));
};

// ─── Configurações Fiscais ────────────────────────────────────────────────────

export const buscarConfiguracoesFiscaisPorSlug = async (slug: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return null;
  const [settings] = await db
    .select()
    .from(fiscalSettingsTable)
    .where(eq(fiscalSettingsTable.restaurantId, restaurant.id))
    .limit(1);
  return settings ?? null;
};

export const salvarConfiguracoesFiscais = async (
  restaurantId: string,
  data: Omit<typeof fiscalSettingsTable.$inferInsert, "id" | "restaurantId" | "createdAt" | "updatedAt">,
) => {
  const [settings] = await db
    .insert(fiscalSettingsTable)
    .values({ restaurantId, ...data })
    .onConflictDoUpdate({
      target: fiscalSettingsTable.restaurantId,
      set: { ...data, updatedAt: new Date() },
    })
    .returning();
  if (!settings) throw new Error("Falha ao salvar configurações fiscais.");
  return settings;
};

export const atualizarStatusFiscalPedido = async (
  orderId: number,
  data: {
    nfeStatus?: "PENDING" | "ISSUED" | "REJECTED" | "CANCELLED";
    nfeAccessKey?: string | null;
    nfeDanfeUrl?: string | null;
    nfeRejectionReason?: string | null;
  },
) => {
  await db
    .update(ordersTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(ordersTable.id, orderId));
};

// ─── Livro de Fiados ─────────────────────────────────────────────────────────

export const listarFiadosPorSlug = async (slug: string) => {
  const restaurant = await buscarRestaurantePorSlug(slug);
  if (!restaurant) return [];
  return db
    .select()
    .from(customerLedgersTable)
    .where(
      and(
        eq(customerLedgersTable.restaurantId, restaurant.id),
        eq(customerLedgersTable.isActive, true),
      ),
    )
    .orderBy(asc(customerLedgersTable.customerName));
};

export const criarFiado = async (
  input: Omit<typeof customerLedgersTable.$inferInsert, "id" | "createdAt" | "updatedAt" | "debtBalance">,
) => {
  const [ledger] = await db.insert(customerLedgersTable).values({ ...input, debtBalance: 0 }).returning();
  if (!ledger) throw new Error("Falha ao criar cadastro de fiado.");
  return ledger;
};

export const atualizarFiado = async (
  id: string,
  data: Partial<Pick<typeof customerLedgersTable.$inferInsert, "customerName" | "customerPhone" | "customerCpf" | "creditLimit" | "isActive" | "notes">>,
) => {
  const [ledger] = await db
    .update(customerLedgersTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(customerLedgersTable.id, id))
    .returning();
  if (!ledger) throw new Error("Fiado não encontrado.");
  return ledger;
};

export const listarLancamentosFiado = async (ledgerId: string) => {
  return db
    .select()
    .from(customerLedgerEntriesTable)
    .where(eq(customerLedgerEntriesTable.ledgerId, ledgerId))
    .orderBy(desc(customerLedgerEntriesTable.createdAt));
};

export const registrarDebitoFiado = async (input: {
  ledgerId: string;
  restaurantId: string;
  orderId: number;
  amount: number;
  description: string;
}) => {
  return db.transaction(async (tx) => {
    const [entry] = await tx
      .insert(customerLedgerEntriesTable)
      .values({ ...input, type: "DEBIT" })
      .returning();

    await tx
      .update(customerLedgersTable)
      .set({
        debtBalance: sql`${customerLedgersTable.debtBalance} + ${input.amount}`,
        updatedAt: new Date(),
      })
      .where(eq(customerLedgersTable.id, input.ledgerId));

    return entry;
  });
};

export const registrarPagamentoFiado = async (input: {
  ledgerId: string;
  restaurantId: string;
  bankAccountId?: string;
  amount: number;
  description: string;
}) => {
  return db.transaction(async (tx) => {
    const [entry] = await tx
      .insert(customerLedgerEntriesTable)
      .values({ ...input, type: "CREDIT" })
      .returning();

    await tx
      .update(customerLedgersTable)
      .set({
        debtBalance: sql`GREATEST(0, ${customerLedgersTable.debtBalance} - ${input.amount})`,
        updatedAt: new Date(),
      })
      .where(eq(customerLedgersTable.id, input.ledgerId));

    if (input.bankAccountId) {
      await tx
        .update(bankAccountsTable)
        .set({
          currentBalance: sql`${bankAccountsTable.currentBalance} + ${input.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(bankAccountsTable.id, input.bankAccountId));
    }

    return entry;
  });
};

// ─── Conciliação Bancária (OFX) ───────────────────────────────────────────────

export const criarExtratoImportado = async (input: {
  restaurantId: string;
  bankAccountId: string;
  fileName: string;
  periodStart?: string;
  periodEnd?: string;
  totalEntries: number;
}) => {
  const [statement] = await db.insert(bankStatementsTable).values(input).returning();
  if (!statement) throw new Error("Falha ao importar extrato.");
  return statement;
};

export const listarExtratosPorConta = async (bankAccountId: string) => {
  return db
    .select()
    .from(bankStatementsTable)
    .where(eq(bankStatementsTable.bankAccountId, bankAccountId))
    .orderBy(desc(bankStatementsTable.createdAt));
};

export const criarLinhasExtrato = async (
  entries: Array<Omit<typeof bankStatementEntriesTable.$inferInsert, "id" | "createdAt" | "updatedAt">>,
) => {
  if (entries.length === 0) return [];
  return db.insert(bankStatementEntriesTable).values(entries).returning();
};

export const listarLinhasExtrato = async (statementId: string) => {
  return db
    .select()
    .from(bankStatementEntriesTable)
    .where(eq(bankStatementEntriesTable.statementId, statementId))
    .orderBy(asc(bankStatementEntriesTable.entryDate));
};

export const vincularLinhaExtratoTransacao = async (
  entryId: string,
  transactionId: string | null,
) => {
  const [entry] = await db
    .update(bankStatementEntriesTable)
    .set({
      matchedTransactionId: transactionId,
      status: transactionId ? "MATCHED" : "PENDING",
      updatedAt: new Date(),
    })
    .where(eq(bankStatementEntriesTable.id, entryId))
    .returning();

  if (entry && transactionId) {
    await db
      .update(bankStatementsTable)
      .set({
        matchedEntries: sql`${bankStatementsTable.matchedEntries} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(bankStatementsTable.id, entry.statementId));
  }

  return entry ?? null;
};

export const ignorarLinhaExtrato = async (entryId: string) => {
  await db
    .update(bankStatementEntriesTable)
    .set({ status: "IGNORED", updatedAt: new Date() })
    .where(eq(bankStatementEntriesTable.id, entryId));
};

// ─── Handoff Bot ──────────────────────────────────────────────────────────────

export const pausarBot = async (restaurantId: string, customerPhone: string): Promise<void> => {
  await db
    .update(aiSettingsTable)
    .set({
      isBotPaused: true,
      pausedAt: new Date(),
      pausedForPhone: customerPhone,
      conversationStatus: "HUMAN_REQUIRED",
      updatedAt: new Date(),
    })
    .where(eq(aiSettingsTable.restaurantId, restaurantId));
};

export const reativarBot = async (restaurantId: string): Promise<void> => {
  await db
    .update(aiSettingsTable)
    .set({
      isBotPaused: false,
      pausedAt: null,
      pausedForPhone: null,
      conversationStatus: "BOT_ACTIVE",
      updatedAt: new Date(),
    })
    .where(eq(aiSettingsTable.restaurantId, restaurantId));
};

export const buscarStatusHandoff = async (restaurantId: string) => {
  const [settings] = await db
    .select({
      isBotPaused: aiSettingsTable.isBotPaused,
      pausedAt: aiSettingsTable.pausedAt,
      pausedForPhone: aiSettingsTable.pausedForPhone,
      conversationStatus: aiSettingsTable.conversationStatus,
    })
    .from(aiSettingsTable)
    .where(eq(aiSettingsTable.restaurantId, restaurantId))
    .limit(1);
  return settings ?? null;
};

// ─── Marketing Spend ──────────────────────────────────────────────────────────

export interface CriarGastoMarketingInput {
  restaurantId: string;
  referenceMonth: string; // YYYY-MM-DD (dia sempre 01)
  channel: "META_ADS" | "GOOGLE_ADS" | "OTHER";
  amountSpent: number;
  notes?: string;
}

export const criarGastoMarketing = async (
  input: CriarGastoMarketingInput,
): Promise<void> => {
  await db.insert(marketingSpendTable).values(input);
};

export const listarGastosMarketing = async (restaurantId: string) => {
  return db
    .select()
    .from(marketingSpendTable)
    .where(eq(marketingSpendTable.restaurantId, restaurantId))
    .orderBy(sql`${marketingSpendTable.referenceMonth} desc`);
};

export const excluirGastoMarketing = async (id: string): Promise<void> => {
  await db.delete(marketingSpendTable).where(eq(marketingSpendTable.id, id));
};
