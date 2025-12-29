"use client";

import { ChangeEvent, ReactNode } from "react";

interface FormInputProps {
  id: string;
  type: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  icon: ReactNode;
  isMounted: boolean;
  delay: string;
  children?: ReactNode;
  error?: string;
}

export const FormInput = ({ id, type, value, onChange, placeholder, icon, isMounted, delay, children, error }: FormInputProps) => (
  <div
    className={`relative transition-all duration-500 ease-out ${
      isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
    }`}
    style={{ transitionDelay: delay }}
  >
    <label htmlFor={id} className="sr-only">{placeholder}</label>
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-4 py-3 bg-gray-50 rounded-lg border ${error ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:ring-2 ${error ? 'focus:ring-red-500' : 'focus:ring-red-500'} focus:border-transparent transition-all duration-300 pl-10 text-gray-900 placeholder:text-gray-400`}
      />
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">{icon}</div>
      {children}
    </div>
    {error && <p className="text-red-500 text-xs mt-1 ml-1">{error}</p>}
  </div>
);