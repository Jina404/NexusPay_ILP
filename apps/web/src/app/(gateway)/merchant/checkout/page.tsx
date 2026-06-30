import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/merchant/empty-state'
import { ShoppingCart } from 'lucide-react'

export default function MerchantCheckoutPage() {
  return (
    <div>
      <PageHeader
        title="Checkout"
        description="API checkout sessions created via POST /checkout will appear here."
      />
      <EmptyState
        icon={ShoppingCart}
        title="Checkout sessions"
        description="Manage hosted checkout sessions created through the NexusPay API. This section is coming soon."
      />
    </div>
  )
}
