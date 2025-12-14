import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'forge';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  disabled,
  ...props 
}) => {
  // Base: Industrial Block, no rounding, monospace font
  const baseStyle = "font-mono uppercase tracking-widest transition-all duration-100 flex items-center justify-center gap-2 focus:outline-none border-2 active:translate-y-1";
  
  const variants = {
    // Green Terminal
    primary: "bg-teal-900/20 border-teal-600 text-teal-400 hover:bg-teal-600 hover:text-black hover:shadow-[0_0_10px_rgba(45,212,191,0.5)] disabled:border-slate-800 disabled:text-slate-700 disabled:bg-transparent disabled:shadow-none",
    
    // Grey Industrial
    secondary: "bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200 disabled:opacity-30",
    
    // Alert Red
    danger: "bg-red-900/20 border-red-600 text-red-500 hover:bg-red-600 hover:text-black hover:shadow-[0_0_10px_rgba(220,38,38,0.5)]",
    
    // Transparent
    ghost: "bg-transparent border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-800",
    
    // Forge Amber
    forge: "bg-amber-900/20 border-amber-600 text-amber-500 hover:bg-amber-600 hover:text-black hover:shadow-[0_0_15px_rgba(245,158,11,0.6)]"
  };

  const sizes = {
    sm: "px-2 py-1 text-xs border",
    md: "px-6 py-3 text-sm border-2",
    lg: "px-8 py-4 text-lg border-2"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className} ${disabled ? 'cursor-not-allowed active:translate-y-0' : ''}`}
      disabled={disabled}
      {...props}
    >
      {/* Decorative corners for industrial feel */}
      {!disabled && variant !== 'ghost' && (
        <>
            <span className="absolute top-0 left-0 w-1 h-1 bg-current opacity-50"></span>
            <span className="absolute bottom-0 right-0 w-1 h-1 bg-current opacity-50"></span>
        </>
      )}
      {children}
    </button>
  );
};