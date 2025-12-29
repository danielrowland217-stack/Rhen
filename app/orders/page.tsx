"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Package, Clock, CheckCircle, Truck, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/app/dashboard/BottomNav";
import toast, { Toaster } from "react-hot-toast";
import { getUser } from "@/lib/supabaseClient";
import { getOrders } from "@/lib/supabaseDb";

interface CartItem {
  id: string;
  name: string;
  price: string;
  image: string;
  quantity: number;
}

interface OrderData {
  id: string;
  items: CartItem[];
  total: number;
  shipping?: number;
  tax?: number;
  customer_info: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  payment_method: string;
  created_at: string; // Changed from order_date to match DB
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserAndOrders = async () => {
      const { data: userData } = await getUser();
      if (userData?.user) {
        const { data: ordersData, error } = await getOrders(userData.user.id);
        if (error) {
          console.error('Error fetching orders:', error);
          toast.error('Error loading orders');
        } else {
          // Ensure items is parsed if it comes as a string (defensive check)
          const parsedOrders = ordersData?.map((order: any) => ({
            ...order,
            items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
          })) || [];
          setOrders(parsedOrders);
        }
      }
      setIsLoading(false);
    };
    fetchUserAndOrders();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'processing':
        return <Package className="w-4 h-4" />;
      case 'shipped':
        return <Truck className="w-4 h-4" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <XCircle className="w-4 h-4" />;
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
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24">
      <Toaster position="top-center" reverseOrder={false} />

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Orders</h1>
            <p className="text-sm text-gray-500">
              {orders.length} {orders.length === 1 ? 'order' : 'orders'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h2>
            <p className="text-gray-500 mb-6">You haven't placed any orders yet.</p>
            <button
              onClick={() => router.push('/store')}
              className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors"
            >
              Start Shopping
            </button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {orders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
              >
                {/* Order Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">Order #{order.id}</h3>
                    <p className="text-sm text-gray-500" suppressHydrationWarning>
                      {new Date(order.created_at || Date.now()).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(order.status)}
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-3 mb-4">
                  {Array.isArray(order.items) && order.items.map((item, idx) => (
                    <div key={item.id || idx} className="flex gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {item.image && <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{item.name || "Product"}</h4>
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          ₦{((parseFloat(item.price || "0") || 0) * (item.quantity || 1)).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Summary */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      <p>Items: {Array.isArray(order.items) ? order.items.reduce((total, item) => total + (item.quantity || 0), 0) : 0}</p>
                      {/* Shipping and Tax are not stored in DB currently, so we hide or show 0 if undefined */}
                      {order.shipping !== undefined && <p>Shipping: ₦{order.shipping.toLocaleString()}</p>}
                      {order.tax !== undefined && <p>Tax: ₦{order.tax.toLocaleString()}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total</p>
                      <p className="text-xl font-bold text-gray-900" suppressHydrationWarning>₦{(order.total || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Shipping Details</h4>
                  <div className="text-sm text-gray-600">
                    <p>{order.customer_info?.firstName} {order.customer_info?.lastName}</p>
                    <p>{order.customer_info?.address}</p>
                    <p>{order.customer_info?.city}, {order.customer_info?.state} {order.customer_info?.zipCode}</p>
                    <p>{order.customer_info?.phone}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
