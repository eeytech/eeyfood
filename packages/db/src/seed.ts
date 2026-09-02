import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "./client";
import {
  abandonedCartsTable,
  aiSettingsTable,
  bankAccountsTable,
  bankStatementEntriesTable,
  bankStatementsTable,
  cashMovementsTable,
  cashRegisterShiftsTable,
  comandasAvulsasTable,
  commissionRulesTable,
  companyVehiclesTable,
  couriersTable,
  courierTripsTable,
  couponsTable,
  customerInteractionsTable,
  customerLedgerEntriesTable,
  customerLedgersTable,
  customersTable,
  deliveryFeeRulesTable,
  diningTablesTable,
  financialCategoriesTable,
  financialClosingsTable,
  financialTransactionsTable,
  fiscalSettingsTable,
  inventoryBatchesTable,
  inventoryItemsTable,
  inventoryLossesTable,
  loyaltyPrizesTable,
  loyaltyRulesTable,
  marketingSettingsTable,
  marketingSpendTable,
  marketplaceIntegrationsTable,
  menuCategoriesTable,
  operatingHoursTable,
  orderProductOptionsTable,
  orderProductsTable,
  orderRatingsTable,
  ordersTable,
  productionSectorsTable,
  productOptionGroupsTable,
  productOptionsTable,
  productSizePricesTable,
  productsTable,
  productToOptionGroupsTable,
  purchaseInvoicesTable,
  recipeItemsTable,
  restaurantsTable,
  stockMovementsTable,
  suppliersTable,
  tableReservationsTable,
  tipClosingsTable,
  usersTable,
  waitersTable,
  waitingQueueTable,
  walletsTable,
} from "./schema";

// ─── helpers ──────────────────────────────────────────────────────────────────

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

const dateStr = (d: Date) => d.toISOString().split("T")[0]!;

// ─── seed ─────────────────────────────────────────────────────────────────────

