import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { getBrandLogoUrl } from '@/lib/brand-assets'

const sizes = {
  sm: 40,
  md: 48,
  lg: 56
} as const

type NexusPayLogoProps = {
  className?: string
  wordmarkClassName?: string
  showWordmark?: boolean
  size?: keyof typeof sizes
  href?: string | null
}

export function NexusPayLogo({
  className,
  wordmarkClassName,
  showWordmark = true,
  size = 'md',
  href = '/'
}: NexusPayLogoProps) {
  const dimension = sizes[size]
  const logoSrc = getBrandLogoUrl()

  const content = (
    <>
      <Image
        src={logoSrc}
        alt="NexusPay"
        width={dimension}
        height={dimension}
        className="shrink-0"
        priority
        unoptimized={logoSrc.startsWith('http')}
      />
      {showWordmark ? (
        <span className={cn('truncate font-display font-bold', wordmarkClassName)}>NexusPay</span>
      ) : null}
    </>
  )

  const classes = cn('flex min-w-0 items-center gap-2', className)

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    )
  }

  return <div className={classes}>{content}</div>
}
