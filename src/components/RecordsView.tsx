import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatMoney } from '@/lib/utils'
import type { FinanceRecord } from '@/types'
import { filterByMonth, lastNMonthsTrend, summarizeMonth } from '@/utils/date'
import { useAppData } from '@/context/DataContext'
import StatCards from './StatCards'
import TrendChart from './TrendChart'
import MonthOverview from './MonthOverview'
import RecordList from './RecordList'

interface Props {
  month: string
  editing: FinanceRecord | null
  onEdit: (r: FinanceRecord) => void
  onCancelEdit: () => void
}

/** 收支记账视图：概览卡 + 趋势图 + 月度分类 + 明细列表 */
export default function RecordsView({ month, editing, onEdit, onCancelEdit }: Props) {
  const { records, categories, deleteRecord } = useAppData()
  const [filterCategory, setFilterCategory] = useState<string | null>(null)

  // 计算当月汇总
  const monthSummary = useMemo(() => summarizeMonth(records, month), [records, month])
  const monthRecords = useMemo(() => filterByMonth(records, month), [records, month])
  // 12 个月趋势
  const trend = useMemo(() => lastNMonthsTrend(records, 12), [records])

  // 编辑入口由列表触发；取消编辑时清除筛选联动状态由父组件管理
  void editing
  void onCancelEdit

  return (
    <>
      {/* 概览区 */}
      <section className="space-y-4">
        <StatCards
          income={monthSummary.income}
          expense={monthSummary.expense}
          balance={monthSummary.balance}
          monthLabel={`${dayjs(month).format('YYYY年MM月')}`}
        />
        <TrendChart data={trend} />
        <MonthOverview
          records={monthRecords}
          categories={categories}
          month={month}
          income={monthSummary.income}
          expense={monthSummary.expense}
          balance={monthSummary.balance}
        />
      </section>

      {/* 明细区 */}
      <section>
        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader className="border-b border-border/60 bg-muted/20 px-4 py-3 pb-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <CardTitle className="font-serif text-base font-semibold">本月明细</CardTitle>
                <CardDescription className="text-xs">
                  共 {monthSummary.count} 笔 · 支出 ¥{formatMoney(monthSummary.expense)} · 收入 ¥
                  {formatMoney(monthSummary.income)}
                </CardDescription>
              </div>
              {filterCategory && (
                <Button variant="ghost" size="sm" onClick={() => setFilterCategory(null)}>
                  清除筛选
                </Button>
              )}
            </div>

            {/* 分类筛选器 */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button
                onClick={() => setFilterCategory(null)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs transition-colors',
                  filterCategory === null
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:bg-muted',
                )}
              >
                全部
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setFilterCategory(c.id === filterCategory ? null : c.id)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs transition-colors',
                    filterCategory === c.id
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  <span className="mr-1">{c.icon}</span>
                  {c.name}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <RecordList
              records={monthRecords}
              categories={categories}
              onEdit={onEdit}
              onDelete={deleteRecord}
              filterCategory={filterCategory}
            />
          </CardContent>
        </Card>
      </section>
    </>
  )
}
