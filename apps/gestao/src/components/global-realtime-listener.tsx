"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { soundNotifier } from "@/lib/sound-notifications";

interface GlobalRealtimeListenerProps {
  slug: string;
}

export function GlobalRealtimeListener({ slug }: GlobalRealtimeListenerProps) {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!slug) return;

    const raw = process.env.NEXT_PUBLIC_WEBSOCKET_URL?.trim();
    let websocketUrl = raw || "http://localhost:4000";
    if (raw && raw.includes("websocket.eeytech.com") && !raw.includes("fswdonalds")) {
      websocketUrl = raw.replace("websocket.eeytech.com", "websocket.fswdonalds.eeytech.com");
    }

    const socket = io(websocketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 5000,
      timeout: 8000,
    });
    socketRef.current = socket;

    const onConnect = () => {
      socket.emit("JOIN_RESTAURANT_ROOM", slug);
      socket.emit("join-restaurant", slug);
    };

    const handleCallWaiter = (payload: {
      restaurantSlug: string;
      tableId: string;
      tableName: string;
    }) => {
      if (payload.restaurantSlug !== slug) return;

      // 1. Toca som de campainha harmônico e agradável
      soundNotifier.playBell();

      // 2. Notificação em destaque visível em qualquer tela
      toast.warning(`Mesa ${payload.tableName} chamando atendimento!`, {
        id: `call-waiter-${payload.tableId}-${Date.now()}`,
        duration: 15000,
        icon: "🔔",
        description: "Cliente solicitou atendimento pelo cardápio digital.",
        action: {
          label: "Ver Mesas",
          onClick: () => router.push(`/mesas`),
        },
      });
    };

    socket.on("connect", onConnect);
    socket.on("CALL_WAITER", handleCallWaiter);

    return () => {
      socket.off("connect", onConnect);
      socket.off("CALL_WAITER", handleCallWaiter);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [slug, router]);

  return null;
}

export default GlobalRealtimeListener;
