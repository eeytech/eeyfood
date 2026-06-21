"use client";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function firePixel(event: string, data?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (typeof window.fbq === "function") {
    window.fbq("track", event, data);
  }
}

function fireGtag(event: string, data?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") {
    window.gtag("event", event, data);
  }
}

export function trackViewContent(params: {
  productId: string;
  productName: string;
  price: number;
  currency?: string;
}) {
  firePixel("ViewContent", {
    content_ids: [params.productId],
    content_name: params.productName,
    content_type: "product",
    value: params.price,
    currency: params.currency ?? "BRL",
  });
  fireGtag("view_item", {
    currency: params.currency ?? "BRL",
    value: params.price,
    items: [{ item_id: params.productId, item_name: params.productName, price: params.price }],
  });
}

export function trackAddToCart(params: {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  currency?: string;
}) {
  firePixel("AddToCart", {
    content_ids: [params.productId],
    content_name: params.productName,
    content_type: "product",
    value: params.price * params.quantity,
    currency: params.currency ?? "BRL",
  });
  fireGtag("add_to_cart", {
    currency: params.currency ?? "BRL",
    value: params.price * params.quantity,
    items: [
      {
        item_id: params.productId,
        item_name: params.productName,
        price: params.price,
        quantity: params.quantity,
      },
    ],
  });
}

export function trackInitiateCheckout(params: {
  value: number;
  numItems: number;
  currency?: string;
}) {
  firePixel("InitiateCheckout", {
    value: params.value,
    num_items: params.numItems,
    currency: params.currency ?? "BRL",
  });
  fireGtag("begin_checkout", {
    currency: params.currency ?? "BRL",
    value: params.value,
  });
}

export function trackPurchase(params: {
  orderId: number | string;
  value: number;
  currency?: string;
}) {
  firePixel("Purchase", {
    value: params.value,
    currency: params.currency ?? "BRL",
    order_id: String(params.orderId),
  });
  fireGtag("purchase", {
    transaction_id: String(params.orderId),
    value: params.value,
    currency: params.currency ?? "BRL",
  });
}
