"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  TrendingUp,
  Users,
  ShoppingCart,
  DollarSign,
  BarChart3,
  PieChart,
  Calendar,
  Download,
  Filter
} from "lucide-react";
import { BottomNav } from "@/app/dashboard/BottomNav";
import { getUser } from "@/lib/supabaseClient";
import { getOrders, getStoreSettings } from "@/lib/supabaseDb";
import toast, { Toaster } from "react-hot-toast";

interface Order {
  id: string;
  total_amount: number;
  created_at: string;
  customer_info?: any;
  items?: any[];
  status: string;
}

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  customerCount: number;
  topProducts: { name: string; sales: number; revenue: number }[];
  salesByDay: { date: string; revenue: number; orders: number }[];
  salesByCategory: { category: string; revenue: number; percentage: number }[];
  customerRetention: number;
  conversionRate: number;
}

export default function StoreAnalyticsPage() {
  const router = useRouter();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d'); // 7d, 30d, 90d, 1y
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    loadAnalyticsData();
  }, [dateRange]);

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);
      const { data: user } = await getUser();
      if (!user?.user) return;

      const { data: ordersData } = await getOrders(user.user.id);
      if (!ordersData) return;

      setOrders(ordersData);

      // Filter orders by date range
      const filteredOrders = filterOrdersByDateRange(ordersData, dateRange);

      // Calculate analytics
      const analytics = calculateAnalytics(filteredOrders);
      setAnalyticsData(analytics);

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const filterOrdersByDateRange = (orders: Order[], range: string) => {
    const now = new Date();
    let startDate = new Date();

    switch (range) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    return orders.filter(order => new Date(order.created_at) >= startDate);
  };

  const calculateAnalytics = (orders: Order[]): AnalyticsData => {
    const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Unique customers (based on customer_info or order id)
    const customerEmails = new Set(
      orders
        .map(order => order.customer_info?.email)
        .filter(email => email)
    );
    const customerCount = customerEmails.size;

    // Top products
    const productSales = new Map<string, { sales: number; revenue: number }>();
    orders.forEach(order => {
      if (order.items) {
        order.items.forEach((item: any) => {
          const existing = productSales.get(item.name) || { sales: 0, revenue: 0 };
          productSales.set(item.name, {
            sales: existing.sales + (item.quantity || 1),
            revenue: existing.revenue + (Number(item.price) || 0) * (item.quantity || 1)
          });
        });
      }
    });

    const topProducts = Array.from(productSales.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Sales by day
    const salesByDayMap = new Map<string, { revenue: number; orders: number }>();
    orders.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      const existing = salesByDayMap.get(date) || { revenue: 0, orders: 0 };
      salesByDayMap.set(date, {
        revenue: existing.revenue + (Number(order.total_amount) || 0),
        orders: existing.orders + 1
      });
    });

    const salesByDay = Array.from(salesByDayMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Sales by category (placeholder - would need category data from products)
    const salesByCategory = [
      { category: 'Clothing', revenue: totalRevenue * 0.4, percentage: 40 },
      { category: 'Shoes', revenue: totalRevenue * 0.3, percentage: 30 },
      { category: 'Accessories', revenue: totalRevenue * 0.2, percentage: 20 },
      { category: 'Bags', revenue: totalRevenue * 0.1, percentage: 10 }
    ];

    // Customer retention (simplified)
    const customerRetention = Math.min(customerCount > 0 ? (totalOrders / customerCount) * 100 : 0, 100);

    // Conversion rate (placeholder - would need visit data)
    const conversionRate = 3.2; // 3.2% placeholder

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      customerCount,
      topProducts,
      salesByDay,
      salesByCategory,
      customerRetention,
      conversionRate
    };
  };

  const exportAnalytics = () => {
    if (!analyticsData) return;

    const csvData = [
      ['Metric', 'Value'],
      ['Total Revenue', `₦${analyticsData.totalRevenue.toLocaleString()}`],
      ['Total Orders', analyticsData.totalOrders.toString()],
      ['Average Order Value', `₦${analyticsData.averageOrderValue.toLocaleString()}`],
      ['Customer Count', analyticsData.customerCount.toString()],
      ['Customer Retention', `${analyticsData.customerRetention.toFixed(1)}%`],
      ['Conversion Rate', `${analyticsData.conversionRate}%`],
      [],
      ['Top Products'],
      ['Product', 'Sales', 'Revenue'],
      ...analyticsData.topProducts.map(p => [p.name, p.sales.toString(), `₦${p.revenue.toLocaleString()}`])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `store-analytics-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Analytics exported successfully!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 text-gray-900 p-4 sm:p-6 md:p-8 pb-20 sm:pb-24 md:pb-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8 sm:space-y-10"
          >
            {/* Header Skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="flex items-center gap-4">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl"
                />
                <div className="space-y-2">
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="h-8 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-2xl w-48"
                  />
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                    className="h-4 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-xl w-64"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                  className="h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl w-32"
                />
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
                  className="h-12 bg-gradient-to-r from-red-200 to-red-300 rounded-xl w-24"
                />
              </div>
            </div>

            {/* Metrics Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="relative bg-gradient-to-br from-white via-gray-50/50 to-gray-100/30 p-6 sm:p-7 rounded-3xl shadow-lg border border-gray-100/80 overflow-hidden backdrop-blur-sm"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-200/20 to-gray-300/10 opacity-50"></div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-gray-200/30 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-4">
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl"
                      />
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                        className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20"
                      />
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                      className="h-8 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300 rounded-2xl w-24"
                    />
                    <motion.div
                      animate={{ opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.4 }}
                      className="h-3 bg-gradient-to-r from-gray-100 to-gray-200 rounded w-16"
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Charts Skeleton */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-br from-white via-slate-50/30 to-gray-50/50 p-6 sm:p-8 rounded-3xl shadow-lg border border-gray-100/80 backdrop-blur-sm"
              >
                <div className="flex items-center gap-4 mb-8">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-12 h-12 bg-gradient-to-br from-indigo-200 to-blue-300 rounded-2xl"
                  />
                  <div className="space-y-2">
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24"
                    />
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                      className="h-3 bg-gradient-to-r from-gray-100 to-gray-200 rounded w-32"
                    />
                  </div>
                </div>
                <motion.div
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="h-72 sm:h-80 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100 rounded-2xl"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-gradient-to-br from-white via-slate-50/30 to-gray-50/50 p-6 sm:p-8 rounded-3xl shadow-lg border border-gray-100/80 backdrop-blur-sm"
              >
                <div className="flex items-center gap-4 mb-8">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                    className="w-12 h-12 bg-gradient-to-br from-teal-200 to-cyan-300 rounded-2xl"
                  />
                  <div className="space-y-2">
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
                      className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-28"
                    />
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                      className="h-3 bg-gradient-to-r from-gray-100 to-gray-200 rounded w-36"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + i * 0.1 }}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-2xl border border-gray-100/50"
                    >
                      <div className="flex items-center gap-4">
                        <motion.div
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                          className="w-10 h-10 bg-gradient-to-br from-red-200 to-pink-300 rounded-2xl"
                        />
                        <div className="space-y-2">
                          <motion.div
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                            className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32"
                          />
                          <motion.div
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
                            className="h-3 bg-gradient-to-r from-gray-100 to-gray-200 rounded w-20"
                          />
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                          className="h-5 bg-gradient-to-r from-gray-300 to-gray-400 rounded w-16"
                        />
                        <motion.div
                          animate={{ opacity: [0.3, 0.7, 0.3] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.6 }}
                          className="h-3 bg-gradient-to-r from-gray-100 to-gray-200 rounded w-12"
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Additional Insights Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  className="bg-white p-5 sm:p-6 rounded-2xl shadow-lg border border-gray-100 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 to-gray-100/30 opacity-50"></div>
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                        className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl"
                      />
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                        className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24"
                      />
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                      className="h-6 bg-gradient-to-r from-gray-300 to-gray-400 rounded w-16"
                    />
                    <motion.div
                      animate={{ opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.5 }}
                      className="h-3 bg-gradient-to-r from-gray-100 to-gray-200 rounded w-20"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
        <BottomNav />
      </div>
  );
}

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 text-gray-900 p-4 sm:p-6 md:p-8 pb-20 sm:pb-24 md:pb-6">
      <Toaster position="top-center" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => router.back()}
              className="p-2.5 rounded-xl hover:bg-white/80 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Store Analytics
              </h1>
              <p className="text-sm sm:text-base text-gray-500 mt-1">Detailed insights into your store performance</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white shadow-sm hover:shadow-md transition-all duration-200 text-sm sm:text-base"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>

            <button
              onClick={exportAnalytics}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-sm hover:shadow-lg transform hover:scale-[1.02] text-sm sm:text-base font-medium"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {analyticsData && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="group relative bg-gradient-to-br from-white via-green-50/20 to-emerald-50/30 p-6 sm:p-7 rounded-3xl shadow-lg hover:shadow-2xl border border-gray-100/80 hover:border-green-200/60 transition-all duration-500 hover:scale-[1.03] overflow-hidden backdrop-blur-sm"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-green-400/5 via-emerald-300/5 to-teal-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-green-200/20 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-4 text-gray-600 mb-4">
                    <div className="p-3 bg-gradient-to-br from-green-100 via-emerald-100 to-teal-100 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                      <DollarSign className="w-6 h-6 text-green-700" />
                    </div>
                    <span className="font-bold text-sm uppercase tracking-wider text-gray-700">Total Revenue</span>
                  </div>
                  <p className="text-3xl sm:text-4xl font-black text-gray-900 mb-2 group-hover:text-green-800 transition-colors duration-300">₦{analyticsData.totalRevenue.toLocaleString()}</p>
                  <p className="text-sm text-gray-500 font-medium">In selected period</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="group relative bg-gradient-to-br from-white via-blue-50/20 to-cyan-50/30 p-6 sm:p-7 rounded-3xl shadow-lg hover:shadow-2xl border border-gray-100/80 hover:border-blue-200/60 transition-all duration-500 hover:scale-[1.03] overflow-hidden backdrop-blur-sm"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 via-cyan-300/5 to-sky-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-200/20 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-4 text-gray-600 mb-4">
                    <div className="p-3 bg-gradient-to-br from-blue-100 via-cyan-100 to-sky-100 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                      <ShoppingCart className="w-6 h-6 text-blue-700" />
                    </div>
                    <span className="font-bold text-sm uppercase tracking-wider text-gray-700">Total Orders</span>
                  </div>
                  <p className="text-3xl sm:text-4xl font-black text-gray-900 mb-2 group-hover:text-blue-800 transition-colors duration-300">{analyticsData.totalOrders}</p>
                  <p className="text-sm text-gray-500 font-medium">Orders processed</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="group relative bg-gradient-to-br from-white via-purple-50/20 to-violet-50/30 p-6 sm:p-7 rounded-3xl shadow-lg hover:shadow-2xl border border-gray-100/80 hover:border-purple-200/60 transition-all duration-500 hover:scale-[1.03] overflow-hidden backdrop-blur-sm"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/5 via-violet-300/5 to-fuchsia-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-200/20 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-4 text-gray-600 mb-4">
                    <div className="p-3 bg-gradient-to-br from-purple-100 via-violet-100 to-fuchsia-100 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                      <BarChart3 className="w-6 h-6 text-purple-700" />
                    </div>
                    <span className="font-bold text-sm uppercase tracking-wider text-gray-700">Avg Order Value</span>
                  </div>
                  <p className="text-3xl sm:text-4xl font-black text-gray-900 mb-2 group-hover:text-purple-800 transition-colors duration-300">₦{analyticsData.averageOrderValue.toLocaleString()}</p>
                  <p className="text-sm text-gray-500 font-medium">Per order</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="group relative bg-gradient-to-br from-white via-orange-50/20 to-amber-50/30 p-6 sm:p-7 rounded-3xl shadow-lg hover:shadow-2xl border border-gray-100/80 hover:border-orange-200/60 transition-all duration-500 hover:scale-[1.03] overflow-hidden backdrop-blur-sm"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400/5 via-amber-300/5 to-yellow-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-orange-200/20 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-4 text-gray-600 mb-4">
                    <div className="p-3 bg-gradient-to-br from-orange-100 via-amber-100 to-yellow-100 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                      <Users className="w-6 h-6 text-orange-700" />
                    </div>
                    <span className="font-bold text-sm uppercase tracking-wider text-gray-700">Customers</span>
                  </div>
                  <p className="text-3xl sm:text-4xl font-black text-gray-900 mb-2 group-hover:text-orange-800 transition-colors duration-300">{analyticsData.customerCount}</p>
                  <p className="text-sm text-gray-500 font-medium">Unique customers</p>
                </div>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8 mb-10">
              {/* Sales Trend Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-br from-white via-slate-50/30 to-gray-50/50 p-6 sm:p-8 rounded-3xl shadow-lg hover:shadow-2xl border border-gray-100/80 hover:border-indigo-200/60 transition-all duration-500 backdrop-blur-sm"
              >
                <div className="flex items-center gap-4 text-gray-600 mb-8">
                  <div className="p-3 bg-gradient-to-br from-indigo-100 via-blue-100 to-cyan-100 rounded-2xl shadow-sm">
                    <TrendingUp className="w-6 h-6 text-indigo-700" />
                  </div>
                  <div>
                    <span className="font-bold text-sm uppercase tracking-wider text-gray-700">Sales Trend</span>
                    <p className="text-xs text-gray-500 mt-1">Revenue over time</p>
                  </div>
                </div>

                <div className="h-72 sm:h-80 w-full relative">
                  {analyticsData.salesByDay.length > 0 ? (
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
                          <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#EC4899" stopOpacity="0.05" />
                        </linearGradient>
                        <linearGradient id="gridGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#E5E7EB" stopOpacity="0.9" />
                          <stop offset="100%" stopColor="#F9FAFB" stopOpacity="0.3" />
                        </linearGradient>
                        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#6366F1" />
                          <stop offset="50%" stopColor="#8B5CF6" />
                          <stop offset="100%" stopColor="#EC4899" />
                        </linearGradient>
                      </defs>

                      {/* Enhanced Grid lines */}
                      {[0, 25, 50, 75, 100].map((y) => (
                        <line
                          key={`h-${y}`}
                          x1="0"
                          y1={y}
                          x2="100"
                          y2={y}
                          stroke="url(#gridGradient)"
                          strokeWidth="1"
                          strokeDasharray={y === 0 || y === 100 ? "0" : "2,2"}
                        />
                      ))}

                      {[0, 20, 40, 60, 80, 100].map((x) => (
                        <line
                          key={`v-${x}`}
                          x1={x}
                          y1="0"
                          x2={x}
                          y2="100"
                          stroke="url(#gridGradient)"
                          strokeWidth="1"
                          strokeDasharray={x === 0 || x === 100 ? "0" : "2,2"}
                        />
                      ))}

                      <path
                        d={`M0,100 ${analyticsData.salesByDay.map((d, i) => `L${(i / (analyticsData.salesByDay.length - 1)) * 100},${100 - (d.revenue / (Math.max(...analyticsData.salesByDay.map(d => d.revenue), 1) * 1.1)) * 100}`).join(' ')} L100,100 Z`}
                        fill="url(#analyticsGradient)"
                        className="transition-opacity duration-300 hover:opacity-80"
                      />

                      <path
                        d={`M0,${100 - (analyticsData.salesByDay[0].revenue / (Math.max(...analyticsData.salesByDay.map(d => d.revenue), 1) * 1.1)) * 100} ${analyticsData.salesByDay.map((d, i) => `L${(i / (analyticsData.salesByDay.length - 1)) * 100},${100 - (d.revenue / (Math.max(...analyticsData.salesByDay.map(d => d.revenue), 1) * 1.1)) * 100}`).join(' ')}`}
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="drop-shadow-sm"
                      />

                      {analyticsData.salesByDay.map((d, i) => (
                        <circle
                          key={i}
                          cx={(i / (analyticsData.salesByDay.length - 1)) * 100}
                          cy={100 - (d.revenue / (Math.max(...analyticsData.salesByDay.map(d => d.revenue), 1) * 1.1)) * 100}
                          r="3"
                          fill="white"
                          stroke="url(#lineGradient)"
                          strokeWidth="3"
                          className="hover:r-4 transition-all duration-300 cursor-pointer drop-shadow-md"
                        />
                      ))}
                    </svg>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <div className="p-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl mb-4">
                        <BarChart3 className="w-16 h-16 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">No sales data available</p>
                      <p className="text-xs text-gray-400 mt-1">Data will appear once orders are processed</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Top Products */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-gradient-to-br from-white via-slate-50/30 to-gray-50/50 p-6 sm:p-8 rounded-3xl shadow-lg hover:shadow-2xl border border-gray-100/80 hover:border-teal-200/60 transition-all duration-500 backdrop-blur-sm"
              >
                <div className="flex items-center gap-4 text-gray-600 mb-8">
                  <div className="p-3 bg-gradient-to-br from-teal-100 via-cyan-100 to-emerald-100 rounded-2xl shadow-sm">
                    <BarChart3 className="w-6 h-6 text-teal-700" />
                  </div>
                  <div>
                    <span className="font-bold text-sm uppercase tracking-wider text-gray-700">Top Products</span>
                    <p className="text-xs text-gray-500 mt-1">Best performing items</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {analyticsData.topProducts.length > 0 ? (
                    analyticsData.topProducts.map((product, index) => (
                      <motion.div
                        key={product.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 + index * 0.1 }}
                        className="group flex items-center justify-between p-4 rounded-2xl hover:bg-gradient-to-r hover:from-white hover:to-gray-50/50 border border-gray-100/50 hover:border-teal-200/30 transition-all duration-300 hover:shadow-md hover:scale-[1.02]"
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-10 h-10 bg-gradient-to-br from-red-100 via-pink-100 to-rose-100 rounded-2xl flex items-center justify-center text-red-600 font-black text-sm shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                              {index + 1}
                            </div>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-teal-400 to-cyan-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-gray-900 truncate text-sm sm:text-base group-hover:text-teal-800 transition-colors duration-300">{product.name}</p>
                            <p className="text-xs sm:text-sm text-gray-500 font-medium">{product.sales} sold</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-gray-900 text-sm sm:text-base whitespace-nowrap group-hover:text-teal-700 transition-colors duration-300">₦{product.revenue.toLocaleString()}</p>
                          <p className="text-xs text-gray-400 font-medium">Revenue</p>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <div className="p-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl mb-4">
                        <BarChart3 className="w-16 h-16 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">No product data available</p>
                      <p className="text-xs text-gray-400 mt-1 text-center">Top products will appear once orders are processed</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Additional Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="group relative bg-gradient-to-br from-white via-cyan-50/20 to-teal-50/30 p-6 sm:p-7 rounded-3xl shadow-lg hover:shadow-2xl border border-gray-100/80 hover:border-cyan-200/60 transition-all duration-500 hover:scale-[1.03] overflow-hidden backdrop-blur-sm"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/5 via-teal-300/5 to-emerald-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-200/20 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-4 text-gray-600 mb-4">
                    <div className="p-3 bg-gradient-to-br from-cyan-100 via-teal-100 to-emerald-100 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                      <Users className="w-6 h-6 text-cyan-700" />
                    </div>
                    <span className="font-bold text-sm uppercase tracking-wider text-gray-700">Customer Retention</span>
                  </div>
                  <p className="text-3xl sm:text-4xl font-black text-gray-900 mb-2 group-hover:text-cyan-800 transition-colors duration-300">{analyticsData.customerRetention.toFixed(1)}%</p>
                  <p className="text-sm text-gray-500 font-medium">Repeat purchase rate</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="group relative bg-gradient-to-br from-white via-pink-50/20 to-rose-50/30 p-6 sm:p-7 rounded-3xl shadow-lg hover:shadow-2xl border border-gray-100/80 hover:border-pink-200/60 transition-all duration-500 hover:scale-[1.03] overflow-hidden backdrop-blur-sm"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-pink-400/5 via-rose-300/5 to-fuchsia-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-pink-200/20 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-4 text-gray-600 mb-4">
                    <div className="p-3 bg-gradient-to-br from-pink-100 via-rose-100 to-fuchsia-100 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                      <TrendingUp className="w-6 h-6 text-pink-700" />
                    </div>
                    <span className="font-bold text-sm uppercase tracking-wider text-gray-700">Conversion Rate</span>
                  </div>
                  <p className="text-3xl sm:text-4xl font-black text-gray-900 mb-2 group-hover:text-pink-800 transition-colors duration-300">{analyticsData.conversionRate}%</p>
                  <p className="text-sm text-gray-500 font-medium">Visitors to customers</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="group relative bg-gradient-to-br from-white via-yellow-50/20 to-amber-50/30 p-6 sm:p-7 rounded-3xl shadow-lg hover:shadow-2xl border border-gray-100/80 hover:border-yellow-200/60 transition-all duration-500 hover:scale-[1.03] overflow-hidden backdrop-blur-sm"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-amber-300/5 to-orange-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-yellow-200/20 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-4 text-gray-600 mb-4">
                    <div className="p-3 bg-gradient-to-br from-yellow-100 via-amber-100 to-orange-100 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                      <Calendar className="w-6 h-6 text-yellow-700" />
                    </div>
                    <span className="font-bold text-sm uppercase tracking-wider text-gray-700">Avg. Order Frequency</span>
                  </div>
                  <p className="text-3xl sm:text-4xl font-black text-gray-900 mb-2 group-hover:text-yellow-800 transition-colors duration-300">
                    {analyticsData.customerCount > 0 ? (analyticsData.totalOrders / analyticsData.customerCount).toFixed(1) : '0'}
                  </p>
                  <p className="text-sm text-gray-500 font-medium">Orders per customer</p>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </motion.div>

      <BottomNav />
    </div>
  );
}
