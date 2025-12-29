"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Palette, Check, Star, Crown, Sparkles } from "lucide-react";
import { BottomNav } from "../../../dashboard/BottomNav";
import toast, { Toaster } from "react-hot-toast";
import { supabase } from "../../../../lib/supabaseClient";
import { getStoreSettings, updateStoreSettings } from "../../../../lib/supabaseDb";
import { User } from "@supabase/supabase-js";

interface Template {
  id: string;
  name: string;
  description: string;
  preview: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  isPremium: boolean;
  isPopular: boolean;
}

const templates: Template[] = [
  {
    id: "classic-red",
    name: "Classic Red",
    description: "Timeless red theme perfect for fashion stores",
    preview: "/templates/classic-red.png",
    colors: {
      primary: "#DC2626",
      secondary: "#FFFFFF",
      accent: "#FEE2E2",
      background: "#FEF2F2"
    },
    isPremium: false,
    isPopular: true
  },
  {
    id: "elegant-black",
    name: "Elegant Black",
    description: "Sophisticated black and white design",
    preview: "/templates/elegant-black.png",
    colors: {
      primary: "#000000",
      secondary: "#FFFFFF",
      accent: "#F3F4F6",
      background: "#111827"
    },
    isPremium: false,
    isPopular: false
  },
  {
    id: "ocean-blue",
    name: "Ocean Blue",
    description: "Refreshing blue tones for a modern look",
    preview: "/templates/ocean-blue.png",
    colors: {
      primary: "#2563EB",
      secondary: "#FFFFFF",
      accent: "#DBEAFE",
      background: "#EFF6FF"
    },
    isPremium: true,
    isPopular: false
  },
  {
    id: "sunset-orange",
    name: "Sunset Orange",
    description: "Warm orange hues for an energetic vibe",
    preview: "/templates/sunset-orange.png",
    colors: {
      primary: "#EA580C",
      secondary: "#FFFFFF",
      accent: "#FED7AA",
      background: "#FFF7ED"
    },
    isPremium: true,
    isPopular: false
  },
  {
    id: "forest-green",
    name: "Forest Green",
    description: "Natural green tones for eco-friendly brands",
    preview: "/templates/forest-green.png",
    colors: {
      primary: "#16A34A",
      secondary: "#FFFFFF",
      accent: "#DCFCE7",
      background: "#F0FDF4"
    },
    isPremium: false,
    isPopular: false
  },
  {
    id: "royal-purple",
    name: "Royal Purple",
    description: "Luxurious purple for premium products",
    preview: "/templates/royal-purple.png",
    colors: {
      primary: "#7C3AED",
      secondary: "#FFFFFF",
      accent: "#EDE9FE",
      background: "#F5F3FF"
    },
    isPremium: true,
    isPopular: false
  }
];

