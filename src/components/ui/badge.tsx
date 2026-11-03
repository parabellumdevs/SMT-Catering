import * as React from 'react'

import { cn } from '@/lib/utils'

export type BadgeVariant = 'warn' | 'ok' | 'info' | 'neutral' | 'danger' | 'primary' | 'outline'

const variants: Record<BadgeVariant, string> = {
  warn: 'bg-state-warn-bg text-state-warn',
  ok: 'bg-state-ok-bg text-state-ok',
  info: 'bg-state-info-bg text-state-info',
  neutral: 'bg-state-neutral-bg text-state-neutral',
  danger: 'bg-state-danger-bg text-state-danger',
  primary: 'bg-primary-subdued text-primary-deep',
  outline: 'border border-current bg-transparent',
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

/** Pill-tag-soft (DESIGN.md): micro-cap 10px, radio pill, padding 4x8. */
export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-2 py-1 text-[10px] font-medium uppercase tracking-[0.1px]',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
