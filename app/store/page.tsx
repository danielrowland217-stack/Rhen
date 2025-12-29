"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Store, Text, ArrowLeft, Eye, X, Loader2, CheckCircle, XCircle } from "lucide-react";
import { BottomNav } from "@/app/dashboard/BottomNav";
import { getUser, supabase } from "@/lib/supabaseClient";
import { getStoreSettings, updateStoreSettings } from "@/lib/supabaseDb";

export default function CreateStorePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [nameAvailability, setNameAvailability] = useState<null | 'available' | 'taken'>(null);
  const [formData, setFormData] = useState({
    storeName: '',
    description: '',
  });
  const [greetingIndex, setGreetingIndex] = useState(0);

  useEffect(() => {
    // Load existing data from Supabase
    const loadStoreSettings = async () => {
      try {
        const { data: user } = await getUser();
        if (user?.user) {
          const { data: settings } = await getStoreSettings(user.user.id);
          
          // If store already exists, redirect to dashboard
          if (settings?.store_name) {
            router.replace('/store/dashboard');
            return;
          }

          if (settings) {
            setFormData({
              storeName: settings.store_name || '',
              description: settings.description || '',
            });
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadStoreSettings();
  }, [router]);

  useEffect(() => {
    const interval = setInterval(() => {
      setGreetingIndex((prev) => (prev + 1) % 2);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkAvailability = async () => {
      if (!formData.storeName || formData.storeName.length < 2) {
        setNameAvailability(null);
        return;
      }

      setIsCheckingName(true);
      try {
        const { data } = await supabase
          .from('store_settings')
          .select('store_name')
          .eq('store_name', formData.storeName)
          .maybeSingle();

        if (data) {
          setNameAvailability('taken');
          setError("Store name is already taken");
        } else {
          setNameAvailability('available');
          setError("");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsCheckingName(false);
      }
    };

    const debounceTimer = setTimeout(checkAvailability, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData.storeName]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
    if (id === 'storeName') {
      setNameAvailability(null);
    }
    if (error) setError("");
  };



  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    if (nameAvailability === 'taken') {
      setError("Store name is already taken. Please choose another.");
      setIsSubmitting(false);
      return;
    }

    try {
      // Check if store name is unique
      const { data: existingStore } = await supabase
        .from('store_settings')
        .select('store_name')
        .eq('store_name', formData.storeName)
        .maybeSingle();

      if (existingStore) {
        setError("Store name is already taken. Please choose another.");
        setIsSubmitting(false);
        return;
      }

      const { data: authData } = await getUser();
      if (authData?.user) {
        await updateStoreSettings(authData.user.id, {
          store_name: formData.storeName,
          description: formData.description,
        });
        router.push('/store/dashboard');
      }
    } catch (error) {
      console.error("Error creating store:", error);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 via-red-700 to-rose-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 via-red-700 to-rose-900 text-white relative p-3 sm:p-6 pb-24 sm:pb-6 overflow-hidden">
      {/* Decorative Background Blobs */}
      <div className="absolute top-0 -left-1/4 w-96 h-96 bg-red-400 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob"></div>
      <div className="absolute bottom-0 -right-1/4 w-96 h-96 bg-rose-400 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob" style={{ animationDelay: "2s" }}></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <button onClick={() => router.back()} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md">
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-white">Create Your Store</h1>
            <div className="h-6 relative overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={greetingIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5 }}
                  className="text-red-100 absolute top-0 left-0 whitespace-nowrap"
                >
                  {greetingIndex === 0 ? "Welcome back to RhenStore" : "Blessings dey form shape round you"}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white/95 backdrop-blur-sm p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 space-y-4 sm:space-y-6 text-gray-900"
        >
          {/* Store Name */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="relative"
          >
            <Store className="absolute left-4 top-3 sm:top-3.5 w-5 h-5 text-gray-400" />
            <input 
              id="storeName" 
              type="text" 
              placeholder="Store Name" 
              value={formData.storeName} 
              onChange={handleChange} 
              required 
              className={`w-full pl-12 pr-12 py-2.5 sm:py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-all text-sm sm:text-base ${
                nameAvailability === 'taken' ? 'border-red-300 focus:ring-red-500' : 
                nameAvailability === 'available' ? 'border-green-300 focus:ring-green-500' : 
                'border-gray-200 focus:ring-red-500'
              }`} 
            />
            <div className="absolute right-4 top-3 sm:top-3.5 pointer-events-none">
              {isCheckingName ? <Loader2 className="w-5 h-5 text-gray-400 animate-spin" /> :
               nameAvailability === 'available' ? <CheckCircle className="w-5 h-5 text-green-500" /> :
               nameAvailability === 'taken' ? <XCircle className="w-5 h-5 text-red-500" /> : null}
            </div>
          </motion.div>
          
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="text-red-500 text-sm font-medium px-1"
            >
              {error}
            </motion.div>
          )}

          {/* Description */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <Text className="absolute left-4 top-3 sm:top-3.5 w-5 h-5 text-gray-400" />
            <textarea id="description" placeholder="Store Description" value={formData.description} onChange={handleChange} rows={4} className="w-full pl-12 pr-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white resize-none transition-all text-sm sm:text-base" />
          </motion.div>



          {/* Action Buttons */}
          <div className="flex gap-3 sm:gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="flex-1 bg-red-50 text-red-600 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all duration-300 shadow-lg flex items-center justify-center hover:bg-red-100 gap-2"
            >
              <Eye className="w-5 h-5" />
              Preview
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 text-white py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all duration-300 shadow-lg flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed hover:from-red-700 hover:to-rose-700 transform hover:-translate-y-1 gap-2"
            >
              {isSubmitting ? 'Creating...' : (
                <>
                  <Store className="w-5 h-5" />
                  Create
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>

      {/* Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsPreviewOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative"
            >
              <div className="bg-red-600 p-4 flex justify-between items-center text-white">
                <h3 className="font-bold text-lg">Store Preview</h3>
                <button onClick={() => setIsPreviewOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 text-center text-gray-900">
                <h2 className="text-2xl font-bold mb-2">{formData.storeName || "Store Name"}</h2>
                <p className="text-gray-500 leading-relaxed">{formData.description || "No description provided yet."}</p>
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center">
                <button 
                  onClick={() => setIsPreviewOpen(false)}
                  className="text-red-600 font-semibold hover:text-red-700"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}