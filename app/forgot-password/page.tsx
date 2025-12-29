"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { MailIcon } from "../signup/Icons";
import { FormInput } from "../signup/FormInput";
import { resetPassword } from "../../lib/supabaseClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setGeneralError(null);
    setSuccessMessage(null);
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setGeneralError(null);
    setSuccessMessage(null);

    if (!email) {
      setGeneralError("Email is required");
      setIsSubmitting(false);
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setGeneralError("Please enter a valid email address");
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await resetPassword(email);

      if (error) {
        setGeneralError(error.message);
      } else {
        setSuccessMessage("Password reset email sent! Check your inbox.");
      }
    } catch (err: any) {
      console.error('Reset password error:', err);
      setGeneralError('An unexpected error occurred. Please try again.');
    } finally {
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
              Forgot Password?
            </h1>
            <p className="text-gray-500 mt-2">Enter your email to reset your password</p>
          </div>

          {generalError && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm text-center">
              {generalError}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm text-center">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 mb-6" noValidate>
            <FormInput
              id="email"
              type="email"
              value={email}
              onChange={handleChange}
              placeholder="Email Address"
              icon={<MailIcon className="w-5 h-5 text-gray-400" />}
              isMounted={isMounted}
              delay="200ms"
            />
            <div
              className={`transition-all duration-500 ease-out ${
                isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: '300ms', paddingTop: '0.5rem' }}
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
                    Sending...
                  </>
                ) : 'Send Reset Email'}
              </button>
            </div>
          </form>

          <p
            className={`text-center text-gray-500 text-sm mt-6 sm:mt-8 transition-all duration-500 ease-out ${
              isMounted ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transitionDelay: '400ms' }}
          >
            Remember your password?{' '}
            <Link href="/login" className="text-red-600 font-semibold hover:text-red-700 transition-colors focus:outline-none focus:underline">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
