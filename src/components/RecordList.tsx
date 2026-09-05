import { useMemo } from 'react'
import { Pencil, Trash2, Inbox } from 'lucide-react'
import dayjs from 'dayjs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, formatMoney } from '@/lib/utils'
import type { Category, FinanceRecord } from '@/types'

/* 入场动画 stagger 组 */
const listItem = 'animate-in slide-in-from-bottom-2 fade-in duration-300'

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
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
        {/* 空状态图标 */}
        <div className="relative">
          <Inbox className="h-12 w-12 opacity-30" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-muted-foreground/20" />
          </div>
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground/60">本月还没有记录</p>
          <p className="mt-1 text-xs">点右上角「记一笔」开始记账</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {grouped.map(([date, list]) => {
        const dayTotal = list.reduce(
          (s, r) => (r.type === 'income' ? s + r.amount : s - r.amount),
          0,
        )
        return (
          <div key={date} className="rounded-xl bg-card/50 p-3 backdrop-blur-sm dark:bg-white/[0.03]">
            {/* 日期行 */}
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground/70">
                  {dayjs(date).format('MM月DD日')}
                </span>
                <span className="rounded-full bg-muted px-2 py-px text-[10px] text-muted-foreground">
                  {dayjs(date).format('ddd')}
                </span>
              </div>
              <span
                className={cn(
                  'text-xs font-semibold tabular-nums',
                  dayTotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
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
                    className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 hover:bg-muted/60"
                  >
                    {/* 分类图标：更圆润的圆形容器 */}
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[17px] shadow-sm"
                      style={{ background: (cat?.color ?? '#94a3b8') + '25' }}
                    >
                      {cat?.icon ?? '📦'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {cat?.name ?? '未分类'}
                        </span>
                        <Badge
                          variant={r.type === 'income' ? 'default' : 'destructive'}
                          className={cn(
                            'h-5 gap-1 px-2 text-[10px] font-medium',
                            r.type === 'income' &&
                              'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25',
                            r.type === 'expense' &&
                              'bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25',
                          )}
                        >
                          <span className={cn('h-1 w-1 rounded-full',
                            r.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'
                          )} />
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
                        'shrink-0 text-[15px] font-semibold tabular-nums tracking-tight',
                        r.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                      )}
                    >
                      {r.type === 'income' ? '+' : '-'}¥{formatMoney(r.amount)}
                    </div>

                    {/* 操作按钮：hover 时更明显 */}
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-all duration-200 group-hover:opacity-100">
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
