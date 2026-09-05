import { ArrowDownRight, ArrowUpRight, Wallet } from 'lucide-react'
import { cn, formatMoney } from '@/lib/utils'

interface Props {
  income: number
  expense: number
  balance: number
  monthLabel: string
}

export default function StatCards({ income, expense, balance, monthLabel }: Props) {
  const items = [
    {
      key: 'income',
      title: `${monthLabel} 收入`,
      value: income,
      color: 'text-emerald-600 dark:text-emerald-400',
      icon: <ArrowUpRight className="h-4 w-4" />,
    },
    {
      key: 'expense',
      title: `${monthLabel} 支出`,
      value: expense,
      color: 'text-rose-600 dark:text-rose-400',
      icon: <ArrowDownRight className="h-4 w-4" />,
    },
    {
      key: 'balance',
      title: `${monthLabel} 结余`,
      value: balance,
      color: balance >= 0 ? 'text-primary dark:text-primary' : 'text-rose-600 dark:text-rose-400',
      icon: <Wallet className="h-4 w-4" />,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.key}
          className={cn(
            'rounded-xl border border-border/60 bg-card p-4 shadow-sm',
            'transition-all duration-200 hover:border-border',
          )}
        >
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground/70">
            <span className={cn('flex items-center justify-center rounded-md bg-muted/60 p-1', item.color)}>
              {item.icon}
            </span>
            {item.title}
          </div>
          <p className={cn('mt-2 font-serif text-2xl font-semibold tabular-nums tracking-tight', item.color)}>
            ¥ {formatMoney(item.value)}
          </p>
        </div>
      ))}
    </div>
  )
}
