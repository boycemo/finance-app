import { ArrowDownRight, ArrowUpRight, Wallet } from 'lucide-react'
import { Card } from '@/components/ui/card'
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
      color: 'text-income',
      bg: 'bg-income/10',
      ring: 'ring-income/20',
      icon: <ArrowUpRight className="h-5 w-5" />,
    },
    {
      key: 'expense',
      title: `${monthLabel} 支出`,
      value: expense,
      color: 'text-expense',
      bg: 'bg-expense/10',
      ring: 'ring-expense/20',
      icon: <ArrowDownRight className="h-5 w-5" />,
    },
    {
      key: 'balance',
      title: `${monthLabel} 结余`,
      value: balance,
      color: balance >= 0 ? 'text-balance' : 'text-expense',
      bg: balance >= 0 ? 'bg-balance/10' : 'bg-expense/10',
      ring: balance >= 0 ? 'ring-balance/20' : 'ring-expense/20',
      icon: <Wallet className="h-5 w-5" />,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <Card
          key={item.key}
          className={cn(
            'flex items-center gap-4 p-5 ring-1 ring-inset transition-shadow hover:shadow-md',
            item.ring,
          )}
        >
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', item.bg, item.color)}>
            {item.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">{item.title}</p>
            <p className={cn('mt-1 truncate text-2xl font-bold tabular-nums', item.color)}>
              ¥ {formatMoney(item.value)}
            </p>
          </div>
        </Card>
      ))}
    </div>
  )
}
