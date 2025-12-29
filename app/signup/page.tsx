"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import {
  LockIcon,
  MailIcon,
  PasswordToggleIcon,
  UserIcon,
} from "./Icons";
import { FormInput } from "./FormInput";
import { signUp } from "../../lib/supabaseClient";

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<typeof formData>>({});
  const [passwordVisibility, setPasswordVisibility] = useState({
    current: false,
    confirm: false,
  });
  const [isMounted, setIsMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newErrors: Partial<typeof formData> = {};

    if (!formData.name) newErrors.name = "Full Name is required.";
    if (!formData.email) newErrors.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email is invalid.";
    if (!formData.password) newErrors.password = "Password is required.";
    else if (formData.password.length < 8) newErrors.password = "Password must be at least 8 characters.";
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match.";

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true);
      try {
        const { data, error } = await signUp(formData.email, formData.password);
        if (error) {
          setErrors({ email: error.message });
        } else {
          // On successful submission, redirect to complete profile
          sessionStorage.setItem('auth-success', 'Welcome! Your account has been created.');
          sessionStorage.setItem('user-name', formData.name);
          router.push('/complete-profile');
        }
      } catch (err) {
        setErrors({ email: 'An unexpected error occurred. Please try again.' });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // If there are errors, ensure submitting state is false
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 via-red-700 to-rose-900 text-white relative flex items-center justify-center p-4 overflow-hidden">
      {/* Decorative Background Blobs - Re-using the same stylish background */}
      <div className="absolute top-0 -left-1/4 w-96 h-96 bg-red-400 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob"></div>
      <div className="absolute bottom-0 -right-1/4 w-96 h-96 bg-rose-400 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob" style={{ animationDelay: "2s" }}></div>

      {/* Main Content */}
      <div
        className={`relative z-10 w-full max-w-md transition-all duration-700 ease-out ${
          isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="bg-white/95 backdrop-blur-sm p-5 sm:p-8 rounded-2xl shadow-2xl border border-white/20 ">
          {/* Header */}
          <div
            className={`text-center mb-6 sm:mb-8 transition-all duration-500 ease-out ${
              isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '100ms' }}
          >
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 ">
              Welcome Boss 👋
            </h1>
            <p className="text-gray-500 mt-2">Let&apos;s get you set up ASAP</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 mb-6" noValidate>
            <FormInput
              id="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Full Name"
              icon={<UserIcon className="w-5 h-5 text-gray-400" />}
              isMounted={isMounted}
              delay="300ms"
              error={errors.name}
            />
            <FormInput
              id="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email Address"
              icon={<MailIcon className="w-5 h-5 text-gray-400" />}
              isMounted={isMounted}
              delay="400ms"
              error={errors.email}
            />
            <FormInput
              id="password"
              type={passwordVisibility.current ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              icon={<LockIcon className="w-5 h-5 text-gray-400" />}
              isMounted={isMounted}
              delay="500ms"
              error={errors.password}
            >
              <button
                type="button"
                aria-label={passwordVisibility.current ? "Hide password" : "Show password"}
                onClick={() => setPasswordVisibility(prev => ({ ...prev, current: !prev.current }))}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-500 transition-transform duration-200 hover:scale-110"
              >
                <PasswordToggleIcon isVisible={passwordVisibility.current} />
              </button>
            </FormInput>
            <FormInput
              id="confirmPassword"
              type={passwordVisibility.confirm ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm Password"
              icon={<LockIcon className="w-5 h-5 text-gray-400" />}
              isMounted={isMounted}
              delay="600ms"
              error={errors.confirmPassword}
            >
              <button
                type="button"
                aria-label={passwordVisibility.confirm ? "Hide password" : "Show password"}
                onClick={() => setPasswordVisibility(prev => ({ ...prev, confirm: !prev.confirm }))}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-500 transition-transform duration-200 hover:scale-110"
              >
                <PasswordToggleIcon isVisible={passwordVisibility.confirm} />
              </button>
            </FormInput>
            <div
              className={`transition-all duration-500 ease-out ${
                isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: '700ms', paddingTop: '0.5rem' }}
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
                    Signing Up...
                  </>
                ) : 'Sign Up'}
              </button>
            </div>
          </form>

          {/* Login Link */}
          <p
            className={`text-center text-gray-500 text-sm mt-6 sm:mt-8 transition-all duration-500 ease-out ${
              isMounted ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transitionDelay: '1000ms' }}
          >
            Already have an account?{' '}
            <Link href="/login" className="text-red-600 font-semibold hover:text-red-700 transition-colors focus:outline-none focus:underline">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}