import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
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
import { ChevronDown, ChevronUp, ListFilter, LineChart as LineChartIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatMoney } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { Account, BalanceSnapshot, SubAccount } from '@/types'
import {
  allMonthsFromRecords,
  buildMonthlyReport,
  buildTimeSeries,
  collectBalanceDates,
  monthFullLabel,
  monthShortLabel,
} from '@/utils/assets'

interface Props {
  accounts: Account[]
  balances: BalanceSnapshot[]
  subAccounts: SubAccount[]
}

const formatY = (v: number) => {
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}万`
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`
  return `${v}`
}

// （tooltip 样式已内联到 BalanceTooltip）

// 把日期格式化成 X 轴短标签：MM-DD（同年）或 MM/DD（跨年）
const formatDateTick = (d: string, dates: string[]) => {
  const hasMultipleYears = new Set(dates.map((x) => x.slice(0, 4))).size > 1
  return hasMultipleYears ? d.slice(5).replace('-', '/') : d.slice(5).replace('-', '-')
}

// 自定义 Tooltip：显示该日期所有账户明细 + 合计
function BalanceTooltip({ active, payload, label, accounts }: any) {
  if (!active || !payload || payload.length === 0) return null
  const dateLabel = dayjs(label).isValid() ? dayjs(label).format('YYYY年MM月DD日') : String(label)
  // 排除合计线（__total__），只统计账户明细
  const accountEntries = payload.filter((p: any) => accounts.some((a: Account) => a.id === p.dataKey))
  const total = accountEntries.reduce((s: number, p: any) => s + Number(p.value || 0), 0)
  return (
    <div
      style={{
        background: 'hsl(var(--popover))',
        border: '1px solid hsl(var(--border))',
        borderRadius: 8,
        color: 'hsl(var(--popover-foreground))',
        padding: '8px 10px',
        minWidth: 180,
        maxHeight: 260,
        overflowY: 'auto',
      }}
    >
      <p style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>{dateLabel}</p>
      {/* 合计排第一位 */}
      <div
        style={{
          marginBottom: 6,
          paddingBottom: 6,
          borderBottom: '1px solid hsl(var(--border))',
          display: 'flex',
          justifyContent: 'space-between',
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        <span>总额</span>
        <span style={{ color: total < 0 ? '#dc2626' : 'inherit' }}>
          ¥ {formatMoney(total)}
        </span>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {accountEntries.map((entry: any) => {
          const acc = accounts.find((a: Account) => a.id === entry.dataKey)
          const val = Number(entry.value)
          return (
            <li
              key={entry.dataKey}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                fontSize: 12,
                padding: '2px 0',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: entry.color,
                    display: 'inline-block',
                  }}
                />
                <span>
                  {acc.icon} {acc.name}
                </span>
              </span>
              <span
                style={{
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                  color: val < 0 ? '#dc2626' : 'inherit',
                }}
              >
                ¥ {formatMoney(val)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function BalanceReport({ accounts, balances, subAccounts }: Props) {
  const months = useMemo(() => allMonthsFromRecords(balances), [balances])
  const rows = useMemo(
    () => buildMonthlyReport(accounts, balances, subAccounts, months),
    [accounts, balances, subAccounts, months],
  )

  // 展示顺序：最新月份在最上方（倒序渲染），但环比数据仍按原月份顺序计算
  const displayedRows = useMemo(() => [...rows].reverse(), [rows])

  // 时间点序列（每次录入 = 一个点）
  const timeSeries = useMemo(
    () => {
      const dates = collectBalanceDates(balances)
      return { dates, series: buildTimeSeries(accounts, balances, subAccounts, dates) }
    },
    [accounts, balances, subAccounts],
  )

  // 勾选展示哪些账户（默认全部）
  const [shown, setShown] = useState<Set<string>>(() => {
    const all = accounts.filter((a) => !a.archived).map((a) => a.id)
    return new Set(all)
  })
  const activeAccounts = accounts.filter((a) => !a.archived)

  const toggleShown = (id: string) => {
    setShown((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const selectAllShown = () => setShown(new Set(activeAccounts.map((a) => a.id)))
  const clearShown = () => setShown(new Set())

  // 是否有余额记录（全 0 视为无数据，显示空状态）
  const hasData = rows.some((r) => r.total !== 0)

  // 趋势图数据：每个时间点 = 一行；合计 = 勾选账户之和
  const chartData = useMemo(() => {
    return timeSeries.series.map((s) => {
      const row: Record<string, number | string> = { date: s.date }
      let total = 0
      activeAccounts.forEach((a) => {
        row[a.id] = s.values[a.id] ?? 0
        if (shown.has(a.id)) total += row[a.id] as number
      })
      row.__total__ = total
      return row
    })
  }, [timeSeries, activeAccounts, shown])

  // 月度环比
  const prevTotalMap = useMemo(() => {
    const map = new Map<string, number | null>()
    for (let i = 0; i < rows.length; i++) {
      map.set(rows[i].month, i === 0 ? null : rows[i - 1].total)
    }
    return map
  }, [rows])

  if (!hasData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <LineChartIcon className="h-4 w-4" />
            余额趋势与月度报表
          </CardTitle>
          <CardDescription>录入余额后，趋势图按每次录入时间点展示</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-10 text-center text-sm text-muted-foreground">
            还没有余额数据 —— 先去上面给账户「记余额」吧 💡
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* ===== 趋势图 ===== */}
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LineChartIcon className="h-4 w-4" />
              余额趋势
            </CardTitle>
            <CardDescription>每次余额录入都是一个数据点（当日各账户记录值，与月度报表口径一致）</CardDescription>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                <ListFilter className="h-3.5 w-3.5" />
                显示 {shown.size}/{activeAccounts.length} 个账户
                <ChevronDown className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="end">
              <div className="mb-1.5 flex items-center justify-between px-1 text-xs">
                <button
                  onClick={selectAllShown}
                  className="font-medium text-primary hover:opacity-80"
                >
                  全选
                </button>
                <button
                  onClick={clearShown}
                  className="text-muted-foreground hover:text-foreground"
                >
                  清空
                </button>
              </div>
              <div className="max-h-64 space-y-0.5 overflow-y-auto">
                {activeAccounts.map((a) => {
                  const on = shown.has(a.id)
                  return (
                    <label
                      key={a.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm transition-colors hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggleShown(a.id)}
                        className="h-4 w-4 accent-primary"
                      />
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-sm"
                        style={{ background: a.color }}
                      />
                      <span className="flex-1 truncate">
                        {a.icon} {a.name}
                      </span>
                    </label>
                  )
                })}
              </div>
              <p className="mt-1.5 border-t border-border pt-1.5 px-1 text-[10px] text-muted-foreground">
                合计 = 勾选账户之和
              </p>
            </PopoverContent>
          </Popover>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatDateTick(v, timeSeries.dates)}
                  angle={timeSeries.dates.length > 6 ? -30 : 0}
                  textAnchor={timeSeries.dates.length > 6 ? 'end' : 'middle'}
                  height={timeSeries.dates.length > 6 ? 50 : 30}
                />
                <YAxis tickFormatter={formatY} tickLine={false} axisLine={false} />
                <Tooltip
                  content={<BalanceTooltip accounts={activeAccounts} />}
                  labelFormatter={(label) => {
                    if (typeof label !== 'string') return label as string
                    return dayjs(label).isValid() ? dayjs(label).format('YYYY年MM月DD日') : label
                  }}
                />
                <Legend />
                {/* 只渲染勾选中的账户线 */}
                {activeAccounts
                  .filter((a) => shown.has(a.id))
                  .map((a) => (
                    <Line
                      key={a.id}
                      type="monotone"
                      dataKey={a.id}
                      name={`${a.icon} ${a.name}`}
                      stroke={a.color}
                      strokeWidth={2}
                      dot={{ r: 2.5 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                {/* 合计线（始终在最上层，便于对照） */}
                <Line
                  type="monotone"
                  dataKey="__total__"
                  name="合计"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ===== 月度报表 ===== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>月度余额报表</CardTitle>
          <CardDescription>
            全部历史月份（{months.length} 个月）· 各账户当月留存金额（无记录的月份为 0），可滚动查看
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card shadow-sm">
                <tr className="border-b border-border">
                  <th className="whitespace-nowrap px-2 py-2 text-left font-medium text-muted-foreground">
                    月份
                  </th>
                  {activeAccounts.map((a) => (
                    <th
                      key={a.id}
                      className="whitespace-nowrap px-2 py-2 text-right font-medium"
                    >
                      <span className="mr-1">{a.icon}</span>
                      {a.name}
                    </th>
                  ))}
                  <th className="whitespace-nowrap px-2 py-2 text-right font-semibold">
                    合计
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((r) => {
                  const prev = prevTotalMap.get(r.month) ?? null
                  const diff = prev !== null ? r.total - prev : null
                  return (
                    <tr
                      key={r.month}
                      className={cn(
                        'border-b border-border/60 transition-colors',
                        r.month === months[months.length - 1] && 'bg-primary/5',
                      )}
                    >
                      <td className="whitespace-nowrap px-2 py-2 font-medium">
                        {monthFullLabel(r.month)}
                        {r.month === months[months.length - 1] && (
                          <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                            本月
                          </span>
                        )}
                      </td>
                      {activeAccounts.map((a) => {
                        const v = r.values[a.id] ?? 0
                        return (
                          <td
                            key={a.id}
                            className="whitespace-nowrap px-2 py-2 text-right tabular-nums"
                          >
                            {v === 0 ? (
                              <span className="text-muted-foreground/40">0</span>
                            ) : (
                              <span>{formatMoney(v)}</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="whitespace-nowrap px-2 py-2 text-right font-semibold tabular-nums">
                        {r.total === 0 ? (
                          <span className="text-muted-foreground/40">0</span>
                        ) : (
                          <span>{formatMoney(r.total)}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="px-2 py-1.5 text-xs text-muted-foreground" colSpan={1 + activeAccounts.length + 1}>
                    共 {months.length} 个月 · 金额单位：元 · 可上下滚动查看更多历史
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 环比说明（放表格下方） */}
          <div className="mt-3 space-y-1">
            {displayedRows.map((r) => {
              const prev = prevTotalMap.get(r.month) ?? null
              if (prev === null) return null
              const diff = r.total - prev
              return (
                <p key={r.month} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-16 shrink-0 font-medium">{monthShortLabel(r.month)}</span>
                  {diff === 0 ? (
                    <span className="font-semibold tabular-nums text-muted-foreground">持平</span>
                  ) : (
                  <span
                    className={cn(
                      'flex items-center gap-0.5 font-semibold tabular-nums',
                      diff > 0 && 'text-emerald-600',
                      diff < 0 && 'text-rose-600',
                    )}
                  >
                    {diff > 0 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {diff > 0 ? '+' : ''}
                    {formatMoney(diff)}
                  </span>
                  )}
                  <span className="text-muted-foreground/70">较上月</span>
                </p>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
