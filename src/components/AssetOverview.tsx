import { Landmark } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn, formatMoney } from '@/lib/utils'
import type { Account, AccountKind, BalanceSnapshot, SubAccount } from '@/types'
import { accountBalanceAtLatest, latestBalanceDate } from '@/utils/assets'

interface Props {
  accounts: Account[]
  balances: BalanceSnapshot[]
  subAccounts: SubAccount[]
  month?: string // YYYY-MM，可选：只看某月
}

export const KIND_LABELS: Record<AccountKind, string> = {
  cash: '货币资金',
  investment: '投资账户',
  fund: '基金理财',
  credit: '信用账户',
  receivable: '应收',
  payable: '应付',
  other: '其他',
}

const KIND_ORDER: AccountKind[] = ['cash', 'investment', 'fund', 'credit', 'receivable', 'payable', 'other']

export default function AssetOverview({ accounts, balances, subAccounts, month }: Props) {
  const activeAccounts = accounts.filter((a) => !a.archived)
  const latestDate = latestBalanceDate(balances)
  const total = activeAccounts.reduce((sum, a) => {
    return sum + accountBalanceAtLatest(a, balances, subAccounts)
  }, 0)

  // 分类汇总
  const byKind = new Map<AccountKind, number>()
  activeAccounts.forEach((a) => {
    const v = accountBalanceAtLatest(a, balances, subAccounts)
    byKind.set(a.kind, (byKind.get(a.kind) || 0) + v)
  })

  const kinds: Array<{ kind: AccountKind; value: number }> = KIND_ORDER
    .map((k) => ({ kind: k, value: byKind.get(k) || 0 }))
    .filter((k) => k.value > 0)

  const covered = activeAccounts.filter((a) => accountBalanceAtLatest(a, balances, subAccounts) !== 0).length

  return (
    <Card className="overflow-hidden">
      <div
        className={
          // 浅色：亮蓝渐变；暗色：深蓝渐变（融入背景）
          'p-6 bg-gradient-to-br ' +
          'from-blue-600 to-blue-500 ' +
          'dark:from-blue-950 dark:to-indigo-900 dark:border dark:border-blue-900/50'
        }
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="text-primary-foreground">
            <p className="flex items-center gap-1.5 text-sm opacity-90">
              <Landmark className="h-4 w-4" />
              {month ? `${month} 资产总览` : '资产总览'}
            </p>
            <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight">
              ¥ {formatMoney(total)}
            </p>
            <p className="mt-1 text-xs opacity-80">
              已录入 {covered}/{activeAccounts.length} 个账户
              {latestDate && <span className="ml-2">截至 {latestDate}</span>}
            </p>
          </div>

          {kinds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {kinds.map((k) => (
                <div
                  key={k.kind}
                  className="rounded-lg bg-white/15 px-3 py-2 text-primary-foreground backdrop-blur-sm"
                >
                  <p className="text-xs opacity-90">{KIND_LABELS[k.kind]}</p>
                  <p className="text-base font-semibold tabular-nums">
                    ¥ {formatMoney(k.value)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
