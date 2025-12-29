"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Users,
  DollarSign,
  ShoppingCart,
  Target,
  Mail,
  Share2,
  Filter,
  RefreshCw,
  Eye,
  Clock
} from "lucide-react";
import { BottomNav } from "@/app/dashboard/BottomNav";
import { getUser, supabase } from "@/lib/supabaseClient";
import { getOrders, getStoreSettings } from "@/lib/supabaseDb";
import toast, { Toaster } from "react-hot-toast";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  customer_info?: {
    email?: string;
  };
  items?: OrderItem[];
}

interface ReportData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  customerCount: number;
  conversionRate: number;
  topProducts: { name: string; sales: number; revenue: number }[];
  salesByPeriod: { period: string; revenue: number; orders: number; growth: number }[];
  customerRetention: number;
  monthlyGrowth: number;
  yearlyGrowth: number;
}

interface ReportConfig {
  dateRange: '7d' | '30d' | '90d' | '1y' | 'custom';
  reportType: 'overview' | 'sales' | 'customers' | 'products' | 'performance';
  customStartDate?: string;
  customEndDate?: string;
  includeCharts: boolean;
  includeTrends: boolean;
  estimatedVisits: number;
}

export default function StoreReportsPage() {
  const router = useRouter();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [config, setConfig] = useState<ReportConfig>({
    dateRange: '30d',
    reportType: 'overview',
    includeCharts: true,
    includeTrends: true,
    estimatedVisits: 1000
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; value: number; label: string } | null>(null);
  const [templateColors, setTemplateColors] = useState({
    primary: "#DC2626",
    secondary: "#FFFFFF",
    accent: "#FEE2E2",
    background: "#FEF2F2"
  });

  useEffect(() => {
    fetchOrders();
    fetchTheme();
  }, []);

  const fetchTheme = async () => {
    const { data: user } = await getUser();
    if (user?.user) {
      const { data: settings } = await supabase
        .from('store_settings')
        .select('template_colors')
        .eq('user_id', user.user.id)
        .single();
      
      if (settings?.template_colors) {
        setTemplateColors(settings.template_colors);
      }
    }
  };

  useEffect(() => {
    if (orders.length > 0) {
      const data = generateReportData(orders, config);
      setReportData(data);
    }
  }, [orders, config]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const { data: user } = await getUser();
      if (!user?.user) return;

      const { data: ordersData } = await getOrders(user.user.id);
      if (!ordersData) return;

      setOrders(ordersData as Order[]);

    } catch (error) {
      console.error('Error loading report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  };

  const generateReportData = (orders: Order[], config: ReportConfig): ReportData => {
    const filteredOrders = filterOrdersByDateRange(orders, config.dateRange);

    // Calculate basic metrics
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
    const totalOrders = filteredOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Unique customers
    const customerOrders = new Map<string, number>();
    filteredOrders.forEach(order => {
      const email = order.customer_info?.email;
      if (email) {
        customerOrders.set(email, (customerOrders.get(email) || 0) + 1);
      }
    });
    const customerCount = customerOrders.size;

    // Top products
    const productSales = new Map<string, { sales: number; revenue: number }>();
    filteredOrders.forEach(order => {
      if (order.items) {
        order.items.forEach((item) => {
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
      .slice(0, 10);

    // Sales by period (monthly for the selected range)
    const salesByPeriod = generateSalesByPeriod(orders, config.dateRange);

    // Calculate growth rates
    const monthlyGrowth = calculateGrowthRate(orders, 'monthly');
    const yearlyGrowth = calculateGrowthRate(orders, 'yearly');

    // Customer retention (Repeat Customer Rate)
    const repeatCustomers = Array.from(customerOrders.values()).filter(count => count > 1).length;
    const customerRetention = customerCount > 0 ? (repeatCustomers / customerCount) * 100 : 0;

    // Conversion rate (Dynamic based on input)
    const conversionRate = config.estimatedVisits > 0 ? (totalOrders / config.estimatedVisits) * 100 : 0;

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      customerCount,
      conversionRate,
      topProducts,
      salesByPeriod,
      customerRetention,
      monthlyGrowth,
      yearlyGrowth
    };
  };

  const filterOrdersByDateRange = (orders: Order[], range: string) => {
    const now = new Date();
    let startDate = new Date();

    if (range === 'custom') {
      if (config.customStartDate && config.customEndDate) {
        const start = new Date(config.customStartDate);
        const end = new Date(config.customEndDate);
        end.setHours(23, 59, 59, 999);
        return orders.filter(order => {
          const d = new Date(order.created_at);
          return d >= start && d <= end;
        });
      }
      return orders;
    }

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

  const generateSalesByPeriod = (orders: Order[], range: string) => {
    const periods: { [key: string]: { revenue: number; orders: number } } = {};

    orders.forEach(order => {
      const date = new Date(order.created_at);
      let periodKey = '';

      switch (range) {
        case '7d':
          periodKey = date.toISOString().split('T')[0]; // Daily
          break;
        case '30d':
        case '90d':
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; // Daily
          break;
        case '1y':
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // Monthly
          break;
        default:
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!periods[periodKey]) {
        periods[periodKey] = { revenue: 0, orders: 0 };
      }

      periods[periodKey].revenue += Number(order.total_amount) || 0;
      periods[periodKey].orders += 1;
    });

    // Convert to array and calculate growth
    const periodArray = Object.entries(periods)
      .map(([period, data]) => ({ period, ...data, growth: 0 }))
      .sort((a, b) => a.period.localeCompare(b.period));

    // Calculate period-over-period growth
    for (let i = 1; i < periodArray.length; i++) {
      const prev = periodArray[i - 1].revenue;
      const current = periodArray[i].revenue;
      periodArray[i].growth = prev > 0 ? ((current - prev) / prev) * 100 : 0;
    }

    return periodArray.slice(-10); // Last 10 periods
  };

  const calculateGrowthRate = (orders: Order[], type: 'monthly' | 'yearly') => {
    const now = new Date();
    const currentPeriod = type === 'monthly' ? now.getMonth() : now.getFullYear();
    const currentYear = now.getFullYear();

    const prevPeriod = type === 'monthly'
      ? (currentPeriod === 0 ? 11 : currentPeriod - 1)
      : currentYear - 1;
    const prevYear = type === 'monthly' ? currentYear - (currentPeriod === 0 ? 1 : 0) : currentYear - 1;

    const currentPeriodOrders = orders.filter(order => {
      const date = new Date(order.created_at);
      return type === 'monthly'
        ? (date.getMonth() === currentPeriod && date.getFullYear() === currentYear)
        : date.getFullYear() === currentYear;
    });

    const prevPeriodOrders = orders.filter(order => {
      const date = new Date(order.created_at);
      return type === 'monthly'
        ? (date.getMonth() === prevPeriod && date.getFullYear() === prevYear)
        : date.getFullYear() === prevYear;
    });

    const currentRevenue = currentPeriodOrders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
    const prevRevenue = prevPeriodOrders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);

    return prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;
  };

  const generateReport = async () => {
    if (!reportData) return;

    setIsGenerating(true);
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));

      const reportContent = generateCSVContent();
      downloadReport(reportContent);

      toast.success('Report generated successfully!');
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCSVContent = () => {
    if (!reportData) return '';

    // CSV Header
    let csv = 'Period,Revenue,Orders,Growth (%),Top Product,Product Sales\n';

    // Map data to rows
    const maxRows = Math.max(reportData.salesByPeriod.length, reportData.topProducts.length);

    for (let i = 0; i < maxRows; i++) {
      const period = reportData.salesByPeriod[i] || { period: '', revenue: 0, orders: 0, growth: 0 };
      const product = reportData.topProducts[i] || { name: '', sales: 0 };
      
      csv += `${period.period},${period.revenue},${period.orders},${period.growth.toFixed(2)}%,${product.name.replace(/,/g, '')},${product.sales}\n`;
    }

    return csv;
  };

  const downloadReport = (content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `store-report-${config.dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const shareReport = () => {
    if (!reportData) return;

    const summary = `📊 Store Report (${config.dateRange.toUpperCase()})\n\n` +
      `💰 Revenue: ₦${reportData.totalRevenue.toLocaleString()}\n` +
      `📦 Orders: ${reportData.totalOrders}\n` +
      `👥 Customers: ${reportData.customerCount}\n` +
      `📈 Growth: ${reportData.monthlyGrowth.toFixed(1)}%\n\n` +
      `Generated on ${new Date().toLocaleDateString()}`;

    if (navigator.share) {
      navigator.share({
        title: 'Store Performance Report',
        text: summary,
      });
    } else {
      navigator.clipboard.writeText(summary);
      toast.success('Report summary copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 text-gray-900 p-4 sm:p-6 pb-24 sm:pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 text-gray-900 p-3 sm:p-6 pb-24 sm:pb-6">
      <style>{`
        :root {
          --primary: ${templateColors.primary};
          --primary-50: ${templateColors.primary}33;
          --primary-20: ${templateColors.primary}14;
          --primary-30: ${templateColors.primary}4D;
          --primary-60: ${templateColors.primary}99;
        }
      `}</style>
      <Toaster position="top-center" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <motion.button
              onClick={() => router.back()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 rounded-2xl bg-white shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </motion.button>
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Reports & Analytics
              </h1>
              <p className="text-gray-500 mt-1 text-sm sm:text-base">Comprehensive business intelligence and reporting</p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <select
                value={config.dateRange}
                onChange={(e) => setConfig(prev => ({ ...prev, dateRange: e.target.value as any }))}
                className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary-20)] focus:border-[var(--primary)] transition-all duration-200 text-sm font-medium"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
                <option value="custom">Custom Range</option>
              </select>

              {config.dateRange === 'custom' && (
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200">
                  <input
                    type="date"
                    value={config.customStartDate || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, customStartDate: e.target.value }))}
                    className="px-2 py-2 text-sm focus:outline-none rounded-lg"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="date"
                    value={config.customEndDate || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, customEndDate: e.target.value }))}
                    className="px-2 py-2 text-sm focus:outline-none rounded-lg"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <motion.button
                onClick={shareReport}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm font-medium"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </motion.button>

              <motion.button
                onClick={generateReport}
                disabled={isGenerating}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-3 bg-[var(--primary)] text-white rounded-xl hover:brightness-90 transition-all duration-200 disabled:opacity-50 shadow-sm font-medium"
              >
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{isGenerating ? 'Generating...' : 'Export'}</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Report Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 sm:p-8 rounded-3xl shadow-lg border border-gray-100 mb-8 hover:shadow-xl transition-all duration-300"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl">
              <Filter className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Report Configuration</h3>
              <p className="text-sm text-gray-500">Customize your analytics view</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Report Type</label>
              <select
                value={config.reportType}
                onChange={(e) => setConfig(prev => ({ ...prev, reportType: e.target.value as any }))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary-20)] focus:border-[var(--primary)] transition-all duration-200 text-sm font-medium"
              >
                <option value="overview">Executive Overview</option>
                <option value="sales">Sales Analysis</option>
                <option value="customers">Customer Insights</option>
                <option value="products">Product Performance</option>
                <option value="performance">Business Performance</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Est. Monthly Visits</label>
              <input
                type="number"
                value={config.estimatedVisits}
                onChange={(e) => setConfig(prev => ({ ...prev, estimatedVisits: Number(e.target.value) }))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary-20)] focus:border-[var(--primary)] transition-all duration-200 text-sm font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Visualization Options</label>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <input
                    type="checkbox"
                    id="includeCharts"
                    checked={config.includeCharts}
                    onChange={(e) => setConfig(prev => ({ ...prev, includeCharts: e.target.checked }))}
                    className="w-4 h-4 text-[var(--primary)] focus:ring-[var(--primary)] border-gray-300 rounded"
                  />
                  <label htmlFor="includeCharts" className="text-sm font-medium text-gray-700 cursor-pointer">Include Charts</label>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <input
                    type="checkbox"
                    id="includeTrends"
                    checked={config.includeTrends}
                    onChange={(e) => setConfig(prev => ({ ...prev, includeTrends: e.target.checked }))}
                    className="w-4 h-4 text-[var(--primary)] focus:ring-[var(--primary)] border-gray-300 rounded"
                  />
                  <label htmlFor="includeTrends" className="text-sm font-medium text-gray-700 cursor-pointer">Include Trends</label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Quick Actions</label>
              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setConfig(prev => ({ ...prev, dateRange: '30d', reportType: 'overview', includeCharts: true, includeTrends: true }))}
                  className="w-full px-4 py-3 bg-[var(--primary)] text-white rounded-xl font-medium hover:brightness-90 transition-all duration-200 shadow-sm"
                >
                  Reset to Default
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setConfig(prev => ({ ...prev, dateRange: '90d', reportType: 'performance', includeCharts: true, includeTrends: true }))}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm"
                >
                  Performance View
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {reportData && (
          <>
            {/* Key Metrics */}
            {(config.reportType === 'overview' || config.reportType === 'sales' || config.reportType === 'performance') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white p-6 sm:p-8 rounded-3xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl group-hover:scale-110 transition-transform duration-200">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex items-center gap-1">
                    {reportData.monthlyGrowth >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-[var(--primary)]" />
                    )}
                    <span className={`text-sm font-semibold ${reportData.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {reportData.monthlyGrowth >= 0 ? '+' : ''}{reportData.monthlyGrowth.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Revenue</p>
                  <p className="text-3xl sm:text-4xl font-bold text-gray-900">₦{reportData.totalRevenue.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-1">vs last month</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white p-6 sm:p-8 rounded-3xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl group-hover:scale-110 transition-transform duration-200">
                    <ShoppingCart className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Orders</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Orders</p>
                  <p className="text-3xl sm:text-4xl font-bold text-gray-900">{reportData.totalOrders}</p>
                  <p className="text-xs text-gray-400 mt-1">in selected period</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white p-6 sm:p-8 rounded-3xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl group-hover:scale-110 transition-transform duration-200">
                    <BarChart3 className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">AOV</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Avg Order Value</p>
                  <p className="text-3xl sm:text-4xl font-bold text-gray-900">₦{reportData.averageOrderValue.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-1">per transaction</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white p-6 sm:p-8 rounded-3xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl group-hover:scale-110 transition-transform duration-200">
                    <Users className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Customers</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Unique Customers</p>
                  <p className="text-3xl sm:text-4xl font-bold text-gray-900">{reportData.customerCount}</p>
                  <p className="text-xs text-gray-400 mt-1">active buyers</p>
                </div>
              </motion.div>
            </div>
            )}

            {/* Performance Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Sales Trend Chart */}
              {(config.reportType === 'overview' || config.reportType === 'sales') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white p-6 rounded-2xl shadow-md border border-gray-200"
              >
                <div className="flex items-center gap-3 text-gray-500 mb-6">
                  <div className="p-2 bg-indigo-50 rounded-full">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                  </div>
                  <span className="font-semibold text-sm uppercase tracking-wider">Revenue Trend</span>
                </div>

                <div className="h-64 w-full relative group/chart pl-8 pb-6">
                  {reportData.salesByPeriod.length > 0 ? (
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="reportGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={templateColors.primary} stopOpacity="0.2" />
                          <stop offset="100%" stopColor={templateColors.primary} stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* Y-Axis Labels */}
                      <text x="-5" y="5" fontSize="4" fill="#9CA3AF" textAnchor="end">
                        ₦{Math.max(...reportData.salesByPeriod.map(d => d.revenue)).toLocaleString()}
                      </text>
                      <text x="-5" y="100" fontSize="4" fill="#9CA3AF" textAnchor="end">0</text>

                      {/* X-Axis Labels */}
                      <text x="0" y="110" fontSize="4" fill="#9CA3AF" textAnchor="start">{reportData.salesByPeriod[0]?.period}</text>
                      <text x="100" y="110" fontSize="4" fill="#9CA3AF" textAnchor="end">{reportData.salesByPeriod[reportData.salesByPeriod.length - 1]?.period}</text>

                      {/* Chart Line */}
                      <path
                        d={`M0,100 ${reportData.salesByPeriod.map((d, i) => `L${(i / (reportData.salesByPeriod.length - 1)) * 100},${100 - (d.revenue / (Math.max(...reportData.salesByPeriod.map(d => d.revenue), 1) * 1.1)) * 100}`).join(' ')} L100,100 Z`}
                        fill="url(#reportGradient)"
                      />

                      <path
                        d={`M0,${100 - (reportData.salesByPeriod[0].revenue / (Math.max(...reportData.salesByPeriod.map(d => d.revenue), 1) * 1.1)) * 100} ${reportData.salesByPeriod.map((d, i) => `L${(i / (reportData.salesByPeriod.length - 1)) * 100},${100 - (d.revenue / (Math.max(...reportData.salesByPeriod.map(d => d.revenue), 1) * 1.1)) * 100}`).join(' ')}`}
                        fill="none"
                        stroke={templateColors.primary}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {reportData.salesByPeriod.map((d, i) => (
                        <circle
                          key={i}
                          cx={(i / (reportData.salesByPeriod.length - 1)) * 100}
                          cy={100 - (d.revenue / (Math.max(...reportData.salesByPeriod.map(d => d.revenue), 1) * 1.1)) * 100}
                          r="1.5"
                          fill={hoveredPoint?.label === d.period ? templateColors.primary : "white"}
                          stroke={templateColors.primary}
                          strokeWidth={hoveredPoint?.label === d.period ? "2" : "1"}
                          className="cursor-pointer transition-all duration-200"
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredPoint({
                              x: rect.left,
                              y: rect.top,
                              value: d.revenue,
                              label: d.period
                            });
                          }}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      ))}
                    </svg>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">No data available</div>
                  )}
                  
                  {hoveredPoint && (
                    <div className="absolute z-10 bg-gray-900 text-white text-xs rounded-lg py-1 px-2 pointer-events-none transform -translate-x-1/2 -translate-y-full -mt-2" style={{ left: hoveredPoint.x - (document.querySelector('.group\\/chart')?.getBoundingClientRect().left || 0) + 10, top: hoveredPoint.y - (document.querySelector('.group\\/chart')?.getBoundingClientRect().top || 0) }}>
                      <p className="font-bold">{hoveredPoint.label}</p>
                      <p>₦{hoveredPoint.value.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </motion.div>
              )}

              {/* Top Products */}
              {(config.reportType === 'overview' || config.reportType === 'products') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white p-6 rounded-2xl shadow-md border border-gray-200"
              >
                <div className="flex items-center gap-3 text-gray-500 mb-6">
                  <div className="p-2 bg-teal-50 rounded-full">
                    <Target className="w-5 h-5 text-teal-600" />
                  </div>
                  <span className="font-semibold text-sm uppercase tracking-wider">Top Performing Products</span>
                </div>

                <div className="space-y-4">
                  {reportData.topProducts.length > 0 ? (
                    reportData.topProducts.slice(0, 5).map((product, index) => (
                      <div key={product.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[var(--primary-20)] rounded-full flex items-center justify-center text-[var(--primary)] font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 truncate max-w-32">{product.name}</p>
                            <p className="text-sm text-gray-500">{product.sales} sold</p>
                          </div>
                        </div>
                        <p className="font-bold text-gray-900">₦{product.revenue.toLocaleString()}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-center py-8">No product data available</p>
                  )}
                </div>
              </motion.div>
              )}
            </div>

            {/* Additional Insights */}
            {(config.reportType === 'overview' || config.reportType === 'customers' || config.reportType === 'performance') && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-white p-6 rounded-2xl shadow-md border border-gray-200"
              >
                <div className="flex items-center gap-3 text-gray-500 mb-4">
                  <div className="p-2 bg-cyan-50 rounded-full">
                    <Users className="w-5 h-5 text-cyan-600" />
                  </div>
                  <span className="font-semibold text-sm uppercase tracking-wider">Customer Retention</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{reportData.customerRetention.toFixed(1)}%</p>
                <p className="text-sm text-gray-400">Repeat customer rate</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-white p-6 rounded-2xl shadow-md border border-gray-200"
              >
                <div className="flex items-center gap-3 text-gray-500 mb-4">
                  <div className="p-2 bg-pink-50 rounded-full">
                    <TrendingUp className="w-5 h-5 text-pink-600" />
                  </div>
                  <span className="font-semibold text-sm uppercase tracking-wider">Conversion Rate</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{reportData.conversionRate.toFixed(2)}%</p>
                <p className="text-sm text-gray-400">Based on {config.estimatedVisits} visits</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="bg-white p-6 rounded-2xl shadow-md border border-gray-200"
              >
                <div className="flex items-center gap-3 text-gray-500 mb-4">
                  <div className="p-2 bg-yellow-50 rounded-full">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <span className="font-semibold text-sm uppercase tracking-wider">Growth Rate</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{reportData.yearlyGrowth.toFixed(1)}%</p>
                <p className="text-sm text-gray-400">Year-over-year growth</p>
              </motion.div>
            </div>
            )}
          </>
        )}
      </motion.div>

      <BottomNav />
    </div>
  );
}
