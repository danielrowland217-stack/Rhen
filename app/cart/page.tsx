"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/app/dashboard/BottomNav";
import toast, { Toaster } from "react-hot-toast";
import { getUser } from "@/lib/supabaseClient";
import { getCart, removeFromCart as removeFromCartDb, clearCart, getCoupon } from "@/lib/supabaseDb";

interface CartItem {
  id: string;
  name: string;
  price: string;
  image: string;
  quantity: number;
}

export default function CartPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserAndCart = async () => {
      const { data } = await getUser();
      if (data?.user) {
        setUserId(data.user.id);
        const { data: cartData, error } = await getCart(data.user.id);
        if (error) {
          console.error('Error fetching cart:', error);
          toast.error('Error loading cart');
        } else {
          setCartItems(cartData || []);
        }
      }
      setIsLoading(false);
    };
    fetchUserAndCart();
  }, []);

  const handleQuantityChange = (id: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQuantity = item.quantity + delta;
        return { ...item, quantity: newQuantity > 0 ? newQuantity : 1 };
      }
      return item;
    }));
  };

  const handleRemoveItem = async (id: string) => {
    if (userId) {
      const { error } = await removeFromCartDb(userId, id);
      if (error) {
        console.error('Error removing item:', error);
        toast.error('Error removing item from cart');
      } else {
        setCartItems(prev => prev.filter(item => item.id !== id));
        toast.success("Item removed from cart");
      }
    }
  };

  const handleClearCart = async () => {
    if (window.confirm("Are you sure you want to remove all items from your cart?")) {
      if (userId) {
        const { error } = await clearCart(userId);
        if (error) {
          console.error('Error clearing cart:', error);
          toast.error('Error clearing cart');
        } else {
          setCartItems([]);
          setDiscount(0);
          setPromoCode("");
          toast.success("Cart cleared successfully");
        }
      }
    }
  };

  const getSubtotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (parseFloat(item.price) * item.quantity);
    }, 0);
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    
    const toastId = toast.loading("Verifying code...");
    const { data, error } = await getCoupon(promoCode.trim().toUpperCase());
    
    toast.dismiss(toastId);

    if (error || !data) {
      toast.error("Invalid or expired promo code");
      setDiscount(0);
      setAppliedCoupon("");
    } else {
      if (data.discount_type === 'percentage') {
        setDiscount(data.discount_value / 100);
      } else {
        // Handle fixed amount logic if needed, for now assuming percentage for simplicity in UI
        setDiscount(0); 
      }
      setAppliedCoupon(data.code);
      toast.success(`Promo code applied: ${data.discount_value}% off!`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24 font-sans">
      <Toaster position="top-center" reverseOrder={false} />
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Cart</h1>
            <p className="text-sm text-gray-500">
              {cartItems.reduce((total, item) => total + item.quantity, 0)} items
            </p>
          </div>
          {cartItems.length > 0 && (
            <button
              onClick={handleClearCart}
              className="ml-auto px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear Cart</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <ShoppingBag className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-8">Looks like you haven't added anything to your cart yet.</p>
            <Link
              href="/store/dashboard"
              className="px-8 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors inline-flex items-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <AnimatePresence>
                {cartItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4"
                  >
                    <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-lg font-bold text-red-600 mt-1">₦{parseFloat(item.price).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleQuantityChange(item.id, -1)} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"><Minus className="w-4 h-4" /></button>
                      <span className="font-bold w-6 text-center">{item.quantity}</span>
                      <button onClick={() => handleQuantityChange(item.id, 1)} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"><Plus className="w-4 h-4" /></button>
                    </div>
                    <button onClick={() => handleRemoveItem(item.id)} className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>
                
                <div className="mb-6">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Promo Code (SAVE10)"
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-sm"
                    />
                    <button
                      onClick={handleApplyPromo}
                      className="px-4 py-2 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>₦{getSubtotal().toLocaleString()}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>Discount (10%)</span>
                      <span>-₦{(getSubtotal() * discount).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t border-gray-100">
                    <span>Total</span>
                    <span>₦{(getSubtotal() * (1 - discount)).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-500">Shipping & taxes calculated at checkout.</p>
                </div>
                <Link href={`/checkout${appliedCoupon ? `?code=${appliedCoupon}` : ''}`}>
                  <button
                    className="w-full mt-6 bg-red-600 text-white py-4 rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    Proceed to Checkout
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}