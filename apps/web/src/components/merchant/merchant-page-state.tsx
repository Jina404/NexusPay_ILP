export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return <p className="text-sm text-muted py-8 text-center">{label}</p>
}

export function DataError({ message }: { message: string }) {
  if (!message) return null
  return <p className="text-sm text-red-600 py-4">{message}</p>
}
