import * as React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-indigo-600 text-white hover:bg-indigo-500',
      outline: 'border border-slate-800 bg-transparent hover:bg-slate-800 text-slate-200',
      ghost: 'hover:bg-slate-800 text-slate-300',
      destructive: 'bg-rose-600 text-white hover:bg-rose-500'
    };
    const sizes = {
      default: 'h-10 px-4 py-2',
      sm: 'h-8 rounded-md px-3 text-xs',
      lg: 'h-12 rounded-xl px-8',
      icon: 'h-10 w-10'
    };
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-xl text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:opacity-50',
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
