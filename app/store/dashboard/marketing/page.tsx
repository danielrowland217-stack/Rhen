"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  Share2,
  Gift,
  Megaphone,
  Target,
  Users,
  TrendingUp,
  Copy,
  Send,
  Eye,
  Heart,
  Zap
} from "lucide-react";
import { BottomNav } from "@/app/dashboard/BottomNav";
import { getUser } from "@/lib/supabaseClient";
import { getStoreSettings, getOrders } from "@/lib/supabaseDb";
import toast, { Toaster } from "react-hot-toast";

interface MarketingCampaign {
  id: string;
  name: string;
  type: 'email' | 'social' | 'sms' | 'promo';
  status: 'draft' | 'active' | 'completed' | 'paused';
  reach: number;
  engagement: number;
  conversions: number;
  created_at: string;
}

interface CustomerSegment {
  id: string;
  name: string;
  criteria: string;
  count: number;
  avgOrderValue: number;
}

export default function StoreMarketingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'campaigns' | 'segments' | 'tools'>('campaigns');
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    type: 'email' as const,
    message: '',
    targetSegment: ''
  });

  useEffect(() => {
    loadMarketingData();
  }, []);

  const loadMarketingData = async () => {
    try {
      setIsLoading(true);
      const { data: user } = await getUser();
      if (!user?.user) return;

      // Load orders for customer segmentation
      const { data: orders } = await getOrders(user.user.id);

      if (orders) {
        // Create sample customer segments based on order data
        const segments = createCustomerSegments(orders);
        setSegments(segments);

        // Create sample campaigns
        const sampleCampaigns = createSampleCampaigns();
        setCampaigns(sampleCampaigns);
      }

    } catch (error) {
      console.error('Error loading marketing data:', error);
      toast.error('Failed to load marketing data');
    } finally {
      setIsLoading(false);
    }
  };

  const createCustomerSegments = (orders: any[]): CustomerSegment[] => {
    // Group orders by customer
    const customerOrders = new Map<string, any[]>();
    orders.forEach(order => {
      const customerId = order.customer_info?.email || order.id;
      if (!customerOrders.has(customerId)) {
        customerOrders.set(customerId, []);
      }
      customerOrders.get(customerId)!.push(order);
    });

    // Create segments
    const segments: CustomerSegment[] = [
      {
        id: '1',
        name: 'High Value Customers',
        criteria: 'Orders > ₦50,000',
        count: Array.from(customerOrders.values()).filter(orders =>
          orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) > 50000
        ).length,
        avgOrderValue: 75000
      },
      {
        id: '2',
        name: 'Frequent Buyers',
        criteria: '3+ orders in last 30 days',
        count: Array.from(customerOrders.values()).filter(orders =>
          orders.filter(o => {
            const orderDate = new Date(o.created_at);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return orderDate >= thirtyDaysAgo;
          }).length >= 3
        ).length,
        avgOrderValue: 25000
      },
      {
        id: '3',
        name: 'New Customers',
        criteria: 'First order in last 7 days',
        count: Array.from(customerOrders.values()).filter(orders => {
          const sortedOrders = orders.sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          const firstOrder = sortedOrders[0];
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          return new Date(firstOrder.created_at) >= sevenDaysAgo;
        }).length,
        avgOrderValue: 15000
      },
      {
        id: '4',
        name: 'At Risk Customers',
        criteria: 'No orders in last 60 days',
        count: Array.from(customerOrders.values()).filter(orders => {
          const latestOrder = orders.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];
          const sixtyDaysAgo = new Date();
          sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
          return new Date(latestOrder.created_at) < sixtyDaysAgo;
        }).length,
        avgOrderValue: 20000
      }
    ];

    return segments;
  };

  const createSampleCampaigns = (): MarketingCampaign[] => {
    return [
      {
        id: '1',
        name: 'Welcome Email Series',
        type: 'email',
        status: 'active',
        reach: 245,
        engagement: 68,
        conversions: 23,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        name: 'Flash Sale Promotion',
        type: 'social',
        status: 'completed',
        reach: 1250,
        engagement: 156,
        conversions: 89,
        created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '3',
        name: 'Abandoned Cart Recovery',
        type: 'email',
        status: 'active',
        reach: 89,
        engagement: 45,
        conversions: 12,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '4',
        name: 'Loyalty Program Launch',
        type: 'promo',
        status: 'draft',
        reach: 0,
        engagement: 0,
        conversions: 0,
        created_at: new Date().toISOString()
      }
    ];
  };

  const createCampaign = async () => {
    if (!newCampaign.name.trim() || !newCampaign.message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const campaign: MarketingCampaign = {
        id: Date.now().toString(),
        name: newCampaign.name,
        type: newCampaign.type,
        status: 'draft',
        reach: 0,
        engagement: 0,
        conversions: 0,
        created_at: new Date().toISOString()
      };

      setCampaigns(prev => [campaign, ...prev]);
      setNewCampaign({ name: '', type: 'email', message: '', targetSegment: '' });
      toast.success('Campaign created successfully!');
    } catch (error) {
      toast.error('Failed to create campaign');
    }
  };

  const copyShareableLink = () => {
    const shareableLink = `${window.location.origin}/store/${campaigns[0]?.id || 'sample'}`;
    navigator.clipboard.writeText(shareableLink);
    toast.success('Shareable link copied to clipboard!');
  };

  const marketingTools = [
    {
      icon: Mail,
      title: 'Email Marketing',
      description: 'Send targeted emails to customer segments',
      action: 'Create Campaign',
      color: 'bg-blue-50 text-blue-600'
    },
    {
      icon: MessageSquare,
      title: 'SMS Campaigns',
      description: 'Reach customers instantly with SMS promotions',
      action: 'Send SMS',
      color: 'bg-green-50 text-green-600'
    },
    {
      icon: Share2,
      title: 'Social Sharing',
      description: 'Share products on social media platforms',
      action: 'Share Now',
      color: 'bg-purple-50 text-purple-600'
    },
    {
      icon: Gift,
      title: 'Discount Codes',
      description: 'Create and manage promotional codes',
      action: 'Generate Code',
      color: 'bg-orange-50 text-orange-600'
    },
    {
      icon: Megaphone,
      title: 'Push Notifications',
      description: 'Send in-app notifications to users',
      action: 'Send Push',
      color: 'bg-red-50 text-red-600'
    },
    {
      icon: Target,
      title: 'Retargeting',
      description: 'Target customers who viewed but didn\'t buy',
      action: 'Setup Retargeting',
      color: 'bg-indigo-50 text-indigo-600'
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 text-gray-900 p-3 sm:p-4 md:p-6 pb-20 sm:pb-24">
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
          className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8"
        >
          <button
            onClick={() => router.back()}
            className="p-3 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-lg transition-all duration-200 border border-white/20"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Marketing Tools
            </h1>
            <p className="text-gray-600 mt-1">Grow your store with targeted marketing campaigns</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2 mb-8 bg-white/80 backdrop-blur-sm p-2 rounded-2xl shadow-lg border border-white/20"
        >
          {[
            { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
            { id: 'segments', label: 'Customer Segments', icon: Users },
            { id: 'tools', label: 'Marketing Tools', icon: Zap }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg transform scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60 hover:shadow-md'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden text-sm">{tab.label.split(' ')[0]}</span>
            </button>
          ))}
        </motion.div>

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            {/* Create New Campaign */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/90 backdrop-blur-sm p-6 sm:p-8 rounded-3xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl">
                  <Megaphone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Create New Campaign</h3>
                  <p className="text-gray-600 text-sm">Launch your next marketing campaign</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Campaign Name</label>
                  <input
                    type="text"
                    placeholder="Enter campaign name..."
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Campaign Type</label>
                  <select
                    value={newCampaign.type}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="email">📧 Email Campaign</option>
                    <option value="social">📱 Social Media</option>
                    <option value="sms">💬 SMS Campaign</option>
                    <option value="promo">🎯 Promotional</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <label className="text-sm font-semibold text-gray-700">Campaign Message</label>
                <textarea
                  placeholder="Describe your campaign goals and target audience..."
                  value={newCampaign.message}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all duration-200"
                />
              </div>

              <button
                onClick={createCampaign}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-3 shadow-lg"
              >
                <Send className="w-5 h-5" />
                Create Campaign
              </button>
            </motion.div>

            {/* Campaign List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {campaigns.map((campaign, index) => (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 group"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-lg mb-1">{campaign.name}</h4>
                      <p className="text-sm text-gray-600 capitalize flex items-center gap-2">
                        {campaign.type === 'email' && '📧'}
                        {campaign.type === 'social' && '📱'}
                        {campaign.type === 'sms' && '💬'}
                        {campaign.type === 'promo' && '🎯'}
                        {campaign.type} Campaign
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      campaign.status === 'active' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                      campaign.status === 'completed' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                      campaign.status === 'paused' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                      'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}>
                      {campaign.status}
                    </span>
                  </div>

                  <div className="space-y-4 mb-6">
                    {/* Reach */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Reach</span>
                        <span className="text-sm font-bold text-gray-900">{campaign.reach.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((campaign.reach / 1500) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Engagement */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Engagement</span>
                        <span className="text-sm font-bold text-gray-900">{campaign.engagement.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((campaign.engagement / 200) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Conversions */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Conversions</span>
                        <span className="text-sm font-bold text-gray-900">{campaign.conversions.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((campaign.conversions / 100) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button className="flex-1 bg-gray-50 text-gray-700 py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 hover:shadow-md transition-all duration-200 border border-gray-200">
                      ✏️ Edit
                    </button>
                    <button className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:from-purple-700 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg">
                      🚀 Launch
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Customer Segments Tab */}
        {activeTab === 'segments' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {segments.map((segment, index) => (
              <motion.div
                key={segment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 group"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg mb-1">{segment.name}</h4>
                      <p className="text-sm text-gray-600">{segment.criteria}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {segment.count}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">Customers</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Average Order Value</p>
                      <p className="text-2xl font-bold text-gray-900">₦{segment.avgOrderValue.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                        <TrendingUp className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:from-purple-700 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg">
                    🎯 Create Campaign
                  </button>
                  <button className="flex-1 bg-gray-50 text-gray-700 py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 hover:shadow-md transition-all duration-200 border border-gray-200">
                    📊 View Details
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Marketing Tools Tab */}
        {activeTab === 'tools' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {marketingTools.map((tool, index) => (
                <motion.div
                  key={tool.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 group"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className={`p-4 rounded-2xl ${tool.color} group-hover:scale-110 transition-transform duration-300`}>
                      <tool.icon className="w-8 h-8" />
                    </div>
                    <div className="text-right">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="font-bold text-gray-900 text-lg mb-2">{tool.title}</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">{tool.description}</p>
                  </div>

                  <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:from-purple-700 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center justify-center gap-2">
                    <span>{tool.action}</span>
                    <span className="text-lg">→</span>
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: marketingTools.length * 0.1 }}
              className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-xl">Quick Actions</h4>
                  <p className="text-gray-600">Streamline your marketing workflow</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <motion.button
                  onClick={copyShareableLink}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 border border-blue-200/50 group"
                >
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl group-hover:scale-110 transition-transform duration-200">
                    <Share2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900">Share Store</p>
                    <p className="text-sm text-gray-600">Copy shareable link</p>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-4 p-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl hover:from-orange-100 hover:to-red-100 transition-all duration-200 border border-orange-200/50 group"
                >
                  <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl group-hover:scale-110 transition-transform duration-200">
                    <Gift className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900">Create Discount</p>
                    <p className="text-sm text-gray-600">Generate promo code</p>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-4 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl hover:from-green-100 hover:to-emerald-100 transition-all duration-200 border border-green-200/50 group"
                >
                  <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl group-hover:scale-110 transition-transform duration-200">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900">View Analytics</p>
                    <p className="text-sm text-gray-600">Campaign performance</p>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>

      <BottomNav />
    </div>
  );
}
