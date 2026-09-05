import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatMoney } from '@/lib/utils'
import type { MonthStat } from '@/types'

interface Props {
  data: MonthStat[]
}

const formatMonth = (m: string) => {
  // m = YYYY-MM -> MM月
  const [, mm] = m.split('-')
  return `${parseInt(mm, 10)}月`
}

const formatY = (v: number) => {
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}万`
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`
  return `${v}`
}

export default function TrendChart({ data }: Props) {
  const hasData = data.some((d) => d.income > 0 || d.expense > 0)
  const chartData = data.map((d) => ({
    month: formatMonth(d.month),
    收入: Number(d.income.toFixed(2)),
    支出: Number(d.expense.toFixed(2)),
    结余: Number(d.balance.toFixed(2)),
  }))

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3">
        <h3 className="font-serif text-base font-semibold text-foreground/90">收支趋势</h3>
        <p className="mt-0.5 text-xs text-muted-foreground/80">最近 12 个月的收入、支出和结余变化</p>
      </div>
      <div className="">
        {!hasData ? (
          <div className="flex h-[320px] flex-col items-center justify-center text-sm text-muted-foreground">
            <p>暂无趋势数据</p>
            <p className="mt-1 text-xs">记几笔后这里会显示一条漂亮的曲线</p>
          </div>
        ) : (
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={formatY} tickLine={false} axisLine={false} />
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
                <Legend />
                <Line
                  type="monotone"
                  dataKey="收入"
                  stroke="hsl(var(--income))"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="支出"
                  stroke="hsl(var(--expense))"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="结余"
                  stroke="hsl(var(--balance))"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
