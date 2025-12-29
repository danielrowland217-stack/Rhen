import React from 'react';

interface InputProps {
  id: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  isMounted: boolean;
  delay: string;
  error?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  id,
  type,
  value,
  onChange,
  placeholder,
  isMounted,
  delay,
  error,
  icon,
  children
}) => {
  return (
    <div
      className={`relative transition-all duration-500 ease-out ${
        isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ transitionDelay: delay }}
    >
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            {icon}
          </div>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-300 ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {children}
      </div>
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
};
