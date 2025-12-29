"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X, Plus, Tag, Layers, Package, FileText, Loader2, ChevronDown, Upload, Check } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../../lib/supabaseClient";
import { User } from "@supabase/supabase-js";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productToEdit?: any;
  user: User | null;
  categories: string[];
}

export function ProductFormModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  productToEdit, 
  user, 
  categories 
}: ProductFormModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const submitActionRef = useRef<'close' | 'add_more'>('close');
  const availableSizes = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
  const availableColors = [
    { name: "Black", hex: "#000000" },
    { name: "White", hex: "#FFFFFF" },
    { name: "Red", hex: "#EF4444" },
    { name: "Blue", hex: "#3B82F6" },
    { name: "Green", hex: "#22C55E" },
    { name: "Yellow", hex: "#EAB308" },
    { name: "Pink", hex: "#EC4899" },
    { name: "Purple", hex: "#A855F7" },
    { name: "Grey", hex: "#6B7280" },
    { name: "Navy", hex: "#1E3A8A" },
  ];
  
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    salePrice: "",
    description: "",
    images: [] as string[],
    stock: "",
    category: "Clothing",
    sizes: [] as string[],
    colors: [] as string[]
  });

  useEffect(() => {
    if (productToEdit) {
      setFormData({
        name: productToEdit.name,
        price: productToEdit.price,
        salePrice: productToEdit.salePrice || "",
        description: productToEdit.description,
        images: productToEdit.images || [],
        stock: String(productToEdit.stock ?? 0),
        category: productToEdit.category || "Clothing",
        sizes: productToEdit.sizes || [],
        colors: productToEdit.colors || []
      });
    } else {
      setFormData({
        name: "",
        price: "",
        salePrice: "",
        description: "",
        images: [],
        stock: "",
        category: "Clothing",
        sizes: [],
        colors: []
      });
    }
  }, [productToEdit, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Prevent negative values for numeric fields
    if ((name === 'price' || name === 'salePrice' || name === 'stock') && value !== '') {
      if (parseFloat(value) < 0) return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const processFiles = async (files: FileList) => {
    if (!files || files.length === 0) return;
    
    if (!user) {
      toast.error("Please login to upload images");
      return;
    }

    // Validate file types
    const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (validFiles.length !== files.length) {
      toast.error("Only image files are allowed");
    }
    if (validFiles.length === 0) return;

    const toastId = toast.loading("Uploading images...");
    setIsLoading(true);

    try {
      const uploadPromises = validFiles.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);
          
        return publicUrl;
      });

      const newImageUrls = await Promise.all(uploadPromises);
      setFormData(prev => ({ ...prev, images: [...prev.images, ...newImageUrls] }));
      toast.success("Images uploaded successfully", { id: toastId });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Failed to upload images: " + error.message, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const toggleSize = (size: string) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size) 
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size]
    }));
  };

  const toggleColor = (color: string) => {
    setFormData(prev => ({
      ...prev,
      colors: prev.colors.includes(color)
        ? prev.colors.filter(c => c !== color)
        : [...prev.colors, color]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    const toastId = toast.loading(productToEdit ? "Updating product..." : "Creating product...");

    const productData = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      sale_price: formData.salePrice ? parseFloat(formData.salePrice) : null,
      stock: parseInt(formData.stock) || 0,
      category: formData.category,
      images: formData.images,
      sizes: formData.sizes,
      colors: formData.colors,
      user_id: user.id
    };

    try {
      if (productToEdit) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', productToEdit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);
        if (error) throw error;
      }

      toast.success(productToEdit ? "Product updated!" : "Product created!", { id: toastId });
      onSuccess(); // Refresh parent list

      if (submitActionRef.current === 'close') {
        onClose();
      } else {
        // Reset form for "Add Another"
        setFormData({
          name: "",
          price: "",
          salePrice: "",
          description: "",
          images: [],
          stock: "",
          category: "Clothing",
          sizes: [],
          colors: []
        });
      }
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast.error("Failed to save: " + error.message, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2rem] w-full max-w-lg relative max-h-[90vh] overflow-hidden shadow-2xl z-10 flex flex-col mb-16"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-white z-20 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{productToEdit ? "Edit Product" : "Add New Product"}</h2>
            <p className="text-sm text-gray-500">{productToEdit ? "Update product details" : "Fill in the details below"}</p>
          </div>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.2, rotate: 90, backgroundColor: '#F3F4F6' }}
            whileTap={{ scale: 0.9, rotate: 0 }}
            className="p-2 rounded-full text-gray-500"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* Images */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Product Images</label>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {formData.images.map((img, index) => (
                <div key={index} className="relative aspect-square rounded-2xl overflow-hidden group">
                  <img src={img} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative aspect-square bg-gray-50 rounded-2xl border-2 border-dashed ${isDragging ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-500 hover:bg-red-50/30'} transition-all flex flex-col items-center justify-center group cursor-pointer overflow-hidden`}
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                ) : (
                  <>
                    <div className="flex flex-col items-center gap-2 p-2 text-center">
                      <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                        {isDragging ? <Upload className="w-5 h-5 text-red-500" /> : <Plus className="w-5 h-5 text-red-500" />}
                      </div>
                      <span className="text-xs font-medium text-gray-600">
                        {isDragging ? "Drop here" : "Add Image"}
                      </span>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={isLoading}
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Product Name</label>
            <div className="relative group">
              <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-red-500 transition-colors" />
              <input
                required
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g. Summer Dress"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:bg-white focus:ring-2 focus:ring-red-500/20 outline-none transition-all font-medium placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Category</label>
            <div className="relative group">
              <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-red-500 transition-colors" />
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full pl-12 pr-10 py-4 bg-gray-50 rounded-2xl border-none focus:bg-white focus:ring-2 focus:ring-red-500/20 outline-none transition-all font-medium text-gray-700 appearance-none cursor-pointer"
              >
                {categories.filter(c => c !== "All").map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none group-focus-within:text-red-500 transition-colors" />
            </div>
          </div>

          {/* Price & Sale */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Price</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold group-focus-within:text-red-500 transition-colors">₦</span>
                <input
                  required
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:bg-white focus:ring-2 focus:ring-red-500/20 outline-none transition-all font-medium placeholder:text-gray-400"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Sale Price</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold group-focus-within:text-green-500 transition-colors">₦</span>
                <input
                  type="number"
                  name="salePrice"
                  value={formData.salePrice}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:bg-white focus:ring-2 focus:ring-green-500/20 outline-none transition-all font-medium placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Stock */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Stock Quantity</label>
            <div className="relative group">
              <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-red-500 transition-colors" />
              <input
                required
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleInputChange}
                min="0"
                placeholder="e.g. 10"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:bg-white focus:ring-2 focus:ring-red-500/20 outline-none transition-all font-medium placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Sizes */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Available Sizes</label>
            <div className="flex flex-wrap gap-2">
              {availableSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${formData.sizes.includes(size) ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Available Colors</label>
            <div className="flex flex-wrap gap-3">
              {availableColors.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => toggleColor(color.name)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm border ${formData.colors.includes(color.name) ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'hover:scale-105 border-gray-200'}`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                >
                  {formData.colors.includes(color.name) && (
                    <Check className={`w-5 h-5 ${color.name === 'White' || color.name === 'Yellow' ? 'text-black' : 'text-white'}`} />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2 ml-1">Selected: {formData.colors.length > 0 ? formData.colors.join(", ") : "None"}</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Description</label>
            <div className="relative group">
              <FileText className="absolute left-4 top-4 w-5 h-5 text-gray-400 group-focus-within:text-red-500 transition-colors" />
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                placeholder="Product description..."
                className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:bg-white focus:ring-2 focus:ring-red-500/20 outline-none transition-all resize-none font-medium placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2 pb-2">
            {!productToEdit && (
              <motion.button
                type="submit"
                onClick={() => { submitActionRef.current = 'add_more'; }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
                className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-colors text-sm sm:text-base disabled:opacity-50"
              >
                Save & Add Another
              </motion.button>
            )}
            <motion.button
              type="submit"
              onClick={() => { submitActionRef.current = 'close'; }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98, y: 0 }}
              disabled={isLoading}
              className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-red-500/20 hover:bg-red-700 hover:shadow-red-500/30 transition-all text-sm sm:text-base flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              {productToEdit ? "Save Changes" : "Add Product"}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}