import { MerchantShell } from '@/components/merchant-shell'
import { MerchantSessionProvider } from '@/components/merchant/merchant-bootstrap'

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  return (
    <MerchantShell>
      <MerchantSessionProvider>{children}</MerchantSessionProvider>
    </MerchantShell>
  )
}
