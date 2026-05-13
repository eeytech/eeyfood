import { db } from "./client.js";
import {
  menuCategoriesTable,
  orderProductsTable,
  ordersTable,
  productsTable,
  restaurantsTable,
} from "./schema.js";

const main = async () => {
  await db.transaction(async (tx) => {
    await tx.delete(orderProductsTable);
    await tx.delete(ordersTable);
    await tx.delete(productsTable);
    await tx.delete(menuCategoriesTable);
    await tx.delete(restaurantsTable);

    const [restaurant] = await tx
      .insert(restaurantsTable)
      .values({
        name: "FSW Donalds",
        slug: "fsw-donalds",
        description: "O melhor fast-food do mundo",
        avatarImageUrl:
          "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQvcNP9rHlEJu1vCY5kLqzjf29HKaeN78Z6pRy",
        coverImageUrl:
          "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQac8bHYlkBUjlHSKiuseLm2hIFzVY0OtxEPnw",
      })
      .returning();

    const [combosCategory] = await tx
      .insert(menuCategoriesTable)
      .values({
        name: "Combos",
        restaurantId: restaurant.id,
      })
      .returning();

    await tx.insert(productsTable).values([
      {
        name: "McOferta Média Big Mac Duplo",
        description:
          "Quatro hambúrgueres, alface americana, queijo cheddar, molho especial, cebola, picles e pão com gergelim, acompanhamento e bebida.",
        price: 39.9,
        imageUrl:
          "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQaHB8tslkBUjlHSKiuseLm2hIFzVY0OtxEPnw",
        menuCategoryId: combosCategory.id,
        restaurantId: restaurant.id,
        ingredients: [
          "Pão com gergelim",
          "Hambúrguer de carne 100% bovina",
          "Alface americana",
          "Queijo cheddar",
          "Molho especial",
          "Cebola",
          "Picles",
        ],
      },
      {
        name: "Novo Brabo Melt Onion Rings",
        description:
          "Dois hambúrgueres bovinos, maionese especial, onion rings, bacon, queijo cheddar e molho cremoso no pão brioche, com acompanhamento e bebida.",
        price: 41.5,
        imageUrl:
          "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQeGQofnEPyQaHEV2WL8rGUs41oMICtYfNkphl",
        menuCategoryId: combosCategory.id,
        restaurantId: restaurant.id,
        ingredients: [
          "Pão brioche",
          "Hambúrguer bovino",
          "Maionese especial",
          "Onion rings",
          "Bacon",
          "Queijo cheddar",
          "Molho cremoso de cheddar",
        ],
      },
      {
        name: "McCrispy Chicken Elite",
        description:
          "Pão brioche com batata, molho Honey&Fire, bacon, alface, tomate, cheddar e filé de peito de frango empanado, com acompanhamento e bebida.",
        price: 39.9,
        imageUrl:
          "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQr12aTqPo3SsGjBJCaM7yhxnbDlXeL5N9dckv",
        menuCategoryId: combosCategory.id,
        restaurantId: restaurant.id,
        ingredients: [
          "Pão brioche",
          "Batata",
          "Molho Honey&Fire",
          "Bacon",
          "Alface",
          "Tomate",
          "Queijo cheddar",
          "Frango empanado",
        ],
      },
    ]);

    const [burgersCategory] = await tx
      .insert(menuCategoriesTable)
      .values({
        name: "Lanches",
        restaurantId: restaurant.id,
      })
      .returning();

    await tx.insert(productsTable).values([
      {
        name: "Big Mac",
        description:
          "Quatro hambúrgueres bovinos, alface americana, cheddar, molho especial, cebola, picles e pão com gergelim.",
        ingredients: [
          "Pão com gergelim",
          "Hambúrguer bovino",
          "Alface americana",
          "Queijo cheddar",
          "Molho especial",
          "Cebola",
          "Picles",
        ],
        price: 39.9,
        imageUrl:
          "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQKfI6fivqActTvBGLXfQe4a8CJ6d3HiR7USPK",
        menuCategoryId: burgersCategory.id,
        restaurantId: restaurant.id,
      },
      {
        name: "Duplo Quarterão",
        description:
          "Dois hambúrgueres bovinos, maionese especial, bacon, cheddar e molho cremoso no pão brioche.",
        ingredients: [
          "Pão brioche",
          "Hambúrguer bovino",
          "Maionese especial",
          "Bacon",
          "Queijo cheddar",
          "Molho cremoso de cheddar",
        ],
        price: 41.5,
        imageUrl:
          "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQ99rtECuYaDgmA4VujBU0wKn2ThXJvF3LHfyc",
        menuCategoryId: burgersCategory.id,
        restaurantId: restaurant.id,
      },
      {
        name: "McMelt",
        description:
          "Pão brioche, molho Honey&Fire, bacon, alface, tomate, cheddar e frango empanado.",
        ingredients: [
          "Pão brioche",
          "Molho Honey&Fire",
          "Bacon",
          "Alface",
          "Tomate",
          "Queijo cheddar",
          "Frango empanado",
        ],
        price: 39.9,
        imageUrl:
          "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQUY0VlDTmvPeJLoyOjzNsMqFdxUI423nBl6br",
        menuCategoryId: burgersCategory.id,
        restaurantId: restaurant.id,
      },
    ]);

    const [friesCategory] = await tx
      .insert(menuCategoriesTable)
      .values({
        name: "Fritas",
        restaurantId: restaurant.id,
      })
      .returning();

    await tx.insert(productsTable).values([
      {
        name: "Fritas Grande",
        description: "Batatas fritas crocantes e sequinhas em porção generosa.",
        ingredients: [],
        price: 10.9,
        imageUrl:
          "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQNd3jSNrcJroaszwjUAlM6iSO5ZTx2HV70t31",
        menuCategoryId: friesCategory.id,
        restaurantId: restaurant.id,
      },
      {
        name: "Fritas Média",
        description: "Batatas fritas crocantes e sequinhas em porção média.",
        ingredients: [],
        price: 9.9,
        imageUrl:
          "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQ7Y6lv9tkc0L9oMIXZsFJtwnBh2KCz3y6uSW1",
        menuCategoryId: friesCategory.id,
        restaurantId: restaurant.id,
      },
      {
        name: "Fritas Pequena",
        description: "Batatas fritas crocantes e sequinhas em porção individual.",
        ingredients: [],
        price: 5.9,
        imageUrl:
          "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQ5toOZxYa1oARJCUGh4EY3x8NjXHtvZ7lnVfw",
        menuCategoryId: friesCategory.id,
        restaurantId: restaurant.id,
      },
    ]);

    const [drinksCategory] = await tx
      .insert(menuCategoriesTable)
      .values({
        name: "Bebidas",
        restaurantId: restaurant.id,
      })
      .returning();

    await tx.insert(productsTable).values([
      {
        name: "Coca-Cola",
        description: "Refrigerante gelado para acompanhar seu lanche.",
        ingredients: [],
        price: 5.9,
        imageUrl:
          "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQJS1b33q29eEsh0CVmOywrqx1UPnJpRGcHN5v",
        menuCategoryId: drinksCategory.id,
        restaurantId: restaurant.id,
      },
      {
        name: "Fanta Laranja",
        description: "Refrigerante gelado para acompanhar seu lanche.",
        ingredients: [],
        price: 5.9,
        imageUrl:
          "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQW7Kxm9gniS9XCLQu7Nb4jvBYZze16goaOqsK",
        menuCategoryId: drinksCategory.id,
        restaurantId: restaurant.id,
      },
      {
        name: "Água Mineral",
        description: "Uma opção leve e refrescante para sua refeição.",
        ingredients: [],
        price: 2.9,
        imageUrl:
          "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQ7i05S5tkc0L9oMIXZsFJtwnBh2KCz3y6uSW1",
        menuCategoryId: drinksCategory.id,
        restaurantId: restaurant.id,
      },
    ]);

    const [dessertsCategory] = await tx
      .insert(menuCategoriesTable)
      .values({
        name: "Sobremesas",
        restaurantId: restaurant.id,
      })
      .returning();

    await tx.insert(productsTable).values([
      {
        name: "Casquinha de Baunilha",
        description: "Casquinha de sorvete sabor baunilha.",
        ingredients: [],
        price: 3.9,
        imageUrl:
          "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQtfuQrAKkI75oJfPT0crZxvX82ui9qV3hLFdY",
        menuCategoryId: dessertsCategory.id,
        restaurantId: restaurant.id,
      },
      {
        name: "Casquinha de Chocolate",
        description: "Casquinha de sorvete sabor chocolate.",
        ingredients: [],
        price: 3.9,
        imageUrl:
          "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQBH21ijzEVXRoycAtrP9vH45bZ6WDl3QF0a1M",
        menuCategoryId: dessertsCategory.id,
        restaurantId: restaurant.id,
      },
      {
        name: "Casquinha Mista",
        description: "Casquinha de sorvete com baunilha e chocolate.",
        ingredients: [],
        price: 2.9,
        imageUrl:
          "https://u9a6wmr3as.ufs.sh/f/jppBrbk0cChQ4rBrtULypXmR6JiWuhzS8ALjVkrF3yfatC7E",
        menuCategoryId: dessertsCategory.id,
        restaurantId: restaurant.id,
      },
    ]);
  });
};

main()
  .then(() => {
    process.stdout.write("Seed concluído com sucesso.\n");
  })
  .catch((error: unknown) => {
    process.stderr.write(`Falha ao executar seed: ${String(error)}\n`);
    process.exitCode = 1;
  });
