import { EmptyState } from '@/components/merchant/empty-state'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  header: string
  className?: string
  render: (row: T) => React.ReactNode
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  emptyTitle = 'No data',
  emptyDescription,
  onRowClick
}: {
  columns: Column<T>[]
  rows: T[]
  emptyTitle?: string
  emptyDescription?: string
  onRowClick?: (row: T) => void
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-background border-b border-border sticky top-0">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn('text-left p-3 font-medium text-muted whitespace-nowrap', col.className)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-border last:border-0 transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-background/80'
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('p-3 whitespace-nowrap', col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
