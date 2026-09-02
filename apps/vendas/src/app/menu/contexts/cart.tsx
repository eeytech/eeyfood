"use client";

import { createContext, ReactNode, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

import type { Product } from "@/lib/db";
import { trackAddToCart } from "@/hooks/use-pixel-events";

export interface CartProductOption {
  id: string;
  name: string;
  price: number;
}

export interface CartProduct
  extends Pick<Product, "id" | "name" | "price" | "imageUrl"> {
  cartItemId: string; // ID único para diferenciar o mesmo produto com opções diferentes
  quantity: number;
  notes?: string;
  selectedOptions?: CartProductOption[];
}

export interface ICartContext {
  isOpen: boolean;
  products: CartProduct[];
  total: number;
  totalQuantity: number;
  toggleCart: () => void;
  clearCart: () => void;
  addProduct: (product: CartProduct) => void;
  decreaseProductQuantity: (cartItemId: string) => void;
  increaseProductQuantity: (cartItemId: string) => void;
  removeProduct: (cartItemId: string) => void;
}

export const CartContext = createContext<ICartContext>({
  isOpen: false,
  total: 0,
  totalQuantity: 0,
  products: [],
  toggleCart: () => {},
  clearCart: () => {},
  addProduct: () => {},
  decreaseProductQuantity: () => {},
  increaseProductQuantity: () => {},
  removeProduct: () => {},
});

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { slug } = useParams<{ slug: string }>();
  const storageKey = slug ? `cart_${slug}` : null;
  // Prevents the save effect from overwriting localStorage before the load effect applies
  const isFirstRender = useRef(true);

  const [products, setProducts] = useState<CartProduct[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // After mounting in the browser, restore the cart saved for this restaurant
  useEffect(() => {
    if (!storageKey) return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setProducts(JSON.parse(stored) as CartProduct[]);
    } catch {
      // Corrupted data — start with an empty cart
    }
  }, [storageKey]);

  // Persist cart to localStorage on every change, skipping the initial render
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(products));
  }, [products, storageKey]);

  const total = products.reduce((acc, product) => {
    const optionsTotal =
      product.selectedOptions?.reduce(
        (sum, opt) => sum + (typeof opt.price === "number" ? opt.price : Number(opt.price || 0)),
        0,
      ) || 0;
    const prodPrice = typeof product.price === "number" ? product.price : Number(product.price || 0);
    return acc + (prodPrice + optionsTotal) * product.quantity;
  }, 0);

  const totalQuantity = products.reduce((acc, product) => {
    return acc + product.quantity;
  }, 0);

  const toggleCart = () => {
    setIsOpen((prev) => !prev);
  };

  const clearCart = () => {
    setProducts([]);
    if (storageKey) localStorage.removeItem(storageKey);
  };

  const addProduct = (product: CartProduct) => {
    trackAddToCart({ productId: product.id, productName: product.name, price: product.price, quantity: product.quantity });

    const productIsAlreadyOnTheCart = products.some(
      (prevProduct) => prevProduct.cartItemId === product.cartItemId,
    );

    if (!productIsAlreadyOnTheCart) {
      return setProducts((prev) => [...prev, product]);
    }

    setProducts((prevProducts) => {
      return prevProducts.map((prevProduct) => {
        if (prevProduct.cartItemId === product.cartItemId) {
          return {
            ...prevProduct,
            quantity: prevProduct.quantity + product.quantity,
          };
        }

        return prevProduct;
      });
    });
  };

  const decreaseProductQuantity = (cartItemId: string) => {
    setProducts((prevProducts) => {
      return prevProducts.map((prevProduct) => {
        if (prevProduct.cartItemId !== cartItemId) {
          return prevProduct;
        }

        if (prevProduct.quantity === 1) {
          return prevProduct;
        }

        return { ...prevProduct, quantity: prevProduct.quantity - 1 };
      });
    });
  };

  const increaseProductQuantity = (cartItemId: string) => {
    setProducts((prevProducts) => {
      return prevProducts.map((prevProduct) => {
        if (prevProduct.cartItemId !== cartItemId) {
          return prevProduct;
        }

        return { ...prevProduct, quantity: prevProduct.quantity + 1 };
      });
    });
  };

  const removeProduct = (cartItemId: string) => {
    setProducts((prevProducts) =>
      prevProducts.filter((prevProduct) => prevProduct.cartItemId !== cartItemId),
    );
  };

  return (
    <CartContext.Provider
      value={{
        isOpen,
        products,
        toggleCart,
        clearCart,
        addProduct,
        decreaseProductQuantity,
        increaseProductQuantity,
        removeProduct,
        total,
        totalQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
