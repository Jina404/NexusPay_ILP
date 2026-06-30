import { MerchantShell } from '@/components/merchant-shell'
import { ApiKeyBanner } from '@/components/merchant/api-key-banner'

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  return (
    <MerchantShell>
      <ApiKeyBanner />
      {children}
    </MerchantShell>
  )
}
