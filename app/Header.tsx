"use client";

import Link from "next/link";
import { useStore } from "./store-provider";
import { ThemeToggle } from "./theme-toggle";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["700"] });

export function Header() {
  const { cart, toggleCart, toggleSearch, wishlist } = useStore();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 p-6 flex items-center justify-between pointer-events-none">
      {/* Logo */}
      <div className="pointer-events-auto">
        <Link href="/" className={`${playfair.className} text-3xl font-black uppercase tracking-widest text-white mix-blend-difference`}>
          RHEN
        </Link>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 pointer-events-auto">
        <button onClick={toggleSearch} className="p-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>

        <Link href="/wishlist" className="p-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors text-white relative">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
          {wishlist.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-[10px] flex items-center justify-center font-bold">
              {wishlist.length}
            </span>
          )}
        </Link>

        <button onClick={toggleCart} className="p-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors text-white relative">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
          </svg>
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-[10px] flex items-center justify-center font-bold">
              {cart.length}
            </span>
          )}
        </button>

        <ThemeToggle />
      </div>
    </header>
  );
}