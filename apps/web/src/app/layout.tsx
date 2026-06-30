import type { Metadata, Viewport } from 'next'
import './globals.css'
import { getBrandLogoUrl } from '@/lib/brand-assets'

const logoUrl = getBrandLogoUrl()

export const metadata: Metadata = {
  title: 'NexusPay — Accept payments. Settle globally.',
  description: 'Payment gateway and settlement platform powered by Interledger',
  icons: {
    icon: logoUrl,
    apple: logoUrl
  }
}
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="premium-canvas min-h-screen min-h-[100dvh] overflow-x-hidden text-foreground font-sans antialiased">
        {children}
      </body>
    </html>
  )
}