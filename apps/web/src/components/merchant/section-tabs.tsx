'use client'

import { cn } from '@/lib/utils'

export interface TabItem {
  id: string
  label: string
  count?: number
}

export function SectionTabs({
  tabs,
  active,
  onChange
}: {
  tabs: TabItem[]
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-border mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
            active === tab.id
              ? 'border-accent text-accent'
              : 'border-transparent text-muted hover:text-foreground'
          )}
        >
          {tab.label}
          {tab.count !== undefined ? (
            <span className="ml-1.5 text-xs text-muted">({tab.count})</span>
          ) : null}
        </button>
      ))}
    </div>
  )
}
