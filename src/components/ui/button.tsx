import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-normal leading-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-[#581c25] text-white hover:bg-primary-deep active:bg-primary-press',
        secondary: 'border border-brand text-brand bg-canvas hover:bg-brand hover:text-white hover:border-brand',
        onDark: 'bg-brand-dark text-white hover:bg-primary-press',
        ghost: 'text-ink-secondary hover:bg-brand/10 hover:text-brand',
        danger: 'bg-state-danger text-white hover:opacity-90',
        brand: 'bg-brand text-white hover:bg-brand-dark active:opacity-90',
        borravino: 'bg-[#581c25] text-white hover:bg-[#45141c] active:opacity-90',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-11 px-6 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({ className, variant, size, asChild = false, type = 'button', ...props }: Readonly<ButtonProps>) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}