"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getUser } from "@/lib/supabaseClient";
import { getCart, addToCart as addToCartDb, removeFromCart as removeFromCartDb, getWishlist, addToWishlist as addToWishlistDb, removeFromWishlist as removeFromWishlistDb, clearCart, clearWishlist } from "@/lib/supabaseDb";

export type Product = {
  id: string;
  name: string;
  price: string;
  image: string;
  size?: string;
};

type StoreContextType = {
  cart: Product[];
  wishlist: Product[];
  isCartOpen: boolean;
  isSearchOpen: boolean;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  toggleCart: () => void;
  toggleSearch: () => void;
  cartTotal: number;
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Product[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Get user ID
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await getUser();
      if (data?.user) {
        setUserId(data.user.id);
      }
    };
    fetchUser();
  }, []);

  // Load from Supabase
  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      const { data: cartData } = await getCart(userId);
      if (cartData) setCart(cartData);

      const { data: wishlistData } = await getWishlist(userId);
      if (wishlistData) setWishlist(wishlistData);
    };

    loadData();
  }, [userId]);

  // Save to Supabase when cart changes
  useEffect(() => {
    if (!userId || cart.length === 0) return;

    const syncCart = async () => {
      // Clear existing cart and add all items
      await clearCart(userId);
      for (const item of cart) {
        await addToCartDb(userId, item);
      }
    };

    syncCart();
  }, [cart, userId]);

  // Save to Supabase when wishlist changes
  useEffect(() => {
    if (!userId || wishlist.length === 0) return;

    const syncWishlist = async () => {
      // Clear existing wishlist and add all items
      await clearWishlist(userId);
      for (const item of wishlist) {
        await addToWishlistDb(userId, item);
      }
    };

    syncWishlist();
  }, [wishlist, userId]);

  const addToCart = (product: Product) => {
    setCart((prev) => [...prev, product]);
    setIsCartOpen(true); // Open cart when adding
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const addToWishlist = (product: Product) => {
    if (!isInWishlist(product.id)) {
      setWishlist((prev) => [...prev, product]);
    }
  };

  const removeFromWishlist = (productId: string) => {
    setWishlist((prev) => prev.filter((item) => item.id !== productId));
  };

  const isInWishlist = (productId: string) => {
    return wishlist.some((item) => item.id === productId);
  };

  const toggleCart = () => setIsCartOpen(!isCartOpen);
  const toggleSearch = () => setIsSearchOpen(!isSearchOpen);

  const cartTotal = cart.reduce((total, item) => total + parseFloat(item.price), 0);

  return (
    <StoreContext.Provider
      value={{
        cart,
        wishlist,
        isCartOpen,
        isSearchOpen,
        addToCart,
        removeFromCart,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        toggleCart,
        toggleSearch,
        cartTotal,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}