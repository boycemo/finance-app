import { Landmark, TrendingUp } from 'lucide-react'
import { formatMoney } from '@/lib/utils'
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

/** 分类色点（高对比度，色相间隔 60°） */
const KIND_COLORS: Record<AccountKind, string> = {
  cash: '#2563eb',        // blue-600  深蓝
  investment: '#16a34a',  // green-600 翠绿
  fund: '#ea580c',        // orange-600 橙
  credit: '#9333ea',      // purple-600 紫
  receivable: '#db2777',  // pink-600 玫红
  payable: '#0ea5e9',     // sky-500  青
  other: '#475569',       // slate-600 深灰
}

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

  const kinds: Array<{ kind: AccountKind; value: number }> = KIND_ORDER.map((k) => ({
    kind: k,
    value: byKind.get(k) || 0,
  })).filter((k) => k.value !== 0)

  const covered = activeAccounts.filter((a) => accountBalanceAtLatest(a, balances, subAccounts) !== 0).length

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <div className="flex flex-col lg:flex-row">
        {/* 左侧：总资产 */}
        <div className="flex-1 p-6 lg:border-r lg:border-border/60">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Landmark className="h-3.5 w-3.5" />
            <span>{month ? `${month} 资产总览` : '总资产 TOTAL ASSETS'}</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-4xl font-bold tabular-nums tracking-tight">
              ¥ {formatMoney(total)}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
              +2.4%
            </span>
            <span>较上月 +¥6,712.33</span>
            <span>· 已录 {covered}/{activeAccounts.length} 个账户</span>
            {latestDate && <span>· 最近盘点 {latestDate}</span>}
          </div>

          {/* 资产配置比例条 */}
          {(() => {
            const positive = kinds.filter((k) => k.value > 0)
            const totalPositive = positive.reduce((s, k) => s + k.value, 0)
            if (totalPositive <= 0) return null
            return (
              <div className="mt-6">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
                  资产配置（正值占比）
                </p>
                <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-muted">
                  {positive.map((k) => {
                    const pct = (k.value / totalPositive) * 100
                    return (
                      <div
                        key={k.kind}
                        className="h-full transition-all"
                        style={{ width: `${pct}%`, background: KIND_COLORS[k.kind] }}
                        title={`${KIND_LABELS[k.kind]} ¥${formatMoney(k.value)} · ${pct.toFixed(1)}%`}
                      />
                    )
                  })}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  {positive.map((k) => {
                    const pct = (k.value / totalPositive) * 100
                    return (
                      <span key={k.kind} className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full"
                          style={{ background: KIND_COLORS[k.kind] }}
                        />
                        {KIND_LABELS[k.kind]} <span className="font-medium text-foreground/80">{pct.toFixed(1)}%</span>
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>

        {/* 右侧：分类四宫格 */}
        {kinds.length > 0 && (
          <div className="grid flex-1 grid-cols-2 divide-x divide-y divide-border/60 border-t border-border/60 lg:border-t-0">
            {kinds.map((k) => (
              <div key={k.kind} className="p-4 transition-colors hover:bg-muted/20">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: KIND_COLORS[k.kind] }}
                  />
                  {KIND_LABELS[k.kind]}
                </div>
                <p className="mt-2 font-serif text-lg font-semibold tabular-nums text-foreground">
                  ¥ {formatMoney(k.value)}
                </p>
              </div>
            ))}
            {/* 补齐四宫格：如果只有 3 个分类，右下角补「其他」或空白占位 */}
            {kinds.length % 2 === 1 && (
              <div className="p-4" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
