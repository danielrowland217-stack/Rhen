"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Target, ArrowLeft, Save, TrendingUp, Package } from "lucide-react";
import { BottomNav } from "@/app/dashboard/BottomNav";
import { getUser } from "@/lib/supabaseClient";
import { getGoals, updateGoals, getOrders } from "@/lib/supabaseDb";

export default function StoreGoalsPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    monthlyTarget: '',
    yearlyTarget: '',
    goalsDescription: '',
  });
  const [salesData, setSalesData] = useState<{ date: string; amount: number }[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [salesGrowth, setSalesGrowth] = useState(0);
  const [currentMonthRevenue, setCurrentMonthRevenue] = useState(0);

  useEffect(() => {
    // Load existing goals data and orders from Supabase
    const loadGoalsAndOrders = async () => {
      const { data: user } = await getUser();
      if (user?.user) {
        // Load goals
        const { data: goals } = await getGoals(user.user.id);
        if (goals) {
          setFormData({
            monthlyTarget: goals.monthly_target?.toString() || '',
            yearlyTarget: goals.yearly_target?.toString() || '',
            goalsDescription: goals.description || '',
          });
        }

        // Load orders for sales calculations
        const { data: orders } = await getOrders(user.user.id);

        if (orders) {
          // Calculate totals
          setOrderCount(orders.length);
          setTotalRevenue(orders.reduce((acc: number, order: any) => acc + (Number(order.total_amount) || 0), 0));

          // Calculate monthly growth
          const now = new Date();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();

          const prevMonthDate = new Date();
          prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
          const prevMonth = prevMonthDate.getMonth();
          const prevYear = prevMonthDate.getFullYear();

          const currentMonthOrders = orders.filter((o: any) => {
            if (!o.created_at) return false;
            const d = new Date(o.created_at);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
          });

          const prevMonthOrders = orders.filter((o: any) => {
            if (!o.created_at) return false;
            const d = new Date(o.created_at);
            return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
          });

          const currentMonthTotal = currentMonthOrders.reduce((acc: number, o: any) => acc + (Number(o.total_amount) || 0), 0);
          const prevMonthTotal = prevMonthOrders.reduce((acc: number, o: any) => acc + (Number(o.total_amount) || 0), 0);
          setCurrentMonthRevenue(currentMonthTotal);

          let growth = 0;
          if (prevMonthTotal > 0) {
            growth = ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100;
          } else if (currentMonthTotal > 0) {
            growth = 100;
          }
          setSalesGrowth(growth);

          const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
          });
          const trend = last7Days.map(date => {
            const dayOrders = orders.filter((o: any) => o.created_at && o.created_at.startsWith(date));
            const dayTotal = dayOrders.reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0);
            return { date, amount: dayTotal };
          });
          setSalesData(trend);
        }
      }
    };
    loadGoalsAndOrders();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: user } = await getUser();
      if (!user?.user) {
        throw new Error('User not authenticated');
      }

      const goalsData = {
        monthly_target: Number(formData.monthlyTarget) || null,
        yearly_target: Number(formData.yearlyTarget) || null,
        description: formData.goalsDescription,
        updated_at: new Date().toISOString()
      };

      const { error } = await updateGoals(user.user.id, goalsData);
      if (error) throw error;

      // Update local state immediately
      setFormData(prev => ({
        ...prev,
        monthlyTarget: goalsData.monthly_target?.toString() || '',
        yearlyTarget: goalsData.yearly_target?.toString() || '',
        goalsDescription: goalsData.description || ''
      }));

      router.push('/store/dashboard');
    } catch (error: any) {
      console.error('Error saving goals:', error);
      // You could add toast notification here
      alert('Failed to save goals. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 p-4 sm:p-6 pb-24 sm:pb-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Store Growth</h1>
            <p className="text-gray-500">Track your growth and set objectives.</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3 text-gray-500">
                <div className="p-2 bg-green-50 rounded-full">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <span className="font-semibold text-sm uppercase tracking-wider">Total Revenue</span>
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${salesGrowth >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {salesGrowth >= 0 ? '+' : ''}{Math.round(salesGrowth)}%
                <span className="font-normal text-gray-500 hidden sm:inline">vs last month</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">₦{totalRevenue.toLocaleString()}</p>
            <p className="text-sm text-gray-400">Lifetime sales earnings</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 flex flex-col gap-2">
            <div className="flex items-center gap-3 text-gray-500 mb-1">
              <div className="p-2 bg-blue-50 rounded-full">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <span className="font-semibold text-sm uppercase tracking-wider">Total Orders</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{orderCount}</p>
            <p className="text-sm text-gray-400">Orders processed</p>
          </div>
        </div>

        {/* Monthly Goal Progress */}
        {formData.monthlyTarget && Number(formData.monthlyTarget) > 0 && (
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 mb-6">
            <div className="flex justify-between items-end mb-2">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Monthly Goal Progress</h3>
                <p className="text-sm text-gray-500">
                  ₦{currentMonthRevenue.toLocaleString()} / ₦{Number(formData.monthlyTarget).toLocaleString()}
                </p>
              </div>
              <span className="text-2xl font-bold text-red-600">
                {Math.round((currentMonthRevenue / Number(formData.monthlyTarget)) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((currentMonthRevenue / Number(formData.monthlyTarget)) * 100, 100)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="bg-red-600 h-full rounded-full"
              />
            </div>
          </div>
        )}

        {/* Sales Trend Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 mb-6">
          <div className="flex items-center gap-3 text-gray-500 mb-6">
            <div className="p-2 bg-purple-50 rounded-full">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <span className="font-semibold text-sm uppercase tracking-wider">Sales Trend (Last 7 Days)</span>
          </div>
          
          <div className="h-48 w-full relative">
            {salesData.length > 0 ? (
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#DC2626" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#DC2626" stopOpacity="0" />
                  </linearGradient>
                </defs>
                
                <path
                  d={`M0,100 ${salesData.map((d, i) => `L${(i / (salesData.length - 1)) * 100},${100 - (d.amount / (Math.max(...salesData.map(d => d.amount), 1) * 1.1)) * 100}`).join(' ')} L100,100 Z`}
                  fill="url(#salesGradient)"
                />
                
                <path
                  d={`M0,${100 - (salesData[0].amount / (Math.max(...salesData.map(d => d.amount), 1) * 1.1)) * 100} ${salesData.map((d, i) => `L${(i / (salesData.length - 1)) * 100},${100 - (d.amount / (Math.max(...salesData.map(d => d.amount), 1) * 1.1)) * 100}`).join(' ')}`}
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {salesData.map((d, i) => (
                  <circle
                    key={i}
                    cx={(i / (salesData.length - 1)) * 100}
                    cy={100 - (d.amount / (Math.max(...salesData.map(d => d.amount), 1) * 1.1)) * 100}
                    r="1.5"
                    fill="white"
                    stroke="#DC2626"
                    strokeWidth="1"
                  />
                ))}
              </svg>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">No sales data available</div>
            )}
            <div className="flex justify-between mt-2 text-[10px] text-gray-400 font-medium">{salesData.map((d, i) => <span key={i}>{new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}</span>)}</div>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-gray-200 space-y-6"
        >
          {/* Monthly Target */}
          <div className="relative">
            <Target className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <input
              id="monthlyTarget"
              type="number"
              placeholder="Monthly Sales Target (₦)"
              value={formData.monthlyTarget}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Yearly Target */}
          <div className="relative">
            <Target className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <input
              id="yearlyTarget"
              type="number"
              placeholder="Yearly Sales Target (₦)"
              value={formData.yearlyTarget}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Goals Description */}
          <div className="relative">
            <textarea
              id="goalsDescription"
              placeholder="Describe your goals and objectives..."
              value={formData.goalsDescription}
              onChange={handleChange}
              rows={4}
              className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed hover:bg-red-700 gap-2"
          >
            {isSubmitting ? 'Saving...' : (
              <>
                <Save className="w-5 h-5" />
                Save Goals
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
      <BottomNav />
    </div>
  );
}
