"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LockIcon, MailIcon } from "../signup/Icons";
import { Eye, EyeOff } from "lucide-react";
import { FormInput } from "../signup/FormInput";
import { signIn, getUser } from "../../lib/supabaseClient";

const PasswordToggleIcon = ({ isVisible }: { isVisible: boolean }) => (
  isVisible ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />
);

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [passwordVisibility, setPasswordVisibility] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    setGeneralError(null);
  };

  useEffect(() => {
    setIsMounted(true);
    const savedEmail = localStorage.getItem('remembered-email');
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setGeneralError(null);
    
    const newErrors: Partial<typeof formData> = {};

    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";

    if (Object.keys(newErrors).length === 0) {
      if (rememberMe) {
        localStorage.setItem('remembered-email', formData.email);
      } else {
        localStorage.removeItem('remembered-email');
      }

      try {
        const { data, error } = await signIn(formData.email, formData.password);
        
        if (error) {
          setGeneralError(error.message);
          setIsSubmitting(false);
          return;
        }

        if (data?.session) {
          sessionStorage.setItem('auth-success', 'Welcome back!');
          
          // Try immediate redirect
          router.push('/dashboard');
          
          // Fallback: try again after a short delay
          setTimeout(() => {
            router.push('/dashboard');
          }, 100);
          
        } else {
          setGeneralError('Please check your email to confirm your account before logging in.');
          setIsSubmitting(false);
        }
      } catch (err: any) {
        console.error('Login error:', err);
        setGeneralError('An unexpected error occurred. Please try again.');
        setIsSubmitting(false);
      }
    } else {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 via-red-700 to-rose-900 text-white relative flex items-center justify-center p-4 overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 -left-1/4 w-96 h-96 bg-red-400 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob"></div>
      <div className="absolute bottom-0 -right-1/4 w-96 h-96 bg-rose-400 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob" style={{ animationDelay: "2s" }}></div>

      <div
        className={`relative z-10 w-full max-w-md transition-all duration-700 ease-out ${
          isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="bg-white/95 backdrop-blur-sm p-5 sm:p-8 rounded-2xl shadow-2xl border border-white/20">
          <div
            className={`text-center mb-6 sm:mb-8 transition-all duration-500 ease-out ${
              isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '100ms' }}
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Welcome Back
            </h1>
            <p className="text-gray-500 mt-2">Log in to your account</p>
          </div>

          {generalError && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm text-center">
              {generalError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 mb-6" noValidate>
            <FormInput
              id="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email Address"
              icon={<MailIcon className="w-5 h-5 text-gray-400" />}
              isMounted={isMounted}
              delay="200ms"
            />
            <FormInput
              id="password"
              type={passwordVisibility ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              icon={<LockIcon className="w-5 h-5 text-gray-400" />}
              isMounted={isMounted}
              delay="300ms"
            >
              <button
                type="button"
                onClick={() => setPasswordVisibility(!passwordVisibility)}
                className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none"
              >
                <PasswordToggleIcon isVisible={passwordVisibility} />
              </button>
            </FormInput>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer group select-none">
                <div className="relative flex items-center justify-center w-5 h-5">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-md checked:bg-red-600 checked:border-red-600 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/30 hover:border-red-400"
                  />
                  <svg
                    className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-all duration-200 transform scale-50 peer-checked:scale-100"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors font-medium">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors">
                Forgot Password?
              </Link>
            </div>
            <div
              className={`transition-all duration-500 ease-out ${
                isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: '400ms', paddingTop: '0.5rem' }}
            >
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-red-600 to-rose-600 text-white py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed hover:from-red-700 hover:to-rose-700 transform hover:-translate-y-1 disabled:transform-none"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Logging In...
                  </>
                ) : 'Log In'}
              </button>
            </div>
          </form>

          <p
            className={`text-center text-gray-500 text-sm mt-6 sm:mt-8 transition-all duration-500 ease-out ${
              isMounted ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transitionDelay: '500ms' }}
          >
            Don't have an account?{' '}
            <Link href="/signup" className="text-red-600 font-semibold hover:text-red-700 transition-colors focus:outline-none focus:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}