export default function TemplatesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [currentTemplate, setCurrentTemplate] = useState<string>("classic-red");
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = '/login';
        return;
      }
      setUser(data.user);

      // Load current template
      try {
        const { data: settings } = await supabase
          .from('store_settings')
          .select('template')
          .eq('user_id', data.user.id)
          .single();

        if (settings?.template) {
          setCurrentTemplate(settings.template);
        }
      } catch (err) {
        console.log("No template settings found");
      }
    };

    checkAuth();
  }, []);

  const applyTemplate = async (templateId: string) => {
    if (!user) {
      toast.error("Please log in to apply templates");
      return;
    }

    const template = templates.find(t => t.id === templateId);
    if (!template) {
      toast.error("Template not found");
      return;
    }

    if (template.isPremium) {
      toast.error("Please upgrade to premium to use this template");
      return;
    }

    setIsApplying(true);
    const toastId = toast.loading("Applying template...");

    try {
      console.log("Applying template:", templateId, "for user:", user.id);

      const { error } = await updateStoreSettings(user.id, {
        template: templateId,
        updated_at: new Date().toISOString()
      });

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      setCurrentTemplate(templateId);
      setSelectedTemplate(null);
      toast.success("Template applied successfully!", { id: toastId });
    } catch (error: any) {
      console.error("Error applying template:", error);
      const errorMessage = error.message || 'Unknown error';
      toast.error(`Failed to apply template: ${errorMessage}`, { id: toastId });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 sm:p-8 pb-24 sm:pb-8">
      <Toaster position="top-center" reverseOrder={false} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto"
      >
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-xl">
              <Palette className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Store Templates</h1>
              <p className="text-gray-500">Choose a beautiful template to make your store stand out</p>
            </div>
          </div>
        </div>

        {/* Current Template */}
        <div className="bg-white rounded-2xl p-6 mb-8 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Current Template</h2>
              <p className="text-gray-500">
                {templates.find(t => t.id === currentTemplate)?.name || "Classic Red"}
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              <Check className="w-4 h-4" />
              Active
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              className={`relative bg-white rounded-2xl overflow-hidden border-2 transition-all duration-300 cursor-pointer ${
                selectedTemplate === template.id
                  ? "border-red-500 shadow-lg shadow-red-500/20"
                  : currentTemplate === template.id
                  ? "border-green-500 shadow-lg shadow-green-500/20"
                  : "border-gray-100 hover:border-gray-200"
              }`}
              onClick={() => setSelectedTemplate(template.id)}
            >
              {/* Template Preview */}
              <div
                className="h-48 relative overflow-hidden"
                style={{ backgroundColor: template.colors.background }}
              >
                {/* Mock Store Preview */}
                <div className="p-4 h-full flex flex-col">
                  {/* Header */}
                  <div
                    className="h-8 rounded mb-4"
                    style={{ backgroundColor: template.colors.primary }}
                  ></div>
                  {/* Products Grid */}
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div
                      className="rounded"
                      style={{ backgroundColor: template.colors.secondary, border: `1px solid ${template.colors.accent}` }}
                    ></div>
                    <div
                      className="rounded"
                      style={{ backgroundColor: template.colors.secondary, border: `1px solid ${template.colors.accent}` }}
                    ></div>
                    <div
                      className="rounded"
                      style={{ backgroundColor: template.colors.secondary, border: `1px solid ${template.colors.accent}` }}
                    ></div>
                    <div
                      className="rounded"
                      style={{ backgroundColor: template.colors.secondary, border: `1px solid ${template.colors.accent}` }}
                    ></div>
                  </div>
                </div>

                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-2">
                  {template.isPopular && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full">
                      <Star className="w-3 h-3 fill-current" />
                      Popular
                    </div>
                  )}
                  {template.isPremium && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-purple-500 text-white text-xs font-bold rounded-full">
                      <Crown className="w-3 h-3" />
                      Premium
                    </div>
                  )}
                </div>

                {/* Current Indicator */}
                {currentTemplate === template.id && (
                  <div className="absolute top-3 right-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>

              {/* Template Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                  </div>
                </div>

                {/* Color Palette */}
                <div className="flex gap-2 mb-4">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: template.colors.primary }}
                    title="Primary Color"
                  ></div>
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: template.colors.secondary }}
                    title="Secondary Color"
                  ></div>
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: template.colors.accent }}
                    title="Accent Color"
                  ></div>
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: template.colors.background }}
                    title="Background Color"
                  ></div>
                </div>

                {/* Apply Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    applyTemplate(template.id);
                  }}
                  disabled={isApplying || currentTemplate === template.id}
                  className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${
                    currentTemplate === template.id
                      ? "bg-green-100 text-green-700 cursor-not-allowed"
                      : template.isPremium
                      ? "bg-purple-600 text-white hover:bg-purple-700"
                      : "bg-red-600 text-white hover:bg-red-700"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {currentTemplate === template.id ? (
                    <>
                      <Check className="w-4 h-4 inline mr-2" />
                      Applied
                    </>
                  ) : template.isPremium ? (
                    <>
                      <Crown className="w-4 h-4 inline mr-2" />
                      Upgrade to Apply
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 inline mr-2" />
                      Apply Template
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Premium Notice */}
        <div className="mt-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <Crown className="w-8 h-8" />
            <h3 className="text-xl font-bold">Unlock Premium Templates</h3>
          </div>
          <p className="mb-4 opacity-90">
            Get access to exclusive premium templates, advanced customization options, and priority support.
          </p>
          <button className="bg-white text-purple-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors">
            Upgrade to Premium
          </button>
        </div>
      </motion.div>

      <BottomNav />
    </div>
  );
}