const main = async () => {
  await db.transaction(async (tx) => {
    // ── LIMPEZA (filhos → pais) ───────────────────────────────────────────────

    process.stdout.write("🧹 Limpando banco de dados...\n");

    const tablenamesResult = await tx.execute<{ tablename: string }>(
      sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '__drizzle%'`
    );
    const tableNames = tablenamesResult.rows
      .map((r) => `"${r.tablename}"`)
      .join(", ");

    if (tableNames.length > 0) {
      await tx.execute(sql.raw(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`));
    }

    process.stdout.write("✅ Banco limpo.\n");

    // ── MÓDULO A: RESTAURANTE E USUÁRIOS ──────────────────────────────────────

    process.stdout.write("🍔 [A] Criando restaurante e usuários...\n");

    const [restaurant] = await tx
      .insert(restaurantsTable)
      .values({
        id: "6b737e3b-470d-4f05-bf7f-8a72f63b36d5",
        name: "Empresa Demonstrativa eeyFood",
        slug: "burger-craft-sp",
        description: "Hambúrgueres artesanais no coração de São Paulo.",
        avatarImageUrl:
          "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQvcNP9rHlEJu1vCY5kLqzjf29HKaeN78Z6pRy",
        coverImageUrl:
          "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQac8bHYlkBUjlHSKiuseLm2hIFzVY0OtxEPnw",
        status: "AUTO",
        cashbackPercent: 2,
        acceptMercadoPago: true,
        isCouponsEnabled: true,
        isCashbackEnabled: true,
        isDeliveryEnabled: true,
        isTakeawayEnabled: true,
        isDineInEnabled: true,
        cnpj: "12.345.678/0001-90",
        phone: "(11) 3456-7890",
        address: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-100",
        latitude: -23.5617,
        longitude: -46.6564,
        deliveryFee: 5.9,
        minimumOrderValue: 25,
        freeDeliveryThreshold: 80,
        estimatedDeliveryTime: "30-45 min",
        pizzaPricingRule: "MAX",
      })
      .returning();

    const defaultPasswordHash = bcrypt.hashSync("admin123", 10);

    await tx.insert(usersTable).values([
      {
        name: "Super Administrador",
        email: "admin@eeyfood.com",
        passwordHash: defaultPasswordHash,
        role: "SUPER_ADMIN",
        restaurantId: null,
      },
      {
        name: "Gerente Donalds",
        email: "gerente@donalds.com",
        passwordHash: defaultPasswordHash,
        role: "ADMIN",
        restaurantId: restaurant.id,
      },
    ]);

    process.stdout.write("🔑 [Auth] Usuários iniciais criados (admin@eeyfood.com / gerente@donalds.com).\n");

    await tx.insert(operatingHoursTable).values([
      { restaurantId: restaurant.id, dayOfWeek: 0, openTime: "11:00", closeTime: "22:00" },
      { restaurantId: restaurant.id, dayOfWeek: 1, openTime: "11:00", closeTime: "23:00" },
      { restaurantId: restaurant.id, dayOfWeek: 2, openTime: "11:00", closeTime: "23:00" },
      { restaurantId: restaurant.id, dayOfWeek: 3, openTime: "11:00", closeTime: "23:00" },
      { restaurantId: restaurant.id, dayOfWeek: 4, openTime: "11:00", closeTime: "23:00" },
      { restaurantId: restaurant.id, dayOfWeek: 5, openTime: "11:00", closeTime: "00:00" },
      { restaurantId: restaurant.id, dayOfWeek: 6, openTime: "11:00", closeTime: "00:00" },
    ]);

    await tx.insert(fiscalSettingsTable).values({
      restaurantId: restaurant.id,
      cnpj: "12.345.678/0001-90",
      inscricaoEstadual: "123.456.789.000",
      ambienteFiscal: "homologacao",
      serieNfe: "001",
      proximoNumeroNfe: 1,
      serieNfce: "001",
      proximoNumeroNfce: 1,
      focusNfeToken: "homologacao_token_ficticio_1234567890",
    });

    await tx.insert(aiSettingsTable).values({
      restaurantId: restaurant.id,
      openaiApiKey: "sk-test-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      evolutionInstanceName: "burgercraft-bot",
      evolutionApiKey: "evol_api_key_ficticio_9876543210",
      botName: "Craft Bot",
      systemPrompt:
        "Você é o Craft Bot, atendente virtual da Burger Craft SP. Seja simpático e objetivo. " +
        "Cardápio principal: Big Craft R$35, Duplo Costela R$42, Frango Crispy R$32, " +
        "Combo Clássico R$52, Fritas G R$14, Fritas P R$8, Coca-Cola R$6, Água R$4. " +
        "Capture nome, telefone e endereço para delivery. Confirme o pedido antes de finalizar.",
      isBotActive: true,
      isBotPaused: false,
      conversationStatus: "BOT_ACTIVE",
    });

    await tx.insert(marketingSettingsTable).values({
      restaurantId: restaurant.id,
      metaPixelId: "123456789012345",
      ga4MeasurementId: "G-XXXXXXXXXX",
      gtmContainerId: "GTM-XXXXXXX",
      abandonedCartEnabled: true,
      abandonedCartDelayMinutes: 60,
      abandonedCartCouponPercent: 10,
    });

    process.stdout.write("✅ [A] Restaurante criado.\n");

    // ── MÓDULO B: LOGÍSTICA, INTEGRAÇÕES E MESAS ─────────────────────────────

    process.stdout.write("🚚 [B] Criando logística, integrações e mesas...\n");

    await tx.insert(deliveryFeeRulesTable).values([
      {
        restaurantId: restaurant.id,
        name: "Raio até 3 km",
        type: "RADIUS_KM",
        fee: 5.9,
        maxDistanceKm: 3,
        minimumOrderValue: 0,
        isActive: true,
        displayOrder: 1,
      },
      {
        restaurantId: restaurant.id,
        name: "Raio de 3 a 8 km",
        type: "RADIUS_KM",
        fee: 9.9,
        maxDistanceKm: 8,
        minimumOrderValue: 0,
        isActive: true,
        displayOrder: 2,
      },
      {
        restaurantId: restaurant.id,
        name: "Bairro Pinheiros",
        type: "NEIGHBORHOOD",
        fee: 7.9,
        neighborhood: "Pinheiros",
        minimumOrderValue: 0,
        freeDeliveryThreshold: 100,
        isActive: true,
        displayOrder: 3,
      },
    ]);

    await tx.insert(marketplaceIntegrationsTable).values({
      restaurantId: restaurant.id,
      type: "IFOOD",
      isActive: true,
      apiToken: "ifood_access_token_ficticio_abcdef123456",
      merchantId: "merchant-uuid-ifood-ficticio-9876",
      menuMappings: {
        "big-craft-sp": "prod-001",
        "duplo-costela": "prod-002",
        "frango-crispy": "prod-003",
        "coca-cola-lata": "prod-010",
      },
    });

    const [mesa1, mesa2, mesa3, mesa4, mesa5, mesa6] = await tx
      .insert(diningTablesTable)
      .values([
        { restaurantId: restaurant.id, name: "Mesa 01", seats: 4, displayOrder: 1, minimumConsumption: 40, positionX: 100, positionY: 100 },
        { restaurantId: restaurant.id, name: "Mesa 02", seats: 4, displayOrder: 2, minimumConsumption: 40, positionX: 260, positionY: 100 },
        { restaurantId: restaurant.id, name: "Mesa 03", seats: 6, displayOrder: 3, minimumConsumption: 60, positionX: 420, positionY: 100 },
        { restaurantId: restaurant.id, name: "Mesa 04", seats: 2, displayOrder: 4, minimumConsumption: 20, positionX: 100, positionY: 280 },
        { restaurantId: restaurant.id, name: "Mesa 05", seats: 4, displayOrder: 5, minimumConsumption: 40, positionX: 260, positionY: 280 },
        { restaurantId: restaurant.id, name: "Varanda VIP", seats: 8, displayOrder: 6, minimumConsumption: 80, positionX: 420, positionY: 280 },
      ])
      .returning();

    await tx.insert(tableReservationsTable).values([
      {
        restaurantId: restaurant.id,
        diningTableId: mesa3.id,
        customerName: "Ana Lima",
        customerPhone: "11911112222",
        partySize: 5,
        scheduledFor: daysFromNow(1),
        status: "CONFIRMED",
        notes: "Aniversário. Não trazer bolo surpresa antes das 20h.",
      },
      {
        restaurantId: restaurant.id,
        diningTableId: mesa6.id,
        customerName: "Ricardo Prado",
        customerPhone: "11922223333",
        partySize: 7,
        scheduledFor: daysFromNow(3),
        status: "PENDING",
        notes: "Reunião corporativa. Preferência por mesa reservada.",
      },
      {
        restaurantId: restaurant.id,
        diningTableId: mesa2.id,
        customerName: "Beatriz Souza",
        customerPhone: "11933334444",
        partySize: 2,
        scheduledFor: daysAgo(1),
        status: "FINISHED",
      },
    ]);

    await tx.insert(waitingQueueTable).values([
      {
        restaurantId: restaurant.id,
        position: 1,
        customerName: "Carlos Mendes",
        partySize: 3,
        arrivedAt: new Date(),
        status: "WAITING",
      },
      {
        restaurantId: restaurant.id,
        position: 2,
        customerName: "Fernanda Costa",
        partySize: 2,
        arrivedAt: new Date(),
        status: "CALLED",
      },
      {
        restaurantId: restaurant.id,
        position: 3,
        customerName: "Paulo Araujo",
        partySize: 4,
        arrivedAt: new Date(),
        status: "SEATED",
        diningTableId: mesa4.id,
        seatedAt: new Date(),
      },
    ]);

    process.stdout.write("✅ [B] Logística, integrações e mesas criadas.\n");

    // ── MÓDULO C: CARDÁPIO E PRODUÇÃO ─────────────────────────────────────────

    process.stdout.write("🍕 [C] Criando setores, cardápio e opcionais...\n");

    const [sectorQuente, , sectorBar] = await tx
      .insert(productionSectorsTable)
      .values([
        { restaurantId: restaurant.id, name: "Cozinha Quente", color: "#ef4444", displayOrder: 1 },
        { restaurantId: restaurant.id, name: "Cozinha Fria/Saladas", color: "#22c55e", displayOrder: 2 },
        { restaurantId: restaurant.id, name: "Copa/Bar", color: "#3b82f6", displayOrder: 3 },
      ])
      .returning();

    const [catCombos, catLanches, catPizzas, catFritas, catBebidas, catSobremesas] = await tx
      .insert(menuCategoriesTable)
      .values([
        { restaurantId: restaurant.id, name: "Combos", displayOrder: 1 },
        { restaurantId: restaurant.id, name: "Lanches", displayOrder: 2 },
        { restaurantId: restaurant.id, name: "Pizzas", displayOrder: 3, isPizzaCategory: true },
        { restaurantId: restaurant.id, name: "Fritas", displayOrder: 4 },
        { restaurantId: restaurant.id, name: "Bebidas", displayOrder: 5 },
        { restaurantId: restaurant.id, name: "Sobremesas", displayOrder: 6 },
      ])
      .returning();

    const [grpPonto, grpAdicionais, grpBebida, grpBorda] = await tx
      .insert(productOptionGroupsTable)
      .values([
        { restaurantId: restaurant.id, name: "Ponto do Hambúrguer", minOptions: 1, maxOptions: 1, displayOrder: 1 },
        { restaurantId: restaurant.id, name: "Ingredientes Adicionais", minOptions: 0, maxOptions: 5, displayOrder: 2 },
        { restaurantId: restaurant.id, name: "Bebida Acompanhante", minOptions: 0, maxOptions: 1, displayOrder: 3 },
        { restaurantId: restaurant.id, name: "Borda Recheada", minOptions: 0, maxOptions: 1, displayOrder: 4 },
      ])
      .returning();

    const [, optAoPonto] = await tx
      .insert(productOptionsTable)
      .values([
        { productOptionGroupId: grpPonto.id, name: "Bem Passado", price: 0, displayOrder: 1 },
        { productOptionGroupId: grpPonto.id, name: "Ao Ponto", price: 0, displayOrder: 2 },
        { productOptionGroupId: grpPonto.id, name: "Mal Passado", price: 0, displayOrder: 3 },
      ])
      .returning();

    await tx.insert(productOptionsTable).values([
      { productOptionGroupId: grpAdicionais.id, name: "Bacon Extra", price: 4.5, displayOrder: 1 },
      { productOptionGroupId: grpAdicionais.id, name: "Queijo Extra", price: 3.0, displayOrder: 2 },
      { productOptionGroupId: grpAdicionais.id, name: "Ovo Frito", price: 3.5, displayOrder: 3 },
      { productOptionGroupId: grpAdicionais.id, name: "Molho BBQ", price: 2.0, displayOrder: 4 },
      { productOptionGroupId: grpAdicionais.id, name: "Jalapeño", price: 2.0, displayOrder: 5 },
    ]);

    await tx.insert(productOptionsTable).values([
      { productOptionGroupId: grpBorda.id, name: "Catupiry Original", price: 8.0, displayOrder: 1 },
      { productOptionGroupId: grpBorda.id, name: "Cheddar Cremoso", price: 8.0, displayOrder: 2 },
      { productOptionGroupId: grpBorda.id, name: "Chocolate ao Leite", price: 10.0, displayOrder: 3 },
    ]);

    const [optCocaBebida] = await tx
      .insert(productOptionsTable)
      .values([
        { productOptionGroupId: grpBebida.id, name: "Coca-Cola Lata", price: 6.0, displayOrder: 1 },
        { productOptionGroupId: grpBebida.id, name: "Suco de Laranja", price: 9.0, displayOrder: 2 },
        { productOptionGroupId: grpBebida.id, name: "Água Mineral", price: 4.0, displayOrder: 3 },
      ])
      .returning();

    const [
      prodBigCraft,
      prodDuploCostela,
      prodFrangoChispy,
      prodComboClassico,
      prodComboFrango,
      prodFritasG,
      prodFritasP,
      prodCocaCola,
      ,
      ,
      ,
      prodPizzaCalabresa,
      prodPizzaMargherita,
      prodPizzaQuatroQueijos,
      prodPizzaFrangoCatupiry,
      prodPizzaPepperoni,
      prodPizzaPortuguesa,
    ] = await tx
      .insert(productsTable)
      .values([
        {
          restaurantId: restaurant.id,
          menuCategoryId: catLanches.id,
          productionSectorId: sectorQuente.id,
          name: "Big Craft",
          description:
            "180g de costela bovina, cheddar artesanal, alface, tomate, picles e molho especial no pão brioche.",
          price: 35.0,
          costPrice: 14.7,
          imageUrl:
            "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQKfI6fivqActTvBGLXfQe4a8CJ6d3HiR7USPK",
          ingredients: ["Pão brioche", "Hambúrguer costela 180g", "Cheddar artesanal", "Alface", "Tomate", "Picles", "Molho especial"],
          sku: "BCR-001",
          ncm: "16010090",
          cfop: "5102",
          csosn: "400",
          trackInventory: true,
          stockQuantity: 50,
          lowStockThreshold: 10,
        },
        {
          restaurantId: restaurant.id,
          menuCategoryId: catLanches.id,
          productionSectorId: sectorQuente.id,
          name: "Duplo Costela",
          description:
            "Dois discos de costela 180g, bacon crocante, cheddar duplo, cebola caramelizada e aioli trufado.",
          price: 42.0,
          costPrice: 17.64,
          imageUrl:
            "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQ99rtECuYaDgmA4VujBU0wKn2ThXJvF3LHfyc",
          ingredients: ["Pão brioche", "2x Hambúrguer costela 180g", "Bacon", "Cheddar duplo", "Cebola caramelizada", "Aioli trufado"],
          sku: "BCR-002",
          ncm: "16010090",
          cfop: "5102",
          csosn: "400",
          trackInventory: true,
          stockQuantity: 40,
          lowStockThreshold: 8,
        },
        {
          restaurantId: restaurant.id,
          menuCategoryId: catLanches.id,
          productionSectorId: sectorQuente.id,
          name: "Frango Crispy",
          description:
            "Filé de frango empanado crocante, maionese de alho, alface e tomate no pão brioche.",
          price: 32.0,
          costPrice: 13.44,
          imageUrl:
            "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQr12aTqPo3SsGjBJCaM7yhxnbDlXeL5N9dckv",
          ingredients: ["Pão brioche", "Filé frango empanado", "Maionese de alho", "Alface", "Tomate"],
          sku: "BCR-003",
          ncm: "16010090",
          cfop: "5102",
          csosn: "400",
          trackInventory: true,
          stockQuantity: 45,
          lowStockThreshold: 10,
        },
        {
          restaurantId: restaurant.id,
          menuCategoryId: catCombos.id,
          productionSectorId: sectorQuente.id,
          name: "Combo Clássico",
          description: "Big Craft + Fritas Grandes + Bebida à escolha.",
          price: 52.0,
          costPrice: 21.84,
          imageUrl:
            "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQaHB8tslkBUjlHSKiuseLm2hIFzVY0OtxEPnw",
          ingredients: ["Pão brioche", "Hambúrguer costela 180g", "Cheddar", "Batata frita", "Bebida"],
          sku: "CMB-001",
          trackInventory: false,
          stockQuantity: 0,
          lowStockThreshold: 0,
        },
        {
          restaurantId: restaurant.id,
          menuCategoryId: catCombos.id,
          productionSectorId: sectorQuente.id,
          name: "Combo Frango",
          description: "Frango Crispy + Fritas Pequenas + Bebida à escolha.",
          price: 46.0,
          costPrice: 19.32,
          imageUrl:
            "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQeGQofnEPyQaHEV2WL8rGUs41oMICtYfNkphl",
          ingredients: ["Pão brioche", "Filé frango empanado", "Batata frita", "Bebida"],
          sku: "CMB-002",
          trackInventory: false,
          stockQuantity: 0,
          lowStockThreshold: 0,
        },
        {
          restaurantId: restaurant.id,
          menuCategoryId: catFritas.id,
          productionSectorId: sectorQuente.id,
          name: "Fritas Grandes",
          description: "Porção generosa de batatas fritas crocantes com sal grosso.",
          price: 14.0,
          costPrice: 3.5,
          imageUrl:
            "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQNd3jSNrcJroaszwjUAlM6iSO5ZTx2HV70t31",
          ingredients: ["Batata congelada", "Sal grosso", "Óleo de girassol"],
          sku: "FRI-001",
          trackInventory: true,
          stockQuantity: 100,
          lowStockThreshold: 20,
          isVegan: true,
          isGlutenFree: true,
        },
        {
          restaurantId: restaurant.id,
          menuCategoryId: catFritas.id,
          productionSectorId: sectorQuente.id,
          name: "Fritas Pequenas",
          description: "Batatas fritas crocantes em porção individual.",
          price: 8.0,
          costPrice: 2.0,
          imageUrl:
            "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQ5toOZxYa1oARJCUGh4EY3x8NjXHtvZ7lnVfw",
          ingredients: ["Batata congelada", "Sal grosso", "Óleo de girassol"],
          sku: "FRI-002",
          trackInventory: true,
          stockQuantity: 100,
          lowStockThreshold: 20,
          isVegan: true,
          isGlutenFree: true,
        },
        {
          restaurantId: restaurant.id,
          menuCategoryId: catBebidas.id,
          productionSectorId: sectorBar.id,
          name: "Coca-Cola Lata",
          description: "Refrigerante gelado, lata 350 ml.",
          price: 6.0,
          costPrice: 2.5,
          imageUrl:
            "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQJS1b33q29eEsh0CVmOywrqx1UPnJpRGcHN5v",
          ingredients: [],
          sku: "BEB-001",
          trackInventory: true,
          stockQuantity: 200,
          lowStockThreshold: 30,
        },
        {
          restaurantId: restaurant.id,
          menuCategoryId: catBebidas.id,
          productionSectorId: sectorBar.id,
          name: "Suco de Laranja Natural",
          description: "Suco de laranja espremido na hora, 400 ml.",
          price: 9.0,
          costPrice: 3.8,
          imageUrl:
            "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQW7Kxm9gniS9XCLQu7Nb4jvBYZze16goaOqsK",
          ingredients: ["Laranja pêra"],
          sku: "BEB-002",
          trackInventory: false,
          stockQuantity: 0,
          lowStockThreshold: 0,
        },
        {
          restaurantId: restaurant.id,
          menuCategoryId: catBebidas.id,
          productionSectorId: sectorBar.id,
          name: "Água Mineral",
          description: "Água mineral sem gás, 500 ml.",
          price: 4.0,
          costPrice: 1.2,
          imageUrl:
            "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQ7i05S5tkc0L9oMIXZsFJtwnBh2KCz3y6uSW1",
          ingredients: [],
          sku: "BEB-003",
          trackInventory: true,
          stockQuantity: 150,
          lowStockThreshold: 20,
        },
        {
          restaurantId: restaurant.id,
          menuCategoryId: catSobremesas.id,
          productionSectorId: sectorBar.id,
          name: "Casquinha de Baunilha",
          description: "Sorvete de baunilha cremoso em casquinha crocante.",
          price: 4.5,
          costPrice: 1.35,
          imageUrl:
            "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQtfuQrAKkI75oJfPT0crZxvX82ui9qV3hLFdY",
          ingredients: [],
          sku: "SOB-001",
          trackInventory: false,
          stockQuantity: 0,
          lowStockThreshold: 0,
        },
        {
          restaurantId: restaurant.id,
          menuCategoryId: catPizzas.id,
          productionSectorId: sectorQuente.id,
          name: "Pizza Calabresa",
          description: "Molho de tomate artesanal, mozzarella, calabresa fatiada, cebola e azeitonas pretas.",
          price: 49.9,
          costPrice: 15.0,
          imageUrl:
            "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=500&auto=format&fit=crop",
          ingredients: ["Massa artesanal", "Molho de tomate", "Mozzarella", "Calabresa", "Cebola", "Azeitonas pretas"],
          sku: "PIZ-001",
          trackInventory: false,
          stockQuantity: 0,
          lowStockThreshold: 0,
        },
        {
          restaurantId: restaurant.id,
          menuCategoryId: catPizzas.id,
          productionSectorId: sectorQuente.id,
          name: "Pizza Margherita",
          description: "Molho de tomate artesanal, mozzarella fresca, fatias de tomate, manjericão fresco e azeite.",
          price: 45.9,
          costPrice: 13.5,
          imageUrl:
            "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=500&auto=format&fit=crop",
          ingredients: ["Massa artesanal", "Molho de tomate", "Mozzarella", "Tomate fatiado", "Manjericão fresco", "Azeite de oliva"],
          sku: "PIZ-002",
          trackInventory: false,
          stockQuantity: 0,
          lowStockThreshold: 0,
        },
        {
          restaurantId: restaurant.id,
          menuCategoryId: catPizzas.id,
          productionSectorId: sectorQuente.id,
          name: "Pizza Quatro Queijos",
          description: "Molho de tomate, mozzarella, provolone, gorgonzola cremoso e requeijão catupiry.",
          price: 54.9,
          costPrice: 18.0,
          imageUrl:
            "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop",
          ingredients: ["Massa artesanal", "Molho de tomate", "Mozzarella", "Provolone", "Gorgonzola", "Catupiry"],
          sku: "PIZ-003",
          trackInventory: false,
          stockQuantity: 0,
          lowStockThreshold: 0,
        },
        {
          restaurantId: restaurant.id,
          menuCategoryId: catPizzas.id,
          productionSectorId: sectorQuente.id,
          name: "Pizza Frango com Catupiry",
          description: "Molho de tomate artesanal, mozzarella, peito de frango desfiado temperado e requeijão catupiry.",
          price: 52.9,
          costPrice: 16.5,
          imageUrl:
            "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&auto=format&fit=crop",
          ingredients: ["Massa artesanal", "Molho de tomate", "Mozzarella", "Frango desfiado", "Catupiry", "Milho"],
          sku: "PIZ-004",
          trackInventory: false,
          stockQuantity: 0,
          lowStockThreshold: 0,
        },
        {
          restaurantId: restaurant.id,
          menuCategoryId: catPizzas.id,
          productionSectorId: sectorQuente.id,
          name: "Pizza Pepperoni",
          description: "Molho de tomate artesanal, mozzarella abundante e rodelas crocantes de pepperoni especial.",
          price: 56.9,
          costPrice: 19.0,
          imageUrl:
            "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&auto=format&fit=crop",
          ingredients: ["Massa artesanal", "Molho de tomate", "Mozzarella", "Pepperoni"],
          sku: "PIZ-005",
          trackInventory: false,
          stockQuantity: 0,
          lowStockThreshold: 0,
        },
        {
          restaurantId: restaurant.id,
          menuCategoryId: catPizzas.id,
          productionSectorId: sectorQuente.id,
          name: "Pizza Portuguesa",
          description: "Molho de tomate, mozzarella, presunto cozido, ovos cozidos, cebola, ervilha e azeitonas.",
          price: 49.9,
          costPrice: 15.5,
          imageUrl:
            "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&auto=format&fit=crop",
          ingredients: ["Massa artesanal", "Molho de tomate", "Mozzarella", "Presunto", "Ovos", "Cebola", "Ervilha"],
          sku: "PIZ-006",
          trackInventory: false,
          stockQuantity: 0,
          lowStockThreshold: 0,
        },
      ])
      .returning();

    await tx.insert(productSizePricesTable).values([
      { productId: prodPizzaCalabresa.id, name: "Média (8 fatias)", price: 49.9, isDefault: false },
      { productId: prodPizzaCalabresa.id, name: "Grande (12 fatias)", price: 64.9, isDefault: true },
      { productId: prodPizzaMargherita.id, name: "Média (8 fatias)", price: 45.9, isDefault: false },
      { productId: prodPizzaMargherita.id, name: "Grande (12 fatias)", price: 59.9, isDefault: true },
      { productId: prodPizzaQuatroQueijos.id, name: "Média (8 fatias)", price: 54.9, isDefault: false },
      { productId: prodPizzaQuatroQueijos.id, name: "Grande (12 fatias)", price: 69.9, isDefault: true },
      { productId: prodPizzaFrangoCatupiry.id, name: "Média (8 fatias)", price: 52.9, isDefault: false },
      { productId: prodPizzaFrangoCatupiry.id, name: "Grande (12 fatias)", price: 67.9, isDefault: true },
      { productId: prodPizzaPepperoni.id, name: "Média (8 fatias)", price: 56.9, isDefault: false },
      { productId: prodPizzaPepperoni.id, name: "Grande (12 fatias)", price: 71.9, isDefault: true },
      { productId: prodPizzaPortuguesa.id, name: "Média (8 fatias)", price: 49.9, isDefault: false },
      { productId: prodPizzaPortuguesa.id, name: "Grande (12 fatias)", price: 64.9, isDefault: true },
    ]);

    await tx.insert(productToOptionGroupsTable).values([
      { productId: prodBigCraft.id, productOptionGroupId: grpPonto.id },
      { productId: prodBigCraft.id, productOptionGroupId: grpAdicionais.id },
      { productId: prodDuploCostela.id, productOptionGroupId: grpPonto.id },
      { productId: prodDuploCostela.id, productOptionGroupId: grpAdicionais.id },
      { productId: prodFrangoChispy.id, productOptionGroupId: grpAdicionais.id },
      { productId: prodComboClassico.id, productOptionGroupId: grpPonto.id },
      { productId: prodComboClassico.id, productOptionGroupId: grpBebida.id },
      { productId: prodComboFrango.id, productOptionGroupId: grpBebida.id },
      { productId: prodPizzaCalabresa.id, productOptionGroupId: grpBorda.id },
      { productId: prodPizzaMargherita.id, productOptionGroupId: grpBorda.id },
      { productId: prodPizzaQuatroQueijos.id, productOptionGroupId: grpBorda.id },
      { productId: prodPizzaFrangoCatupiry.id, productOptionGroupId: grpBorda.id },
      { productId: prodPizzaPepperoni.id, productOptionGroupId: grpBorda.id },
      { productId: prodPizzaPortuguesa.id, productOptionGroupId: grpBorda.id },
    ]);

    process.stdout.write("✅ [C] Cardápio criado.\n");

    // ── MÓDULO D: GARÇONS E COMISSÃO ──────────────────────────────────────────

    process.stdout.write("👨‍🍳 [D] Criando equipe e comissões...\n");

    const [waiterMarcos, waiterJulia] = await tx
      .insert(waitersTable)
      .values([
        { restaurantId: restaurant.id, name: "Marcos Oliveira", phone: "11944445555", cpf: "123.456.789-00", commissionPercent: 10, status: "ACTIVE" },
        { restaurantId: restaurant.id, name: "Julia Santos", phone: "11955556666", cpf: "987.654.321-00", commissionPercent: 10, status: "ACTIVE" },
        { restaurantId: restaurant.id, name: "Pedro Alves", phone: "11966667777", cpf: "111.222.333-44", commissionPercent: 10, status: "ACTIVE" },
      ])
      .returning();

    await tx.insert(commissionRulesTable).values({
      restaurantId: restaurant.id,
      name: "Taxa Padrão Salão (10%)",
      serviceFeePercent: 10,
      waiterSharePercent: 100,
      isActive: true,
    });

    process.stdout.write("✅ [D] Equipe criada.\n");

    // ── MÓDULO E: ESTOQUE, FORNECEDORES E FICHA TÉCNICA ──────────────────────

    process.stdout.write("📦 [E] Criando estoque e fichas técnicas...\n");

    const [
      invPaoBrioche,
      invHamburgerCostela,
      invQueijoCheddar,
      invBaconTiras,
      invAlfaceAmericana,
      invTomateFresco,
      invBatataCongelada,
      invCocaColaLata,
      invEmbalagBurger,
      invMassaPizza,
    ] = await tx
      .insert(inventoryItemsTable)
      .values([
        { restaurantId: restaurant.id, name: "Pão Brioche", type: "INSUMO", sku: "INS-001", unitOfMeasure: "UN", currentQuantity: 120, lowStockThreshold: 30, unitCost: 1.8 },
        { restaurantId: restaurant.id, name: "Hambúrguer Costela 180g", type: "INSUMO", sku: "INS-002", unitOfMeasure: "UN", currentQuantity: 80, lowStockThreshold: 20, unitCost: 8.5 },
        { restaurantId: restaurant.id, name: "Queijo Cheddar Fatiado", type: "INSUMO", sku: "INS-003", unitOfMeasure: "G", currentQuantity: 3000, lowStockThreshold: 500, unitCost: 0.045 },
        { restaurantId: restaurant.id, name: "Bacon em Tiras", type: "INSUMO", sku: "INS-004", unitOfMeasure: "G", currentQuantity: 2000, lowStockThreshold: 400, unitCost: 0.055 },
        { restaurantId: restaurant.id, name: "Alface Americana", type: "INSUMO", sku: "INS-005", unitOfMeasure: "G", currentQuantity: 1500, lowStockThreshold: 300, unitCost: 0.012 },
        { restaurantId: restaurant.id, name: "Tomate Fresco", type: "INSUMO", sku: "INS-006", unitOfMeasure: "G", currentQuantity: 2000, lowStockThreshold: 400, unitCost: 0.008 },
        { restaurantId: restaurant.id, name: "Batata Congelada", type: "INSUMO", sku: "INS-007", unitOfMeasure: "KG", currentQuantity: 50, lowStockThreshold: 10, unitCost: 7.5 },
        { restaurantId: restaurant.id, name: "Coca-Cola Lata 350ml", type: "INSUMO", sku: "INS-008", unitOfMeasure: "UN", currentQuantity: 200, lowStockThreshold: 30, unitCost: 2.5 },
        { restaurantId: restaurant.id, name: "Embalagem Kraft Burger", type: "EMBALAGEM", sku: "EMB-001", unitOfMeasure: "UN", currentQuantity: 500, lowStockThreshold: 100, unitCost: 0.35 },
        { restaurantId: restaurant.id, name: "Massa de Pizza Artesanal", type: "INSUMO", sku: "INS-010", unitOfMeasure: "UN", currentQuantity: 30, lowStockThreshold: 8, unitCost: 4.5 },
      ])
      .returning();

    const [supplierPadaria, supplierFrigorifico] = await tx
      .insert(suppliersTable)
      .values([
        {
          restaurantId: restaurant.id,
          companyName: "Padaria Artesanal São Paulo LTDA",
          cnpj: "98.765.432/0001-10",
          phone: "(11) 3333-1111",
          email: "pedidos@padariasp.com.br",
          address: "Rua das Padarias, 200 - Vila Madalena, SP",
        },
        {
          restaurantId: restaurant.id,
          companyName: "Frigorífico Costela Premium LTDA",
          cnpj: "11.222.333/0001-44",
          phone: "(11) 4444-2222",
          email: "vendas@frigorificocostela.com.br",
          address: "Av. Industrial, 1500 - Santo André, SP",
        },
      ])
      .returning();

    const [invoicePadaria] = await tx
      .insert(purchaseInvoicesTable)
      .values({
        restaurantId: restaurant.id,
        supplierId: supplierPadaria.id,
        invoiceNumber: "001234",
        accessKey: "35260612345678000190550010001234561234567890",
        totalAmount: 432.0,
        issuedAt: daysAgo(7),
        items: [
          {
            nfeCode: "1901209010",
            nfeName: "PAO BRIOCHE 100UN",
            quantity: 2,
            unitCost: 180.0,
            unitOfMeasure: "CX",
            inventoryItemId: invPaoBrioche.id,
            conversionFactor: 100,
          },
          {
            nfeCode: "2201209020",
            nfeName: "EMBALAGEM KRAFT BURGER 200UN",
            quantity: 1,
            unitCost: 72.0,
            unitOfMeasure: "CX",
            inventoryItemId: invEmbalagBurger.id,
            conversionFactor: 200,
          },
        ],
      })
      .returning();

    await tx.insert(purchaseInvoicesTable).values({
      restaurantId: restaurant.id,
      supplierId: supplierFrigorifico.id,
      invoiceNumber: "005678",
      accessKey: "35260611222333000144550010005678905678901234",
      totalAmount: 680.0,
      issuedAt: daysAgo(3),
      items: [
        {
          nfeCode: "1601001000",
          nfeName: "HAMBURGUER COSTELA 180G",
          quantity: 80,
          unitCost: 8.5,
          unitOfMeasure: "UN",
          inventoryItemId: invHamburgerCostela.id,
          conversionFactor: 1,
        },
      ],
    });

    await tx.insert(inventoryBatchesTable).values([
      {
        restaurantId: restaurant.id,
        inventoryItemId: invPaoBrioche.id,
        purchaseInvoiceId: invoicePadaria.id,
        batchCode: "LOTE-PAO-2026-06A",
        quantity: 200,
        manufacturingDate: dateStr(daysAgo(7)),
        expirationDate: dateStr(daysFromNow(3)),
        unitCost: 1.8,
      },
      {
        restaurantId: restaurant.id,
        inventoryItemId: invHamburgerCostela.id,
        batchCode: "LOTE-HAM-2026-06A",
        quantity: 80,
        manufacturingDate: dateStr(daysAgo(3)),
        expirationDate: dateStr(daysFromNow(5)),
        unitCost: 8.5,
      },
      {
        restaurantId: restaurant.id,
        inventoryItemId: invBatataCongelada.id,
        batchCode: "LOTE-BAT-2026-05A",
        quantity: 50,
        manufacturingDate: dateStr(daysAgo(30)),
        expirationDate: dateStr(daysFromNow(60)),
        unitCost: 7.5,
      },
    ]);

    await tx.insert(recipeItemsTable).values([
      // Big Craft
      { productId: prodBigCraft.id, inventoryItemId: invPaoBrioche.id, quantityNeeded: 1, yieldFactor: 1, preparationMethod: "Tostar na chapa por 2 minutos" },
      { productId: prodBigCraft.id, inventoryItemId: invHamburgerCostela.id, quantityNeeded: 1, yieldFactor: 1 },
      { productId: prodBigCraft.id, inventoryItemId: invQueijoCheddar.id, quantityNeeded: 30, yieldFactor: 1 },
      { productId: prodBigCraft.id, inventoryItemId: invAlfaceAmericana.id, quantityNeeded: 20, yieldFactor: 0.9 },
      { productId: prodBigCraft.id, inventoryItemId: invTomateFresco.id, quantityNeeded: 30, yieldFactor: 0.85 },
      // Duplo Costela
      { productId: prodDuploCostela.id, inventoryItemId: invPaoBrioche.id, quantityNeeded: 1, yieldFactor: 1, preparationMethod: "Tostar na chapa por 2 minutos" },
      { productId: prodDuploCostela.id, inventoryItemId: invHamburgerCostela.id, quantityNeeded: 2, yieldFactor: 1 },
      { productId: prodDuploCostela.id, inventoryItemId: invQueijoCheddar.id, quantityNeeded: 60, yieldFactor: 1 },
      { productId: prodDuploCostela.id, inventoryItemId: invBaconTiras.id, quantityNeeded: 40, yieldFactor: 1 },
      // Fritas Grandes
      { productId: prodFritasG.id, inventoryItemId: invBatataCongelada.id, quantityNeeded: 0.35, yieldFactor: 0.9, preparationMethod: "Fritar a 180°C por 4 min" },
      // Pizza Calabresa
      { productId: prodPizzaCalabresa.id, inventoryItemId: invMassaPizza.id, quantityNeeded: 1, yieldFactor: 1, preparationMethod: "Assar a 300°C por 8 min" },
    ]);

    await tx.insert(inventoryLossesTable).values([
      {
        restaurantId: restaurant.id,
        inventoryItemId: invPaoBrioche.id,
        quantity: 12,
        occurredAt: daysAgo(2),
        reason: "VENCIDO",
        financialLoss: 21.6,
        notes: "Lote LOTE-PAO-2026-06A venceu. Descartado pelo responsável de turno.",
      },
      {
        restaurantId: restaurant.id,
        inventoryItemId: invQueijoCheddar.id,
        quantity: 150,
        occurredAt: daysAgo(5),
        reason: "DANIFICADO",
        financialLoss: 6.75,
        notes: "Embalagem rompida durante recebimento. Produto contaminado.",
      },
    ]);

    process.stdout.write("✅ [E] Estoque e fichas técnicas criados.\n");

    // ── MÓDULO F: FINANCEIRO E FECHAMENTOS DE CAIXA ───────────────────────────

    process.stdout.write("💰 [F] Criando contas, caixa e transações...\n");

    const [bankCaixa, bankItau] = await tx
      .insert(bankAccountsTable)
      .values([
        { restaurantId: restaurant.id, name: "Caixa Interno", type: "INTERNAL", currentBalance: 1250.0, isActive: true },
        { restaurantId: restaurant.id, name: "Itaú Conta Corrente", type: "CHECKING", bankName: "Itaú Unibanco", agency: "0001", accountNumber: "12345-6", currentBalance: 15800.0, isActive: true },
      ])
      .returning();

    const [catVendasBalcao, , catCompras, catSalarios] = await tx
      .insert(financialCategoriesTable)
      .values([
        { restaurantId: restaurant.id, name: "Vendas Balcão/Salão", type: "REVENUE" },
        { restaurantId: restaurant.id, name: "Vendas Delivery", type: "REVENUE" },
        { restaurantId: restaurant.id, name: "Compras de Mercadoria", type: "EXPENSE" },
        { restaurantId: restaurant.id, name: "Salários e Comissões", type: "EXPENSE" },
      ])
      .returning();

    const [shiftFechado] = await tx
      .insert(cashRegisterShiftsTable)
      .values({
        restaurantId: restaurant.id,
        openedByUser: "admin",
        openedAt: daysAgo(1),
        closedAt: new Date(daysAgo(1).getTime() + 8 * 60 * 60 * 1000),
        openingAmount: 200.0,
        expectedClosingAmount: 1850.0,
        actualClosingAmount: 1838.5,
        closingDifference: -11.5,
        status: "CLOSED",
        notes: "Diferença de R$11,50. Trocos de entrega não registrados.",
      })
      .returning();

    const [shiftAberto] = await tx
      .insert(cashRegisterShiftsTable)
      .values({
        restaurantId: restaurant.id,
        openedByUser: "admin",
        openedAt: new Date(),
        openingAmount: 200.0,
        status: "OPEN",
      })
      .returning();

    await tx.insert(cashMovementsTable).values([
      { restaurantId: restaurant.id, shiftId: shiftFechado.id, type: "SANGRIA", amount: 300.0, reason: "Depósito bancário do movimento do dia anterior" },
      { restaurantId: restaurant.id, shiftId: shiftFechado.id, type: "SUPRIMENTO", amount: 50.0, reason: "Troco adicional solicitado pela operação" },
      { restaurantId: restaurant.id, shiftId: shiftAberto.id, type: "SUPRIMENTO", amount: 100.0, reason: "Aporte inicial de troco para abertura de caixa" },
    ]);

    await tx.insert(financialClosingsTable).values([
      {
        restaurantId: restaurant.id,
        referenceDate: dateStr(daysAgo(2)),
        grossRevenue: 2340.5,
        estimatedCost: 983.01,
        estimatedProfit: 1357.49,
        totalOrders: 47,
        closedAt: daysAgo(2),
      },
      {
        restaurantId: restaurant.id,
        referenceDate: dateStr(daysAgo(1)),
        grossRevenue: 1850.0,
        estimatedCost: 777.0,
        estimatedProfit: 1073.0,
        totalOrders: 38,
        closedAt: daysAgo(1),
      },
    ]);

    process.stdout.write("✅ [F] Financeiro e caixa criados.\n");

    // ── MÓDULO G: CUPONS, FIDELIDADE E CLIENTES ───────────────────────────────

    process.stdout.write("🎁 [G] Criando cupons, carteiras e fidelidade...\n");

    const [couponBemVindo] = await tx
      .insert(couponsTable)
      .values([
        {
          restaurantId: restaurant.id,
          code: "BEMVINDO10",
          description: "10% de desconto na primeira compra.",
          discountType: "PERCENTAGE",
          discountValue: 10,
          minimumOrderValue: 25,
          usageLimit: 500,
          usageCount: 23,
          perCustomerLimit: 1,
          isActive: true,
        },
        {
          restaurantId: restaurant.id,
          code: "FRETE0",
          description: "Frete grátis em pedidos acima de R$50.",
          discountType: "FIXED",
          discountValue: 9.9,
          minimumOrderValue: 50,
          usageLimit: 200,
          usageCount: 8,
          perCustomerLimit: 3,
          isActive: true,
          endsAt: daysFromNow(30),
        },
      ])
      .returning();

    await tx.insert(walletsTable).values([
      { restaurantId: restaurant.id, customerPhone: "11911112222", balance: 15.0, points: 120, totalEarned: 25.0, totalRedeemed: 10.0, lastCreditAt: daysAgo(5) },
      { restaurantId: restaurant.id, customerPhone: "11922223333", balance: 8.5, points: 60, totalEarned: 8.5, totalRedeemed: 0, lastCreditAt: daysAgo(10) },
      { restaurantId: restaurant.id, customerPhone: "11933334444", balance: 32.0, points: 280, totalEarned: 55.0, totalRedeemed: 23.0, lastCreditAt: daysAgo(2) },
    ]);

    await tx.insert(loyaltyRulesTable).values([
      { restaurantId: restaurant.id, name: "Cashback Padrão 2%", minOrderValue: 0, cashbackPercent: 2, isActive: true },
      {
        restaurantId: restaurant.id,
        name: "Cashback Premium Combos",
        minOrderValue: 50,
        cashbackPercent: 5,
        isActive: true,
        menuCategoryId: catCombos.id,
        endsAt: daysFromNow(60),
      },
    ]);

    await tx.insert(loyaltyPrizesTable).values([
      { restaurantId: restaurant.id, name: "Fritas Grátis", description: "Troque 100 pontos por Fritas Pequenas.", pointsRequired: 100, stock: 50, isActive: true },
      { restaurantId: restaurant.id, name: "Casquinha Grátis", description: "Troque 60 pontos por uma Casquinha.", pointsRequired: 60, stock: null, isActive: true },
    ]);

    const [ledgerJoao] = await tx
      .insert(customerLedgersTable)
      .values({
        restaurantId: restaurant.id,
        customerName: "João Ferreira",
        customerPhone: "11977778888",
        customerCpf: "555.666.777-88",
        creditLimit: 300.0,
        debtBalance: 87.5,
        isActive: true,
        notes: "Cliente frequente. Paga regularmente às sextas-feiras.",
      })
      .returning();

    process.stdout.write("✅ [G] Cupons, carteiras e fidelidade criados.\n");

    // ── ENTREGADORES E VEÍCULOS ───────────────────────────────────────────────

    process.stdout.write("🏍️  Criando entregadores e frota...\n");

    const [courierLucas] = await tx
      .insert(couriersTable)
      .values([
        {
          restaurantId: restaurant.id,
          name: "Lucas Carvalho",
          phone: "11988889999",
          vehicleType: "Moto",
          licensePlate: "ABC-1D23",
          cpf: "222.333.444-55",
          rg: "22.333.444-5",
          cep: "01310-100",
          logradouro: "Av. Paulista",
          numero: "500",
          bairro: "Bela Vista",
          cidade: "São Paulo",
          estado: "SP",
          cnhNumero: "99887766554",
          cnhCategoria: "A",
          cnhVencimento: dateStr(daysFromNow(730)),
          usesOwnVehicle: true,
          workDays: ["SEG", "TER", "QUA", "QUI", "SEX"],
          shiftStart: "10:00",
          shiftEnd: "22:00",
          isAvailable: true,
          isActive: true,
        },
        {
          restaurantId: restaurant.id,
          name: "Rafael Moura",
          phone: "11999990000",
          vehicleType: "Moto",
          licensePlate: "DEF-2E34",
          cpf: "333.444.555-66",
          rg: "33.444.555-6",
          cep: "04038-001",
          logradouro: "Rua Vergueiro",
          numero: "1200",
          bairro: "Vila Mariana",
          cidade: "São Paulo",
          estado: "SP",
          cnhNumero: "88776655443",
          cnhCategoria: "A",
          cnhVencimento: dateStr(daysFromNow(365)),
          usesOwnVehicle: false,
          workDays: ["SEX", "SAB", "DOM"],
          shiftStart: "11:00",
          shiftEnd: "23:00",
          isAvailable: false,
          isActive: true,
        },
      ])
      .returning();

    await tx.insert(companyVehiclesTable).values({
      restaurantId: restaurant.id,
      brand: "Honda",
      model: "CG 160",
      year: 2022,
      color: "Preto",
      licensePlate: "DEF-2E34",
      renavam: "00123456789",
      chassi: "9C2JC31107R123456",
      status: "ACTIVE",
    });

    process.stdout.write("✅ Entregadores e frota criados.\n");

    // ── PEDIDOS HISTÓRICOS ────────────────────────────────────────────────────

    process.stdout.write("📋 Criando histórico de pedidos...\n");

    // Pedido 1: FINISHED — delivery, PIX, com entregador
    const [order1] = await tx
      .insert(ordersTable)
      .values({
        restaurantId: restaurant.id,
        courierId: courierLucas.id,
        cashRegisterShiftId: shiftFechado.id,
        status: "FINISHED",
        paymentStatus: "PAID",
        consumptionMethod: "DELIVERY",
        paymentMethod: "PIX",
        subtotal: 77.0,
        deliveryFee: 5.9,
        total: 82.9,
        estimatedCost: 32.34,
        estimatedProfit: 44.66,
        cashbackEarnedAmount: 1.54,
        customerName: "Ana Lima",
        customerPhone: "11911112222",
        deliveryAddress: "Rua Augusta, 500 - Consolação, SP",
        deliveryLatitude: -23.552,
        deliveryLongitude: -46.654,
        paidAt: daysAgo(1),
        dispatchedAt: daysAgo(1),
        deliveredAt: daysAgo(1),
        finishedAt: daysAgo(1),
      })
      .returning();

    const [op1BigCraft] = await tx
      .insert(orderProductsTable)
      .values([
        { orderId: order1.id, productId: prodBigCraft.id, quantity: 1, price: 35.0, unitCost: 14.7, lineTotal: 35.0, productNameSnapshot: "Big Craft", itemStatus: "READY" },
        { orderId: order1.id, productId: prodComboClassico.id, quantity: 1, price: 52.0, unitCost: 21.84, lineTotal: 52.0, productNameSnapshot: "Combo Clássico", itemStatus: "READY" },
      ])
      .returning();

    await tx.insert(orderProductOptionsTable).values([
      { orderProductId: op1BigCraft.id, productOptionId: optAoPonto.id, nameSnapshot: "Ao Ponto", priceSnapshot: 0 },
    ]);

    // Pedido 2: FINISHED — dine-in, cartão, com garçom e taxa de serviço
    const [order2] = await tx
      .insert(ordersTable)
      .values({
        restaurantId: restaurant.id,
        waiterId: waiterMarcos.id,
        diningTableId: mesa1.id,
        cashRegisterShiftId: shiftFechado.id,
        status: "FINISHED",
        paymentStatus: "PAID",
        consumptionMethod: "DINE_IN",
        paymentMethod: "CARTAO_PRESENCIAL",
        subtotal: 84.0,
        serviceFeePercent: 10,
        serviceFeeAmount: 8.4,
        total: 92.4,
        estimatedCost: 35.28,
        estimatedProfit: 48.72,
        customerName: "Ricardo Prado",
        customerPhone: "11922223333",
        paidAt: daysAgo(1),
        finishedAt: daysAgo(1),
        closedAt: daysAgo(1),
      })
      .returning();

    await tx.insert(orderProductsTable).values([
      { orderId: order2.id, productId: prodDuploCostela.id, quantity: 2, price: 42.0, unitCost: 17.64, lineTotal: 84.0, productNameSnapshot: "Duplo Costela", itemStatus: "READY" },
    ]);

    // Pedido 3: FINISHED — takeaway, dinheiro, com cupom
    const [order3] = await tx
      .insert(ordersTable)
      .values({
        restaurantId: restaurant.id,
        cashRegisterShiftId: shiftFechado.id,
        couponId: couponBemVindo.id,
        couponCode: "BEMVINDO10",
        status: "FINISHED",
        paymentStatus: "PAID",
        consumptionMethod: "TAKEAWAY",
        paymentMethod: "DINHEIRO",
        subtotal: 52.0,
        couponDiscountAmount: 5.2,
        total: 46.8,
        changeFor: 50.0,
        estimatedCost: 21.84,
        estimatedProfit: 24.96,
        customerName: "Beatriz Souza",
        customerPhone: "11933334444",
        paidAt: daysAgo(1),
        finishedAt: daysAgo(1),
      })
      .returning();

    await tx.insert(orderProductsTable).values([
      { orderId: order3.id, productId: prodComboClassico.id, quantity: 1, price: 52.0, unitCost: 21.84, lineTotal: 52.0, productNameSnapshot: "Combo Clássico", itemStatus: "READY" },
    ]);

    // Pedido 4: IN_PREPARATION — delivery, PIX (turno atual)
    const [order4] = await tx
      .insert(ordersTable)
      .values({
        restaurantId: restaurant.id,
        courierId: courierLucas.id,
        cashRegisterShiftId: shiftAberto.id,
        status: "IN_PREPARATION",
        paymentStatus: "PENDING",
        consumptionMethod: "DELIVERY",
        paymentMethod: "PIX",
        subtotal: 62.0,
        deliveryFee: 5.9,
        total: 67.9,
        estimatedCost: 26.04,
        estimatedProfit: 35.96,
        customerName: "Carlos Mendes",
        customerPhone: "11944445555",
        deliveryAddress: "Rua Oscar Freire, 300 - Jardins, SP",
        deliveryLatitude: -23.561,
        deliveryLongitude: -46.671,
      })
      .returning();

    await tx.insert(orderProductsTable).values([
      { orderId: order4.id, productId: prodDuploCostela.id, quantity: 1, price: 42.0, unitCost: 17.64, lineTotal: 42.0, productNameSnapshot: "Duplo Costela", itemStatus: "PENDING" },
      { orderId: order4.id, productId: prodFritasG.id, quantity: 1, price: 14.0, unitCost: 3.5, lineTotal: 14.0, productNameSnapshot: "Fritas Grandes", itemStatus: "PENDING" },
      { orderId: order4.id, productId: prodCocaCola.id, quantity: 1, price: 6.0, unitCost: 2.5, lineTotal: 6.0, productNameSnapshot: "Coca-Cola Lata", itemStatus: "PENDING" },
    ]);

    // Pedido 5: PENDING — dine-in, cartão, garçom (recém-criado)
    const [order5] = await tx
      .insert(ordersTable)
      .values({
        restaurantId: restaurant.id,
        waiterId: waiterJulia.id,
        diningTableId: mesa2.id,
        cashRegisterShiftId: shiftAberto.id,
        status: "PENDING",
        paymentStatus: "PENDING",
        consumptionMethod: "DINE_IN",
        paymentMethod: "CARTAO_PRESENCIAL",
        subtotal: 35.0,
        serviceFeePercent: 10,
        serviceFeeAmount: 3.5,
        total: 38.5,
        estimatedCost: 14.7,
        estimatedProfit: 20.3,
        customerName: "Fernanda Costa",
        customerPhone: "11955556666",
      })
      .returning();

    await tx.insert(orderProductsTable).values([
      { orderId: order5.id, productId: prodBigCraft.id, quantity: 1, price: 35.0, unitCost: 14.7, lineTotal: 35.0, productNameSnapshot: "Big Craft", itemStatus: "PENDING" },
    ]);

    // Pedido 6: CANCELLED — delivery, Mercado Pago
    const [order6] = await tx
      .insert(ordersTable)
      .values({
        restaurantId: restaurant.id,
        cashRegisterShiftId: shiftFechado.id,
        status: "CANCELLED",
        paymentStatus: "CANCELLED",
        consumptionMethod: "DELIVERY",
        paymentMethod: "MERCADO_PAGO",
        subtotal: 32.0,
        deliveryFee: 5.9,
        total: 37.9,
        customerName: "Paulo Araujo",
        customerPhone: "11966667777",
        deliveryAddress: "Alameda Santos, 800 - Jardim Paulista, SP",
        cancelledAt: daysAgo(1),
        notes: "Endereço fora da área de entrega.",
      })
      .returning();

    await tx.insert(orderProductsTable).values([
      { orderId: order6.id, productId: prodFrangoChispy.id, quantity: 1, price: 32.0, unitCost: 13.44, lineTotal: 32.0, productNameSnapshot: "Frango Crispy", itemStatus: "PENDING" },
    ]);

    // Pedido 7: FINISHED — fiado (salão, sem pagamento imediato)
    const [order7] = await tx
      .insert(ordersTable)
      .values({
        restaurantId: restaurant.id,
        cashRegisterShiftId: shiftFechado.id,
        customerLedgerId: ledgerJoao.id,
        status: "FINISHED",
        paymentStatus: "PENDING",
        consumptionMethod: "DINE_IN",
        paymentMethod: "FIADO",
        subtotal: 87.5,
        total: 87.5,
        estimatedCost: 36.75,
        estimatedProfit: 50.75,
        customerName: "João Ferreira",
        customerPhone: "11977778888",
        finishedAt: daysAgo(3),
      })
      .returning();

    await tx.insert(orderProductsTable).values([
      { orderId: order7.id, productId: prodDuploCostela.id, quantity: 1, price: 42.0, unitCost: 17.64, lineTotal: 42.0, productNameSnapshot: "Duplo Costela", itemStatus: "READY" },
      { orderId: order7.id, productId: prodFritasG.id, quantity: 2, price: 14.0, unitCost: 3.5, lineTotal: 28.0, productNameSnapshot: "Fritas Grandes", itemStatus: "READY" },
      { orderId: order7.id, productId: prodCocaCola.id, quantity: 3, price: 6.0, unitCost: 2.5, lineTotal: 18.0, productNameSnapshot: "Coca-Cola Lata", itemStatus: "READY" },
    ]);

    // Avaliações
    await tx.insert(orderRatingsTable).values([
      {
        orderId: order1.id,
        restaurantId: restaurant.id,
        customerName: "Ana Lima",
        stars: 5,
        comment: "Hambúrguer incrível! Entrega rápida e embalagem impecável. Recomendo demais!",
        isActive: true,
      },
      {
        orderId: order2.id,
        restaurantId: restaurant.id,
        customerName: "Ricardo Prado",
        stars: 4,
        comment: "Muito bom! O Duplo Costela é irresistível. Atendimento pode melhorar um pouco.",
        isActive: true,
      },
    ]);

    // Movimentações de estoque
    await tx.insert(stockMovementsTable).values([
      { restaurantId: restaurant.id, inventoryItemId: invPaoBrioche.id, type: "IN", quantityDelta: 200, previousQuantity: 0, currentQuantity: 200, reason: "Entrada por compra - NF 001234" },
      { restaurantId: restaurant.id, inventoryItemId: invHamburgerCostela.id, type: "IN", quantityDelta: 80, previousQuantity: 0, currentQuantity: 80, reason: "Entrada por compra - NF 005678" },
      { restaurantId: restaurant.id, inventoryItemId: invPaoBrioche.id, orderId: order1.id, type: "OUT", quantityDelta: -2, previousQuantity: 200, currentQuantity: 198, reason: `Consumo pedido #${order1.id}` },
      { restaurantId: restaurant.id, inventoryItemId: invHamburgerCostela.id, orderId: order2.id, type: "OUT", quantityDelta: -2, previousQuantity: 80, currentQuantity: 78, reason: `Consumo pedido #${order2.id}` },
      { restaurantId: restaurant.id, inventoryItemId: invPaoBrioche.id, type: "ADJUSTMENT", quantityDelta: -12, previousQuantity: 198, currentQuantity: 186, reason: "Perda por vencimento - Lote LOTE-PAO-2026-06A" },
    ]);

    // Transações financeiras
    await tx.insert(financialTransactionsTable).values([
      {
        restaurantId: restaurant.id,
        description: "Compra pães e embalagens - NF 001234 (Padaria Artesanal SP)",
        amount: 432.0,
        type: "EXPENSE",
        status: "PAID",
        categoryId: catCompras.id,
        bankAccountId: bankItau.id,
        dueDate: daysAgo(7),
        paidAt: daysAgo(7),
      },
      {
        restaurantId: restaurant.id,
        description: "Compra hambúrgueres costela - NF 005678 (Frigorífico Costela)",
        amount: 680.0,
        type: "EXPENSE",
        status: "PENDING",
        categoryId: catCompras.id,
        bankAccountId: bankItau.id,
        dueDate: daysFromNow(15),
      },
      {
        restaurantId: restaurant.id,
        description: "Salários equipe - Junho/2026",
        amount: 4800.0,
        type: "EXPENSE",
        status: "PENDING",
        categoryId: catSalarios.id,
        bankAccountId: bankItau.id,
        dueDate: daysFromNow(6),
      },
      {
        restaurantId: restaurant.id,
        description: `Receita de vendas - ${dateStr(daysAgo(1))}`,
        amount: 1850.0,
        type: "REVENUE",
        status: "PAID",
        categoryId: catVendasBalcao.id,
        bankAccountId: bankCaixa.id,
        dueDate: daysAgo(1),
        paidAt: daysAgo(1),
      },
    ]);

    // Extrato bancário e lançamentos
    const [bankStatement] = await tx
      .insert(bankStatementsTable)
      .values({
        restaurantId: restaurant.id,
        bankAccountId: bankItau.id,
        fileName: "extrato_itau_junho2026.ofx",
        periodStart: dateStr(daysAgo(30)),
        periodEnd: dateStr(new Date()),
        totalEntries: 3,
        matchedEntries: 1,
      })
      .returning();

    await tx.insert(bankStatementEntriesTable).values([
      { statementId: bankStatement.id, restaurantId: restaurant.id, entryDate: dateStr(daysAgo(7)), description: "TED PADARIA ARTESANAL SP LTDA", amount: -432.0, status: "MATCHED" },
      { statementId: bankStatement.id, restaurantId: restaurant.id, entryDate: dateStr(daysAgo(5)), description: "PIX RECEBIDO CLIENTE FINAL", amount: 82.9, status: "PENDING" },
      { statementId: bankStatement.id, restaurantId: restaurant.id, entryDate: dateStr(daysAgo(3)), description: "TARIFA MANUTENCAO CONTA", amount: -12.9, status: "IGNORED" },
    ]);

    // Comandas avulsas
    await tx.insert(comandasAvulsasTable).values([
      { restaurantId: restaurant.id, numero: 1, status: "ACTIVE", customerName: "Mesa Varanda - Grupo", barcode: "CMD-001-2026" },
      { restaurantId: restaurant.id, numero: 2, status: "CLOSED", customerName: "João Ferreira", barcode: "CMD-002-2026", orderId: order7.id },
    ]);

    // Viagem do entregador
    await tx.insert(courierTripsTable).values({
      restaurantId: restaurant.id,
      courierId: courierLucas.id,
      orderIds: [order1.id],
      commissionAmount: 8.29,
      status: "COMPLETED",
      departedAt: daysAgo(1),
      returnedAt: daysAgo(1),
    });

    // Fechamentos de gorjeta
    await tx.insert(tipClosingsTable).values([
      {
        restaurantId: restaurant.id,
        waiterId: waiterMarcos.id,
        amount: 8.4,
        referenceDate: dateStr(daysAgo(1)),
        paidAt: daysAgo(1),
        notes: `Taxa de serviço Mesa 01 - Pedido #${order2.id}`,
      },
      {
        restaurantId: restaurant.id,
        waiterId: waiterJulia.id,
        amount: 15.0,
        referenceDate: dateStr(daysAgo(7)),
        paidAt: daysAgo(6),
        notes: "Consolidado de gorjetas da semana anterior",
      },
    ]);

    // Livro de fiados
    await tx.insert(customerLedgerEntriesTable).values([
      {
        restaurantId: restaurant.id,
        ledgerId: ledgerJoao.id,
        orderId: order7.id,
        type: "DEBIT",
        amount: 87.5,
        description: `Compra a prazo - Mesa salão - Pedido #${order7.id}`,
      },
      {
        restaurantId: restaurant.id,
        ledgerId: ledgerJoao.id,
        bankAccountId: bankCaixa.id,
        type: "CREDIT",
        amount: 50.0,
        description: "Pagamento parcial em dinheiro - João Ferreira",
      },
    ]);

    process.stdout.write("✅ Pedidos históricos criados.\n");

    // ── CRM, MARKETING E CARRINHOS ABANDONADOS ────────────────────────────────

    process.stdout.write("📊 [CRM] Criando clientes, interações e carrinhos...\n");

    const [custAna, , custBeatriz] = await tx
      .insert(customersTable)
      .values([
        {
          restaurantId: restaurant.id,
          name: "Ana Lima",
          phone: "11911112222",
          email: "ana.lima@email.com",
          birthDate: "1992-03-15",
          firstOrderAt: daysAgo(30),
          lastOrderAt: daysAgo(1),
          avgTicket: 72.5,
          totalOrders: 8,
          totalSpent: 580.0,
          segment: "VIP",
        },
        {
          restaurantId: restaurant.id,
          name: "Ricardo Prado",
          phone: "11922223333",
          email: "ricardo.prado@empresa.com",
          birthDate: "1985-11-20",
          firstOrderAt: daysAgo(60),
          lastOrderAt: daysAgo(1),
          avgTicket: 92.4,
          totalOrders: 5,
          totalSpent: 462.0,
          segment: "VIP",
        },
        {
          restaurantId: restaurant.id,
          name: "Beatriz Souza",
          phone: "11933334444",
          firstOrderAt: daysAgo(15),
          lastOrderAt: daysAgo(1),
          avgTicket: 46.8,
          totalOrders: 2,
          totalSpent: 93.6,
          segment: "NEW",
        },
      ])
      .returning();

    await tx.insert(customerInteractionsTable).values([
      {
        restaurantId: restaurant.id,
        customerId: custBeatriz.id,
        type: "CART_RECOVERY",
        channel: "WHATSAPP",
        message: "Oi Beatriz! Você deixou itens no carrinho. Finalize agora com o cupom BEMVINDO10 e ganhe 10% off! 🍔",
        sentAt: daysAgo(2),
      },
      {
        restaurantId: restaurant.id,
        customerId: custAna.id,
        type: "BIRTHDAY",
        channel: "WHATSAPP",
        message: "Feliz aniversário, Ana! 🎂 Presente da Burger Craft: 20% OFF hoje. Código: ANIVERSARIO.",
        sentAt: daysAgo(5),
      },
    ]);

    await tx.insert(abandonedCartsTable).values([
      {
        restaurantId: restaurant.id,
        sessionId: "sess-abandoned-001",
        status: "ACTIVE",
        customerName: "Usuário Anônimo",
        customerPhone: "11900001111",
        consumptionMethod: "DELIVERY",
        paymentMethod: "PIX",
        subtotal: 46.0,
        total: 51.9,
        itemCount: 1,
        cartSnapshot: [
          { productId: prodComboFrango.id, name: "Combo Frango", quantity: 1, unitPrice: 46.0, lineTotal: 46.0 },
        ],
      },
      {
        restaurantId: restaurant.id,
        sessionId: "sess-abandoned-002",
        status: "CONVERTED",
        customerName: "Beatriz Souza",
        customerPhone: "11933334444",
        consumptionMethod: "TAKEAWAY",
        paymentMethod: "DINHEIRO",
        subtotal: 52.0,
        total: 52.0,
        itemCount: 1,
        cartSnapshot: [
          { productId: prodComboClassico.id, name: "Combo Clássico", quantity: 1, unitPrice: 52.0, lineTotal: 52.0 },
        ],
        convertedOrderId: order3.id,
        convertedAt: daysAgo(1),
      },
    ]);

    await tx.insert(marketingSpendTable).values([
      { restaurantId: restaurant.id, referenceMonth: "2026-05-01", channel: "META_ADS", amountSpent: 800.0, notes: "Campanha Maio — Lançamento Duplo Costela" },
      { restaurantId: restaurant.id, referenceMonth: "2026-06-01", channel: "GOOGLE_ADS", amountSpent: 450.0, notes: "Google Search Ads — Burger SP" },
    ]);

    process.stdout.write("✅ [CRM] Clientes, interações e carrinhos criados.\n");
  });
};

main()
  .then(() => {
    process.stdout.write("\n🎉 Seed concluído com sucesso! Banco de dados populado.\n");
  })
  .catch((error: unknown) => {
    console.error(error);
    process.stderr.write(`\n❌ Falha ao executar seed: ${String(error)}\n`);
    process.exitCode = 1;
  });
