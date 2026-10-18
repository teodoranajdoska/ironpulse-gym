import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-full text-sm font-semibold transition-[transform,opacity] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-brand-lime text-brand-950 hover:shadow-glow-strong hover:brightness-105',
        secondary: 'bg-raised text-foreground hover:bg-line',
        outline: 'border border-line bg-transparent text-foreground hover:border-brand-lime/60 hover:bg-brand-lime/[0.06]',
      },
      size: {
        default: 'h-11 px-6',
        sm: 'h-11 px-4 text-xs',
        lg: 'h-12 px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
