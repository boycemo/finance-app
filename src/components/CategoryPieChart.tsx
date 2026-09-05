import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatMoney } from '@/lib/utils'
import type { Category, FinanceRecord } from '@/types'
import { aggregateByCategory } from '@/utils/date'

interface Props {
  records: FinanceRecord[]
  categories: Category[]
  type: 'income' | 'expense'
}

export default function CategoryPieChart({ records, categories, type }: Props) {
  const catMap = new Map(categories.map((c) => [c.id, c]))
  const data = aggregateByCategory(records, type).map((d) => {
    const cat = catMap.get(d.category)
    return {
      name: cat?.name ?? '未分类',
      value: Number(d.amount.toFixed(2)),
      color: cat?.color ?? '#94a3b8',
    }
  })

  const titleText = type === 'expense' ? '支出分类占比' : '收入分类占比'

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mb-3">
        <h3 className="font-serif text-base font-semibold text-foreground/90">{titleText}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground/80">当月各分类金额占比</p>
      </div>
      {data.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
          暂无数据
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="h-[220px] w-full sm:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  formatter={(value: number) => `¥ ${formatMoney(value)}`}
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 10,
                    color: 'hsl(var(--foreground))',
                    fontSize: 12,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  }}
                />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                >
                  {data.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="w-full space-y-1.5 text-sm sm:w-1/2">
            {data.slice(0, 6).map((d) => {
              const total = data.reduce((s, x) => s + x.value, 0)
              const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0.0'
              return (
                <li key={d.name} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ background: d.color }}
                    />
                    <span className="truncate text-foreground">{d.name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {pct}%
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
