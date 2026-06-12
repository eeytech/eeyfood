"use client";

import { createContext, ReactNode, useState } from "react";

import type { Product } from "@/lib/db";

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
  const [products, setProducts] = useState<CartProduct[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const total = products.reduce((acc, product) => {
    const optionsTotal =
      product.selectedOptions?.reduce((sum, opt) => sum + opt.price, 0) || 0;
    return acc + (product.price + optionsTotal) * product.quantity;
  }, 0);

  const totalQuantity = products.reduce((acc, product) => {
    return acc + product.quantity;
  }, 0);

  const toggleCart = () => {
    setIsOpen((prev) => !prev);
  };

  const clearCart = () => {
    setProducts([]);
  };

  const addProduct = (product: CartProduct) => {
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
