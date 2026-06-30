/** @type {import('next').NextConfig} */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : 'psqjqxsxjeiduuyhkcgt.supabase.co'

const nextConfig = {
  transpilePackages: ['@nexuspay/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseHost,
        pathname: '/storage/v1/object/public/**'
      }
    ]
  },
  async redirects() {
    return [
      { source: '/browse', destination: '/merchant', permanent: false },
      { source: '/cart', destination: '/merchant', permanent: false },
      { source: '/checkout', destination: '/merchant', permanent: false },
      { source: '/seller/dashboard', destination: '/merchant', permanent: false },
      { source: '/seller/products/new', destination: '/merchant', permanent: false },
      { source: '/products/:id', destination: '/merchant', permanent: false },
      { source: '/orders/:id', destination: '/merchant', permanent: false },
      { source: '/payments/:id', destination: '/merchant', permanent: false },
      { source: '/merchant/wallet', destination: '/merchant/wallets', permanent: true },
      { source: '/merchant/analytics', destination: '/merchant/reports', permanent: true }
    ]
  }
}

export default nextConfig
