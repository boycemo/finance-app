import { Landmark, NotebookPen } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ViewTab = 'records' | 'assets'

interface Props {
  view: ViewTab
  onChange: (v: ViewTab) => void
}

/** Tab 切换栏：账户余额 / 收支记账 */
export default function TabBar({ view, onChange }: Props) {
  const tabs: Array<{ key: ViewTab; label: string; icon: typeof Landmark }> = [
    { key: 'assets', label: '账户余额', icon: Landmark },
    { key: 'records', label: '收支记账', icon: NotebookPen },
  ]
  return (
    <div className="sticky top-16 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl gap-1 px-4 pt-2 sm:px-6">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={cn(
              'flex items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              view === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
