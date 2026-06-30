export const paymentLinks = [
  {
    id: 'pl-mock-01',
    publicId: 'demoLinkFixed01',
    title: 'Consultation Payment',
    description: 'Consultation session fee',
    linkType: 'fixed' as const,
    amount: 5000,
    currency: 'KES',
    status: 'active',
    expiresAt: null,
    createdAt: '2026-06-20T10:00:00Z',
    paymentUrl: 'http://localhost:3015/pay/demoLinkFixed01',
    paymentsCount: 12
  },
  {
    id: 'pl-mock-02',
    publicId: 'demoLinkOpen02',
    title: 'Donation',
    description: 'Support our work',
    linkType: 'open' as const,
    amount: null,
    currency: 'KES',
    status: 'active',
    expiresAt: null,
    createdAt: '2026-06-18T14:00:00Z',
    paymentUrl: 'http://localhost:3015/pay/demoLinkOpen02',
    paymentsCount: 5
  }
]
