import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Botones pill (DESIGN.md `button-primary-pill`, `button-secondary`, `button-on-dark`).
 * Radio 9999px, padding mínimo 8x16, peso 400.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-pill font-normal leading-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-primary-deep active:bg-primary-press',
        secondary: 'border border-brand text-brand bg-canvas hover:bg-brand hover:text-white hover:border-brand',
        onDark: 'bg-brand-dark text-white hover:bg-primary-press',
        ghost: 'text-ink-secondary hover:bg-brand/10 hover:text-brand',
        danger: 'bg-state-danger text-white hover:opacity-90',
        brand: 'bg-brand text-white hover:bg-brand-dark active:opacity-90', // 👈 Nueva variante corporativa
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
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
