import * as SliderPrimitive from '@radix-ui/react-slider'
import * as React from 'react'

import { cn } from '@/lib/utils'

/** Slider Radix con targets táctiles ≥44px en móvil (AGENTS.md §a11y/responsividad). */
export function Slider({
  className,
  ...props
}: Readonly<React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>>) {
  return (
    <SliderPrimitive.Root
      className={cn('relative flex h-11 w-full touch-none items-center', className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-pill bg-hairline">
        <SliderPrimitive.Range className="absolute h-full bg-[#581c25]" />
      </SliderPrimitive.Track>
<SliderPrimitive.Thumb
  className="block h-6 w-6 rounded-pill border border-[#581c25] bg-canvas shadow-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#581c25]"
  aria-label="Cantidad de comensales"
/>
    </SliderPrimitive.Root>
  )
}
