import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
const app = express();
const httpServer = createServer(app);
const corsOrigins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
app.use(cors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
}));
app.use(express.json());
const io = new Server(httpServer, {
    cors: {
        origin: corsOrigins.length > 0 ? corsOrigins : true,
        methods: ["GET", "POST"],
    },
});
io.on("connection", (socket) => {
    socket.on("JOIN_RESTAURANT_ROOM", (restaurantSlug) => {
        if (!restaurantSlug) {
            return;
        }
        socket.join(restaurantSlug);
    });
});
app.get("/saude", (_request, response) => {
    response.json({
        ok: true,
    });
});
app.post("/eventos/novo-pedido", (request, response) => {
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
});
app.post("/eventos/pedido-atualizado", (request, response) => {
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
});
const port = Number(process.env.PORT ?? 4000);
httpServer.listen(port, () => {
    process.stdout.write(`Servidor de tempo real iniciado na porta ${String(port)}.\n`);
});
