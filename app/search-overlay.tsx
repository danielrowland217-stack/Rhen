"use client";

import { useState } from "react";
import { useStore } from "./store-provider";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

// Mock Data for Search
const SEARCH_ITEMS = [
  { id: "urban-explorer", name: "Urban Explorer Jacket", price: 450, image: "/234.jpg" },
  { id: "midnight-gala", name: "Midnight Gala Shoes", price: 250, image: "/Shoes-Men.jpg" },
  { id: "casual-chic", name: "Casual Chic Handbag", price: 1200, image: "/Kaidifeiniroo-K015-Wholesale-Designer-Bags-Women-Famous-Brands-Luxury-Designer-Fashion-Lady-Handbag-for-Women.avif" },
];

export function SearchOverlay() {
  const { isSearchOpen, toggleSearch } = useStore();
  const [query, setQuery] = useState("");

  const filteredItems = query
    ? SEARCH_ITEMS.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed inset-0 bg-background/95 backdrop-blur-xl z-[80] p-8"
        >
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-end mb-8">
              <button onClick={toggleSearch} className="p-2 hover:bg-muted rounded-full">
                ✕ Close
              </button>
            </div>

            <input
              type="text"
              placeholder="Search for products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent border-b-2 border-foreground/20 text-4xl font-bold py-4 focus:outline-none focus:border-foreground placeholder:text-muted-foreground/50"
              autoFocus
            />

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/product/${item.id}`}
                  onClick={toggleSearch}
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-muted transition-colors group"
                >
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg group-hover:text-red-600 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-muted-foreground">${item.price}</p>
                  </div>
                </Link>
              ))}
              {query && filteredItems.length === 0 && (
                <p className="text-muted-foreground text-lg">No results found for "{query}"</p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}