import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";

interface NovoPedidoPayload {
  orderId: number;
  restaurantSlug: string;
}

interface PedidoAtualizadoPayload extends NovoPedidoPayload {
  status?: string;
  paymentStatus?: string;
}

interface ItemAtualizadoPayload {
  orderId: number;
  itemId: string;
  restaurantSlug: string;
  itemStatus: string;
}

interface ChamarGarcomPayload {
  restaurantSlug: string;
  tableId: string;
  tableName: string;
}

interface LocalizacaoEntregadorPayload {
  courierId: string;
  restaurantSlug: string;
  latitude: number;
  longitude: number;
}

interface HandoffHumanoPayload {
  restaurantSlug: string;
  customerPhone: string;
  customerName: string;
}

const app = express();
const httpServer = createServer(app);

const corsOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
  }),
);
app.use(express.json());

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  socket.on("JOIN_RESTAURANT_ROOM", (restaurantSlug: string) => {
    if (!restaurantSlug) {
      return;
    }

    socket.join(restaurantSlug);
  });
});

app.post(
  "/eventos/chamar-garcom",
  (request: express.Request<unknown, unknown, ChamarGarcomPayload>, response) => {
    const { restaurantSlug, tableId, tableName } = request.body;

    if (!restaurantSlug || !tableId) {
      response.status(400).json({ message: "Payload inválido para chamar garçom." });
      return;
    }

    io.to(restaurantSlug).emit("CALL_WAITER", {
      restaurantSlug,
      tableId,
      tableName,
      sentAt: new Date().toISOString(),
    });

    response.status(202).json({ received: true });
  },
);

app.get("/saude", (_request, response) => {
  response.json({
    ok: true,
  });
});

app.post(
  "/eventos/handoff-humano",
  (request: express.Request<unknown, unknown, HandoffHumanoPayload>, response) => {
    const { restaurantSlug, customerPhone, customerName } = request.body;

    if (!restaurantSlug || !customerPhone) {
      response.status(400).json({ message: "Payload inválido para handoff." });
      return;
    }

    io.to(restaurantSlug).emit("HUMAN_HANDOFF_REQUIRED", {
      restaurantSlug,
      customerPhone,
      customerName,
      sentAt: new Date().toISOString(),
    });

    response.status(202).json({ received: true });
  },
);

app.post(
  "/eventos/novo-pedido",
  (request: express.Request<unknown, unknown, NovoPedidoPayload>, response) => {
    const { orderId, restaurantSlug } = request.body;

    if (!orderId || !restaurantSlug) {
      response.status(400).json({
        message: "Payload inválido para novo pedido.",
      });
      return;
    }

    io.to(restaurantSlug).emit("NEW_ORDER", {
      orderId,
      restaurantSlug,
      sentAt: new Date().toISOString(),
    });

    response.status(202).json({
      received: true,
    });
  },
);

app.post(
  "/eventos/pedido-atualizado",
  (
    request: express.Request<unknown, unknown, PedidoAtualizadoPayload>,
    response,
  ) => {
    const { orderId, restaurantSlug, paymentStatus, status } = request.body;

    if (!orderId || !restaurantSlug) {
      response.status(400).json({
        message: "Payload inválido para atualização de pedido.",
      });
      return;
    }

    io.to(restaurantSlug).emit("ORDER_UPDATED", {
      orderId,
      restaurantSlug,
      status,
      paymentStatus,
      sentAt: new Date().toISOString(),
    });

    response.status(202).json({
      received: true,
    });
  },
);

app.post(
  "/eventos/item-atualizado",
  (
    request: express.Request<unknown, unknown, ItemAtualizadoPayload>,
    response,
  ) => {
    const { orderId, itemId, restaurantSlug, itemStatus } = request.body;

    if (!orderId || !itemId || !restaurantSlug) {
      response.status(400).json({ message: "Payload inválido para item atualizado." });
      return;
    }

    io.to(restaurantSlug).emit("ITEM_UPDATED", {
      orderId,
      itemId,
      restaurantSlug,
      itemStatus,
      sentAt: new Date().toISOString(),
    });

    response.status(202).json({ received: true });
  },
);

app.post(
  "/eventos/localizacao-entregador",
  (
    request: express.Request<unknown, unknown, LocalizacaoEntregadorPayload>,
    response,
  ) => {
    const { courierId, restaurantSlug, latitude, longitude } = request.body;

    if (!courierId || !restaurantSlug) {
      response.status(400).json({ message: "Payload inválido." });
      return;
    }

    io.to(restaurantSlug).emit("COURIER_LOCATION_UPDATE", {
      courierId,
      restaurantSlug,
      latitude,
      longitude,
      sentAt: new Date().toISOString(),
    });

    response.status(202).json({ received: true });
  },
);

const port = Number(process.env.PORT ?? 4000);

httpServer.listen(port, () => {
  process.stdout.write(
    `Servidor de tempo real iniciado na porta ${String(port)}.\n`,
  );
});
