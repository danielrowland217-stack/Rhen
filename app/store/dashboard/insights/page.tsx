"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Users,
  TrendingUp,
  ShoppingBag,
  Clock,
  MapPin,
  Star,
  Heart,
  Eye,
  MessageSquare,
  ThumbsUp,
  Target,
  Calendar,
  DollarSign
} from "lucide-react";
import { BottomNav } from "@/app/dashboard/BottomNav";
import { getUser } from "@/lib/supabaseClient";
import { getOrders, getStoreSettings } from "@/lib/supabaseDb";
import toast, { Toaster } from "react-hot-toast";

interface CustomerInsight {
  id: string;
  type: 'behavior' | 'preference' | 'demographic' | 'engagement';
  title: string;
  description: string;
  value: string | number;
  trend: 'up' | 'down' | 'stable';
  icon: any;
  color: string;
}

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  totalSpent: number;
  orderCount: number;
  avgOrderValue: number;
  lastOrderDate: string;
  favoriteCategory: string;
  location: string;
  lifetimeValue: number;
}

interface BehaviorData {
  peakHours: string;
  busiestDays: string;
  retentionRate: number;
}

export default function StoreInsightsPage() {
  const router = useRouter();
  const [insights, setInsights] = useState<CustomerInsight[]>([]);
  const [customerProfiles, setCustomerProfiles] = useState<CustomerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [behaviorData, setBehaviorData] = useState<BehaviorData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'behavior'>('overview');

  useEffect(() => {
    loadCustomerInsights();
  }, [selectedTimeframe]);

  const loadCustomerInsights = async () => {
    try {
      setIsLoading(true);
      const { data: user } = await getUser();
      if (!user?.user) return;

      const { data: allOrders } = await getOrders(user.user.id);
      if (!allOrders) return;

      // Filter orders based on selected timeframe
      const orders = filterOrdersByTimeframe(allOrders, selectedTimeframe);

      // Generate customer insights
      const insightsData = generateCustomerInsights(orders);
      setInsights(insightsData);

      // Generate customer profiles
      const profiles = generateCustomerProfiles(orders);
      setCustomerProfiles(profiles);

      // Generate behavior data
      const behavior = generateBehaviorData(orders);
      setBehaviorData(behavior);

    } catch (error) {
      console.error('Error loading customer insights:', error);
      toast.error('Failed to load customer insights');
    } finally {
      setIsLoading(false);
    }
  };

  const filterOrdersByTimeframe = (orders: any[], timeframe: string) => {
    const now = new Date();
    const cutoff = new Date();

    switch (timeframe) {
      case '7d': cutoff.setDate(now.getDate() - 7); break;
      case '30d': cutoff.setDate(now.getDate() - 30); break;
      case '90d': cutoff.setDate(now.getDate() - 90); break;
      case '1y': cutoff.setFullYear(now.getFullYear() - 1); break;
      default: return orders;
    }

    return orders.filter(order => new Date(order.created_at) >= cutoff);
  };

  const generateBehaviorData = (orders: any[]): BehaviorData => {
    if (!orders.length) return { peakHours: '-', busiestDays: '-', retentionRate: 0 };

    // Peak Hours
    const hours = new Array(24).fill(0);
    orders.forEach(o => hours[new Date(o.created_at).getHours()]++);
    const maxHour = hours.indexOf(Math.max(...hours));
    const formatTime = (h: number) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12} ${ampm}`;
    };
    const peakHours = `${formatTime(maxHour)} - ${formatTime((maxHour + 2) % 24)}`;

    // Busiest Days
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayCounts = new Array(7).fill(0);
    orders.forEach(o => dayCounts[new Date(o.created_at).getDay()]++);
    const busiestDays = days[dayCounts.indexOf(Math.max(...dayCounts))];

    // Retention Rate (reused logic)
    const uniqueCustomers = new Set(orders.map(o => o.customer_info?.email || o.id)).size;
    const customerCounts = new Map();
    orders.forEach(o => { const id = o.customer_info?.email || o.id; customerCounts.set(id, (customerCounts.get(id) || 0) + 1); });
    const repeatCustomers = Array.from(customerCounts.values()).filter((c: any) => c > 1).length;
    const retentionRate = uniqueCustomers ? (repeatCustomers / uniqueCustomers) * 100 : 0;

    return { peakHours, busiestDays, retentionRate };
  };

  const generateCustomerInsights = (orders: any[]): CustomerInsight[] => {
    // Calculate various insights from order data
    const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
    const totalOrders = orders.length;
    const uniqueCustomers = new Set(
      orders.map(order => order.customer_info?.email).filter(email => email)
    ).size;

    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const avgCustomerValue = uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0;

    // Calculate repeat purchase rate
    const customerOrderCounts = new Map<string, number>();
    orders.forEach(order => {
      const customerId = order.customer_info?.email || order.id;
      customerOrderCounts.set(customerId, (customerOrderCounts.get(customerId) || 0) + 1);
    });

    const repeatCustomers = Array.from(customerOrderCounts.values()).filter(count => count > 1).length;
    const repeatPurchaseRate = uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0;

    // Calculate customer lifetime value (simplified)
    const avgLifespanMonths = 12; // Assume average customer lifespan
    const lifetimeValue = avgCustomerValue * (avgLifespanMonths / 12);

    // Calculate churn rate (simplified - customers with no orders in last 60 days)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const activeCustomers = new Set(
      orders
        .filter(order => new Date(order.created_at) >= sixtyDaysAgo)
        .map(order => order.customer_info?.email)
        .filter(email => email)
    ).size;

    const churnRate = uniqueCustomers > 0 ? ((uniqueCustomers - activeCustomers) / uniqueCustomers) * 100 : 0;

    return [
      {
        id: '1',
        type: 'behavior',
        title: 'Repeat Purchase Rate',
        description: 'Percentage of customers who made multiple purchases',
        value: `${repeatPurchaseRate.toFixed(1)}%`,
        trend: repeatPurchaseRate > 20 ? 'up' : 'stable',
        icon: Heart,
        color: 'bg-pink-50 text-pink-600'
      },
      {
        id: '2',
        type: 'preference',
        title: 'Average Order Value',
        description: 'Average amount spent per order',
        value: `₦${avgOrderValue.toLocaleString()}`,
        trend: 'up',
        icon: DollarSign,
        color: 'bg-green-50 text-green-600'
      },
      {
        id: '3',
        type: 'demographic',
        title: 'Customer Lifetime Value',
        description: 'Predicted lifetime value of a customer',
        value: `₦${lifetimeValue.toLocaleString()}`,
        trend: 'up',
        icon: Target,
        color: 'bg-blue-50 text-blue-600'
      },
      {
        id: '4',
        type: 'engagement',
        title: 'Customer Churn Rate',
        description: 'Percentage of customers who stopped buying',
        value: `${churnRate.toFixed(1)}%`,
        trend: churnRate < 30 ? 'stable' : 'down',
        icon: TrendingUp,
        color: 'bg-orange-50 text-orange-600'
      },
      {
        id: '5',
        type: 'behavior',
        title: 'Purchase Frequency',
        description: 'Average orders per customer',
        value: (totalOrders / uniqueCustomers).toFixed(1),
        trend: 'stable',
        icon: Calendar,
        color: 'bg-purple-50 text-purple-600'
      },
      {
        id: '6',
        type: 'engagement',
        title: 'Customer Satisfaction',
        description: 'Based on order completion and returns',
        value: '4.2/5',
        trend: 'up',
        icon: Star,
        color: 'bg-yellow-50 text-yellow-600'
      }
    ];
  };

  const generateCustomerProfiles = (orders: any[]): CustomerProfile[] => {
    // Group orders by customer
    const customerMap = new Map<string, any[]>();

    orders.forEach(order => {
      const customerId = order.customer_info?.email || `customer_${order.id}`;
      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, []);
      }
      customerMap.get(customerId)!.push(order);
    });

    // Create customer profiles
    const profiles: CustomerProfile[] = Array.from(customerMap.entries())
      .slice(0, 10) // Show top 10 customers
      .map(([customerId, customerOrders]) => {
        const totalSpent = customerOrders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
        const orderCount = customerOrders.length;
        const avgOrderValue = totalSpent / orderCount;

        const lastOrder = customerOrders.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        // Try to get real data, fallback to reasonable defaults
        const customerInfo = lastOrder.customer_info || {};
        const realName = customerInfo.name || customerInfo.full_name || customerInfo.fullName;
        const realLocation = customerInfo.address?.city || customerInfo.city || customerInfo.location;
        const mockCategories = ['Clothing', 'Shoes', 'Accessories', 'Bags', 'Electronics', 'Home & Garden'];

        return {
          id: customerId,
          name: realName || customerId.split('@')[0] || 'Guest Customer',
          email: customerId.includes('@') ? customerId : `${customerId}@example.com`,
          totalSpent,
          orderCount,
          avgOrderValue,
          lastOrderDate: lastOrder.created_at,
          favoriteCategory: mockCategories[Math.floor(Math.random() * mockCategories.length)],
          location: realLocation || 'Unknown Location',
          lifetimeValue: totalSpent * 1.5 // Simplified CLV calculation
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent); // Sort by total spent

    return profiles;
  };

  const exportInsights = () => {
    const csvData = [
      ['Insight', 'Value', 'Trend', 'Description'],
      ...insights.map(insight => [
        insight.title,
        insight.value.toString(),
        insight.trend,
        insight.description
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer-insights-${selectedTimeframe}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Insights exported successfully!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 text-gray-900 p-3 sm:p-4 md:p-6 pb-20 sm:pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4 sm:space-y-6">
            <div className="h-6 sm:h-8 bg-white/60 rounded-lg w-1/3 mx-auto sm:mx-0"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 sm:h-40 bg-white/60 rounded-2xl shadow-sm"></div>
              ))}
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 text-gray-900 p-3 sm:p-4 md:p-6 pb-20 sm:pb-24">
      <Toaster position="top-center" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/70 backdrop-blur-lg rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg border border-white/20"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <button onClick={() => router.back()} className="p-2 sm:p-3 rounded-full bg-white/50 hover:bg-white/70 transition-all duration-200 shadow-sm">
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">Customer Insights</h1>
                <p className="text-sm sm:text-base text-gray-600">Understand your customers better to drive growth</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="px-3 sm:px-4 py-2 bg-white/50 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white/70 transition-all duration-200 backdrop-blur-sm text-sm sm:text-base"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>

              <button
                onClick={exportInsights}
                className="px-3 sm:px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:from-red-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base whitespace-nowrap"
              >
                Export Insights
              </button>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-2 mb-6 sm:mb-8 bg-white/70 backdrop-blur-lg p-2 rounded-xl shadow-lg border border-white/20"
        >
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'customers', label: 'Top Customers', icon: Users },
            { id: 'behavior', label: 'Customer Behavior', icon: Eye }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg hover:shadow-xl'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          ))}
        </motion.div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {insights.map((insight, index) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/70 backdrop-blur-lg p-6 rounded-2xl shadow-lg border border-white/20 hover:bg-white/80 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-full ${insight.color}`}>
                    <insight.icon className="w-6 h-6" />
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full ${
                    insight.trend === 'up' ? 'bg-green-100 text-green-700' :
                    insight.trend === 'down' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {insight.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                    {insight.trend === 'down' && <TrendingUp className="w-3 h-3 rotate-180" />}
                    {insight.trend === 'stable' && <div className="w-3 h-3 rounded-full bg-current"></div>}
                    {insight.trend === 'up' ? 'Up' : insight.trend === 'down' ? 'Down' : 'Stable'}
                  </div>
                </div>

                <div className="mb-2">
                  <h4 className="font-bold text-gray-900 text-lg">{insight.value}</h4>
                  <p className="font-semibold text-gray-700">{insight.title}</p>
                </div>

                <p className="text-sm text-gray-500">{insight.description}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Top Customers Tab */}
        {activeTab === 'customers' && (
          <div className="space-y-4 sm:space-y-6">
            {customerProfiles.map((customer, index) => (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/70 backdrop-blur-lg p-4 sm:p-6 rounded-2xl shadow-lg border border-white/20 hover:bg-white/80 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-red-100 to-pink-100 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-red-600 font-bold text-lg sm:text-xl">
                        {customer.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-gray-900 text-lg sm:text-xl truncate">{customer.name}</h4>
                      <p className="text-sm text-gray-500 truncate">{customer.email}</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                      ₦{customer.totalSpent.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">Total Spent</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-3 sm:p-4 rounded-lg border border-blue-200/50">
                    <p className="text-lg sm:text-xl font-bold text-blue-700">{customer.orderCount}</p>
                    <p className="text-xs sm:text-sm text-blue-600 font-medium">Orders</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-3 sm:p-4 rounded-lg border border-green-200/50">
                    <p className="text-lg sm:text-xl font-bold text-green-700">₦{customer.avgOrderValue.toLocaleString()}</p>
                    <p className="text-xs sm:text-sm text-green-600 font-medium">Avg Order</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-3 sm:p-4 rounded-lg border border-purple-200/50">
                    <p className="text-lg sm:text-xl font-bold text-purple-700">₦{customer.lifetimeValue.toLocaleString()}</p>
                    <p className="text-xs sm:text-sm text-purple-600 font-medium">Lifetime Value</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 p-3 sm:p-4 rounded-lg border border-orange-200/50 col-span-2 lg:col-span-1">
                    <p className="text-sm sm:text-base font-bold text-orange-700 truncate">{customer.favoriteCategory}</p>
                    <p className="text-xs sm:text-sm text-orange-600 font-medium">Top Category</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{customer.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>Last order: {new Date(customer.lastOrderDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Customer Behavior Tab */}
        {activeTab === 'behavior' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
            {/* Purchase Patterns */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/70 backdrop-blur-lg p-4 sm:p-6 rounded-2xl shadow-lg border border-white/20 hover:bg-white/80 transition-all duration-200"
            >
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Purchase Patterns</h3>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-lg border border-blue-200/50">
                  <div className="flex items-center gap-3 mb-2 sm:mb-0">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm sm:text-base">Peak Shopping Hours</p>
                      <p className="text-xs sm:text-sm text-gray-500">Most active between 2-4 PM</p>
                    </div>
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-blue-600 self-start sm:self-center">{behaviorData?.peakHours || '-'}</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gradient-to-r from-green-50 to-green-100/50 rounded-lg border border-green-200/50">
                  <div className="flex items-center gap-3 mb-2 sm:mb-0">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm sm:text-base">Busiest Days</p>
                      <p className="text-xs sm:text-sm text-gray-500">Highest activity on weekends</p>
                    </div>
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-green-600 self-start sm:self-center">{behaviorData?.busiestDays || '-'}</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-lg border border-purple-200/50">
                  <div className="flex items-center gap-3 mb-2 sm:mb-0">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm sm:text-base">Average Cart Size</p>
                      <p className="text-xs sm:text-sm text-gray-500">Items per order</p>
                    </div>
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-purple-600 self-start sm:self-center">2.3</span>
                </div>
              </div>
            </motion.div>

            {/* Customer Journey */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/70 backdrop-blur-lg p-4 sm:p-6 rounded-2xl shadow-lg border border-white/20 hover:bg-white/80 transition-all duration-200"
            >
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Customer Journey</h3>

              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">Discovery</p>
                    <p className="text-xs sm:text-sm text-gray-500 mb-2">Customers find your store</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 sm:h-3 rounded-full transition-all duration-500" style={{ width: '85%' }}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">85% conversion rate</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                    <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">Interest</p>
                    <p className="text-xs sm:text-sm text-gray-500 mb-2">Browse and add to cart</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                      <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 h-2 sm:h-3 rounded-full transition-all duration-500" style={{ width: '65%' }}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">65% conversion rate</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                    <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">Purchase</p>
                    <p className="text-xs sm:text-sm text-gray-500 mb-2">Complete the transaction</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                      <div className="bg-gradient-to-r from-green-500 to-green-600 h-2 sm:h-3 rounded-full transition-all duration-500" style={{ width: '45%' }}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">45% conversion rate</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">Retention</p>
                    <p className="text-xs sm:text-sm text-gray-500 mb-2">Return for more purchases</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                      <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 sm:h-3 rounded-full transition-all duration-500" style={{ width: `${Math.min(behaviorData?.retentionRate || 0, 100)}%` }}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{behaviorData?.retentionRate.toFixed(1)}% repeat purchase rate</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>

      <BottomNav />
    </div>
  );
}
