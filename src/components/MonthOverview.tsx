import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import CategoryBarChart from './CategoryBarChart'
import CategoryPieChart from './CategoryPieChart'
import StatCards from './StatCards'
import type { Category, FinanceRecord } from '@/types'

interface Props {
  records: FinanceRecord[]
  categories: Category[]
  month: string // YYYY-MM
  income: number
  expense: number
  balance: number
  onJumpToCategory?: (categoryId: string) => void
}

export default function MonthOverview({
  records,
  categories,
  month,
  income,
  expense,
  balance,
  onJumpToCategory,
}: Props) {
  const [chartType, setChartType] = useState<'expense' | 'income'>('expense')

  const [year, monthNum] = month.split('-')
  const monthLabel = `${year}年${parseInt(monthNum, 10)}月`

  return (
    <div className="space-y-4">
      <StatCards income={income} expense={expense} balance={balance} monthLabel={monthLabel} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">当月分类明细</h3>
            <Tabs value={chartType} onValueChange={(v) => setChartType(v as 'expense' | 'income')}>
              <TabsList className="h-8">
                <TabsTrigger value="expense" className="h-6 text-xs">
                  支出
                </TabsTrigger>
                <TabsTrigger value="income" className="h-6 text-xs">
                  收入
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <CategoryBarChart records={records} categories={categories} type={chartType} />
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">占比视图</h3>
          <CategoryPieChart records={records} categories={categories} type={chartType} />
        </div>
      </div>

      {onJumpToCategory && (
        <p className="text-xs text-muted-foreground">
          💡 在下方明细列表中可按分类筛选
        </p>
      )}
    </div>
  )
}
