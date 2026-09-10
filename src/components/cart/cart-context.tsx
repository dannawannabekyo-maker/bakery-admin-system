"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  isPreorder: boolean;
  imageUrl: string | null;
  stock: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  hasPreorder: boolean;
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "bakery.cart.v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, hydrated]);

  const add = useCallback<CartContextValue["add"]>((item, qty = 1) => {
    setItems((cur) => {
      const existing = cur.find((i) => i.productId === item.productId);
      if (existing) {
        return cur.map((i) =>
          i.productId === item.productId
            ? {
                ...i,
                quantity: i.isPreorder
                  ? i.quantity + qty
                  : Math.min(i.quantity + qty, i.stock),
              }
            : i,
        );
      }
      return [...cur, { ...item, quantity: qty }];
    });
  }, []);

  const setQty = useCallback<CartContextValue["setQty"]>((productId, qty) => {
    setItems((cur) =>
      cur
        .map((i) =>
          i.productId === productId
            ? {
                ...i,
                quantity: i.isPreorder
                  ? Math.max(1, qty)
                  : Math.max(1, Math.min(qty, i.stock)),
              }
            : i,
        )
        .filter((i) => i.quantity > 0),
    );
  }, []);

  const remove = useCallback<CartContextValue["remove"]>((productId) => {
    setItems((cur) => cur.filter((i) => i.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((n, i) => n + i.quantity, 0);
    const total = items.reduce((n, i) => n + i.quantity * i.price, 0);
    return {
      items,
      count,
      total,
      hasPreorder: items.some((i) => i.isPreorder),
      add,
      setQty,
      remove,
      clear,
    };
  }, [items, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
