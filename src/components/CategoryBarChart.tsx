import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatMoney } from '@/lib/utils'
import type { Category, FinanceRecord } from '@/types'
import { aggregateByCategory } from '@/utils/date'

interface Props {
  records: FinanceRecord[]
  categories: Category[]
  type: 'income' | 'expense'
}

const formatY = (v: number) => {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`
  return `${v}`
}

export default function CategoryBarChart({ records, categories, type }: Props) {
  const catMap = new Map(categories.map((c) => [c.id, c]))
  const data = aggregateByCategory(records, type).map((d) => {
    const cat = catMap.get(d.category)
    return {
      name: cat?.name ?? '未分类',
      value: Number(d.amount.toFixed(2)),
      color: cat?.color ?? '#94a3b8',
    }
  })

  const titleText = type === 'expense' ? '分类支出对比' : '分类收入对比'
  const emptyText = type === 'expense' ? '本月还没支出记录' : '本月还没收入记录'

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mb-3">
        <h3 className="font-serif text-base font-semibold text-foreground/90">{titleText}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground/80">当月按分类汇总的金额</p>
      </div>
      {data.length === 0 ? (
        <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 20, left: 0, bottom: 0 }}
              barCategoryGap={8}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tickFormatter={formatY} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                width={60}
              />
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
                cursor={{ fill: 'hsl(var(--muted))' }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
                {data.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
