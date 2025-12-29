"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Package, Text, Image as ImageIcon, DollarSign, ArrowLeft } from "lucide-react";
import { BottomNav } from "@/app/dashboard/BottomNav";

export default function AddProductPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    productName: '',
    description: '',
    price: '',
    category: '',
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    console.log("Product Data:", formData);

    // Simulate API call
    setTimeout(() => {
      // On success, redirect back to dashboard
      router.push('/store/dashboard');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 p-4 sm:p-6 pb-24 sm:pb-6">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={isMounted ? "visible" : "hidden"}
        className="max-w-2xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Add New Product</h1>
            <p className="text-gray-500">Fill in the details to add a product to your store.</p>
          </div>
        </motion.div>

        {/* Form */}
        <motion.form
          variants={containerVariants}
          onSubmit={handleSubmit}
          className="bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-gray-200 space-y-6"
        >
          {/* Product Name */}
          <motion.div variants={itemVariants} className="relative">
            <Package className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <input id="productName" type="text" placeholder="Product Name" value={formData.productName} onChange={handleChange} required className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
          </motion.div>

          {/* Description */}
          <motion.div variants={itemVariants} className="relative">
            <Text className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <textarea id="description" placeholder="Product Description" value={formData.description} onChange={handleChange} rows={4} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
          </motion.div>

          {/* Price */}
          <motion.div variants={itemVariants} className="relative">
            <DollarSign className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <input id="price" type="number" step="0.01" placeholder="Price (e.g., 29.99)" value={formData.price} onChange={handleChange} required className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
          </motion.div>

          {/* Category */}
          <motion.div variants={itemVariants} className="relative">
            <select id="category" value={formData.category} onChange={handleChange} required className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
              <option value="">Select Category</option>
              <option value="clothing">Clothing</option>
              <option value="shoes">Shoes</option>
              <option value="accessories">Accessories</option>
              <option value="electronics">Electronics</option>
              <option value="home">Home & Garden</option>
              <option value="other">Other</option>
            </select>
          </motion.div>

          {/* Image Upload */}
          <motion.div
            variants={itemVariants}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-red-500 transition-colors"
          >
            <ImageIcon className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 font-medium">Click to upload product images</p>
            <p className="text-sm text-gray-400">PNG, JPG, GIF up to 10MB each</p>
            <input type="file" multiple className="hidden" />
          </motion.div>

          {/* Submit Button */}
          <motion.div variants={itemVariants}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding Product...
                </>
              ) : 'Add Product'}
            </motion.button>
          </motion.div>
        </motion.form>
      </motion.div>
      <BottomNav />
    </div>
  );
}
