import { supabase } from './supabaseClient';

// Cart operations
export const getCart = async (userId) => {
  const { data, error } = await supabase
    .from('cart')
    .select('*')
    .eq('user_id', userId);
  return { data, error };
};

export const addToCart = async (userId, product) => {
  const { data, error } = await supabase
    .from('cart')
    .insert([{ user_id: userId, ...product }]);
  return { data, error };
};

export const removeFromCart = async (userId, productId) => {
  const { error } = await supabase
    .from('cart')
    .delete()
    .eq('user_id', userId)
    .eq('id', productId);
  return { error };
};

export const clearCart = async (userId) => {
  const { error } = await supabase
    .from('cart')
    .delete()
    .eq('user_id', userId);
  return { error };
};

// Wishlist operations
export const clearWishlist = async (userId) => {
  const { error } = await supabase
    .from('wishlist')
    .delete()
    .eq('user_id', userId);
  return { error };
};

// Wishlist operations
export const getWishlist = async (userId) => {
  const { data, error } = await supabase
    .from('wishlist')
    .select('*')
    .eq('user_id', userId);
  return { data, error };
};

export const addToWishlist = async (userId, product) => {
  const { data, error } = await supabase
    .from('wishlist')
    .insert([{ user_id: userId, ...product }]);
  return { data, error };
};

export const removeFromWishlist = async (userId, productId) => {
  const { error } = await supabase
    .from('wishlist')
    .delete()
    .eq('user_id', userId)
    .eq('id', productId);
  return { error };
};

// Store settings operations
export const getStoreSettings = async (userId) => {
  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .eq('user_id', userId)
    .single();
  return { data, error };
};

export const updateStoreSettings = async (userId, settings) => {
  const { data, error } = await supabase
    .from('store_settings')
    .upsert({ user_id: userId, ...settings });
  return { data, error };
};

// Orders operations
export const getOrders = async (userId) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data, error };
};

export const createOrder = async (userId, orderData) => {
  const { data, error } = await supabase
    .from('orders')
    .insert([{ user_id: userId, ...orderData }])
    .select();
  return { data, error };
};

// User profile operations
export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  return { data, error };
};

export const updateUserProfile = async (userId, profileData) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({ user_id: userId, ...profileData });
  return { data, error };
};

// Goals operations
export const getGoals = async (userId) => {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .single();
  return { data, error };
};

export const updateGoals = async (userId, goalsData) => {
  const { data, error } = await supabase
    .from('goals')
    .upsert({ user_id: userId, ...goalsData });
  return { data, error };
};

// Coupon operations
export const getCoupon = async (code) => {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .single();
  return { data, error };
};

// Shipping info operations
export const getShippingInfo = async (userId) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('first_name, last_name, phone, shipping_address, shipping_city, shipping_state, shipping_zip_code')
    .eq('user_id', userId)
    .single();
  return { data, error };
};

export const updateShippingInfo = async (userId, shippingData) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: userId,
      first_name: shippingData.firstName,
      last_name: shippingData.lastName,
      phone: shippingData.phone,
      shipping_address: shippingData.address,
      shipping_city: shippingData.city,
      shipping_state: shippingData.state,
      shipping_zip_code: shippingData.zipCode
    });
  return { data, error };
};

// Profile image operations
export const uploadProfileImage = async (userId, file) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/profile.${fileExt}`;
  const filePath = `profile-images/${fileName}`;

  const { data, error } = await supabase.storage
    .from('store-assets')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Error uploading profile image:', error);
    return { data: null, error };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('store-assets')
    .getPublicUrl(filePath);

  return { data: urlData.publicUrl, error: null };
};
