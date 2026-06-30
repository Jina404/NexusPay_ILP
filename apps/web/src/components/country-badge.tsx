'use client'

import { cn } from '@/lib/utils'
import { COUNTRIES, type CountryCode } from '@/lib/utils'
import { KE, UG, TZ, ET, SD } from 'country-flag-icons/react/3x2'
import { Badge } from '@/components/ui/badge'

const FLAGS: Record<CountryCode, React.ComponentType<{ className?: string }>> = {
  KE,
  UG,
  TZ,
  ET,
  SD
}

export function CountryBadge({
  code,
  showName = false,
  className
}: {
  code: CountryCode
  showName?: boolean
  className?: string
}) {
  const country = COUNTRIES.find((c) => c.code === code)
  const Flag = FLAGS[code]
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <Flag className="h-3.5 w-5 rounded-sm object-cover" />
      <span className="text-sm font-medium">{showName ? country?.name : code}</span>
      {!country?.live ? (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          Soon
        </Badge>
      ) : null}
    </span>
  )
}
