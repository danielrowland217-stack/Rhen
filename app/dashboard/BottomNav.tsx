"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Store, ShoppingBag, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/store', label: 'Store', icon: Store },
  { href: '/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/store/dashboard/goals', label: 'Growth', icon: TrendingUp },
];

export const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200 p-2 sm:hidden z-50">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.label} href={item.href} passHref legacyBehavior>
              <motion.a
                className="flex-1 flex flex-col items-center justify-center h-16 rounded-lg relative"
                whileTap={{ scale: 0.9, backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
                transition={{ duration: 0.1 }}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 bg-red-100 rounded-lg"
                  />
                )}
                <item.icon className={`w-6 h-6 mb-1 z-10 transition-colors ${isActive ? 'text-red-600' : 'text-gray-500'}`} />
                <span className={`text-xs font-medium z-10 transition-colors ${isActive ? 'text-red-600' : 'text-gray-500'}`}>{item.label}</span>
              </motion.a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};