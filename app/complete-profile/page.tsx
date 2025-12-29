"use client";

import { useState, useRef, ChangeEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserIcon, CameraIcon } from "../signup/Icons";
import { getUser } from "../../lib/supabaseClient";
import { uploadProfileImage, updateUserProfile } from "../../lib/supabaseDb";

export default function CompleteProfilePage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Show preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);

      // Upload to Supabase Storage
      const { data: user } = await getUser();
      if (user?.user) {
        const { data: imageUrl, error } = await uploadProfileImage(user.user.id, file);
        if (error) {
          console.error('Error uploading profile image:', error);
        } else {
          // Update user profile with image URL
          await updateUserProfile(user.user.id, { profile_image_url: imageUrl });
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate processing
    setTimeout(() => {
      sessionStorage.setItem('profile-complete', 'Profile setup complete!');
      router.push('/dashboard');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 via-red-700 to-rose-900 text-white relative flex items-center justify-center p-4 overflow-hidden">
      {/* Decorative Background Blobs */}
      <div className="absolute top-0 -left-1/4 w-96 h-96 bg-red-400 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob"></div>
      <div className="absolute bottom-0 -right-1/4 w-96 h-96 bg-rose-400 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob" style={{ animationDelay: "2s" }}></div>

      <div
        className={`relative z-10 w-full max-w-md transition-all duration-700 ease-out ${
          isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-white/20 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
          <p className="text-gray-500 mb-8">Add a photo so people can recognize you</p>

          <div className="flex flex-col items-center mb-8">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-32 h-32 rounded-full bg-gray-100 border-4 border-white shadow-lg flex items-center justify-center cursor-pointer overflow-hidden relative group transition-all hover:border-red-100"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-16 h-16 text-gray-300" />
              )}
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <CameraIcon className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors flex items-center gap-2"
            >
              <CameraIcon className="w-4 h-4" />
              Upload Photo
            </button>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload} 
            />
          </div>

          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-red-600 to-rose-600 text-white py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:from-red-700 hover:to-rose-700 transform hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSubmitting ? 'Setting up...' : 'Continue to Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
}