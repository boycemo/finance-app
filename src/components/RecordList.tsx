import { useMemo } from 'react'
import { Pencil, Trash2, Inbox } from 'lucide-react'
import dayjs from 'dayjs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, formatMoney } from '@/lib/utils'
import type { Category, FinanceRecord } from '@/types'

interface Props {
  records: FinanceRecord[]
  categories: Category[]
  onEdit: (r: FinanceRecord) => void
  onDelete: (id: string) => void
  filterCategory?: string | null
}

export default function RecordList({
  records,
  categories,
  onEdit,
  onDelete,
  filterCategory,
}: Props) {
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const filtered = useMemo(() => {
    if (!filterCategory) return records
    return records.filter((r) => r.category === filterCategory)
  }, [records, filterCategory])

  // 按日期分组
  const grouped = useMemo(() => {
    const map = new Map<string, FinanceRecord[]>()
    filtered.forEach((r) => {
      const key = r.date
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    })
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [filtered])

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Inbox className="h-10 w-10 opacity-40" />
        <p>本月还没有记录</p>
        <p className="text-xs">点右上角「记一笔」开始记账</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      {grouped.map(([date, list]) => {
        const dayTotal = list.reduce(
          (s, r) => (r.type === 'income' ? s + r.amount : s - r.amount),
          0,
        )
        return (
          <div key={date} className="py-3 first:pt-0 last:pb-0">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {dayjs(date).format('MM月DD日')}
                <span className="ml-2 text-muted-foreground">
                  {dayjs(date).format('ddd')}
                </span>
              </span>
              <span
                className={cn(
                  'tabular-nums',
                  dayTotal >= 0 ? 'text-income' : 'text-expense',
                )}
              >
                {dayTotal >= 0 ? '+' : '-'}¥{formatMoney(Math.abs(dayTotal))}
              </span>
            </div>
            <ul className="space-y-1">
              {list.map((r) => {
                const cat = catMap.get(r.category)
                return (
                  <li
                    key={r.id}
                    className="group flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/60"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
                      style={{ background: (cat?.color ?? '#94a3b8') + '20' }}
                    >
                      {cat?.icon ?? '📦'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {cat?.name ?? '未分类'}
                        </span>
                        <Badge
                          variant={r.type === 'income' ? 'default' : 'destructive'}
                          className={cn(
                            'h-5 px-1.5 text-[10px]',
                            r.type === 'income' &&
                              'bg-income/15 text-income hover:bg-income/20',
                            r.type === 'expense' &&
                              'bg-expense/15 text-expense hover:bg-expense/20',
                          )}
                        >
                          {r.type === 'income' ? '收入' : '支出'}
                        </Badge>
                      </div>
                      {r.note && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {r.note}
                        </p>
                      )}
                    </div>
                    <div
                      className={cn(
                        'shrink-0 text-base font-semibold tabular-nums',
                        r.type === 'income' ? 'text-income' : 'text-expense',
                      )}
                    >
                      {r.type === 'income' ? '+' : '-'}¥{formatMoney(r.amount)}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onEdit(r)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm('删除这条记录？')) onDelete(r.id)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
