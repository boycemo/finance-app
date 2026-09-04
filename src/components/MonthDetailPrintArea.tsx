import { useMemo } from 'react'
import dayjs from 'dayjs'
import { cn, formatMoney } from '@/lib/utils'
import { accountMonthlyBalance } from '@/utils/assets'
import { useAppData } from '@/context/DataContext'
import { KIND_LABELS } from './AssetOverview'

interface Props {
  month: string
}

/**
 * 月度明细打印区（屏幕上隐藏，仅 body[data-print-mode='month'] 打印时显示）。
 * 内容：选中月份的总余额、上月余额、环比变化（金额+百分率）、各账户明细表。
 */
export default function MonthDetailPrintArea({ month }: Props) {
  const { accounts, balances, subAccounts } = useAppData()

  const monthDetail = useMemo(() => {
    const prevMonth = dayjs(`${month}-01`).subtract(1, 'month').format('YYYY-MM')
    const activeAccounts = accounts.filter((a) => !a.archived)
    const rows = activeAccounts
      .map((acc) => {
        const amount = accountMonthlyBalance(acc, balances, subAccounts, month)
        const prevAmount = accountMonthlyBalance(acc, balances, subAccounts, prevMonth)
        return {
          accountId: acc.id,
          name: acc.name,
          icon: acc.icon,
          kindLabel: KIND_LABELS[acc.kind] ?? acc.kind,
          amount,
          prevAmount,
          change: amount - prevAmount,
        }
      })
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    const prevTotal = activeAccounts.reduce(
      (s, acc) => s + accountMonthlyBalance(acc, balances, subAccounts, prevMonth),
      0,
    )
    const currentTotal = rows.reduce((s, r) => s + r.amount, 0)
    const diff = currentTotal - prevTotal
    const diffPct = prevTotal === 0 ? null : (diff / Math.abs(prevTotal)) * 100
    return {
      curMonthLabel: dayjs(`${month}-01`).format('YYYY年MM月'),
      prevMonthLabel: dayjs(`${prevMonth}-01`).format('YYYY年MM月'),
      currentTotal,
      prevTotal,
      diff,
      diffPct,
      rows,
    }
  }, [accounts, balances, subAccounts, month])

  return (
    <div id="month-detail-print-area" className="hidden">
      <h1 className="text-center text-2xl font-bold">
        个人记账 · 账户余额月度明细
      </h1>
      <p className="mt-2 text-center text-lg">{monthDetail.curMonthLabel}</p>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        生成时间：{dayjs().format('YYYY-MM-DD HH:mm')}
      </p>

      {/* 汇总卡 */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border p-4 text-center">
          <p className="text-xs text-muted-foreground">本月总余额</p>
          <p
            className={cn(
              'mt-1 text-xl font-bold tabular-nums',
              monthDetail.currentTotal >= 0 ? 'text-emerald-600' : 'text-rose-600',
            )}
          >
            ¥ {formatMoney(monthDetail.currentTotal)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {monthDetail.curMonthLabel} 期末
          </p>
        </div>
        <div className="rounded-lg border border-border p-4 text-center">
          <p className="text-xs text-muted-foreground">上月总余额</p>
          <p className="mt-1 text-xl font-bold tabular-nums">
            ¥ {formatMoney(monthDetail.prevTotal)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {monthDetail.prevMonthLabel} 期末
          </p>
        </div>
        <div className="rounded-lg border border-border p-4 text-center">
          <p className="text-xs text-muted-foreground">环比变化</p>
          <p
            className={cn(
              'mt-1 text-xl font-bold tabular-nums',
              monthDetail.diff > 0
                ? 'text-emerald-600'
                : monthDetail.diff < 0
                  ? 'text-rose-600'
                  : 'text-muted-foreground',
            )}
          >
            {monthDetail.diff > 0 ? '+' : ''}¥ {formatMoney(Math.abs(monthDetail.diff))}
          </p>
          <p
            className={cn(
              'mt-1 text-xs tabular-nums',
              monthDetail.diff > 0
                ? 'text-emerald-600'
                : monthDetail.diff < 0
                  ? 'text-rose-600'
                  : 'text-muted-foreground',
            )}
          >
            {monthDetail.diffPct === null
              ? '— 无上月数据'
              : (monthDetail.diff > 0 ? '↑ +' : monthDetail.diff < 0 ? '↓ ' : '') +
                monthDetail.diffPct.toFixed(2) +
                '% 较上月'}
          </p>
        </div>
      </div>

      {/* 明细表 */}
      <h2 className="mt-6 text-sm font-semibold">各账户余额明细</h2>
      <table className="mt-2 w-full border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '22%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '18%' }} />
        </colgroup>
        <thead>
          <tr className="bg-foreground text-background">
            <th className="border border-border px-3 py-2 text-left font-medium">账户</th>
            <th className="border border-border px-3 py-2 text-left font-medium">类型</th>
            <th className="border border-border px-3 py-2 text-right font-medium">
              上月余额
            </th>
            <th className="border border-border px-3 py-2 text-right font-medium">
              本月余额
            </th>
            <th className="border border-border px-3 py-2 text-right font-medium">
              变化金额
            </th>
          </tr>
        </thead>
        <tbody>
          {monthDetail.rows.map((r, i) => (
            <tr
              key={r.accountId}
              className={cn(i % 2 === 0 ? 'bg-muted/30' : 'bg-background')}
            >
              <td className="border border-border px-3 py-2">
                <span className="mr-1">{r.icon}</span>
                {r.name}
              </td>
              <td className="border border-border px-3 py-2 text-muted-foreground">
                {r.kindLabel}
              </td>
              <td className="border border-border px-3 py-2 text-right tabular-nums">
                {formatMoney(r.prevAmount)}
              </td>
              <td
                className={cn(
                  'border border-border px-3 py-2 text-right tabular-nums',
                  r.amount < 0 && 'text-rose-600',
                )}
              >
                {formatMoney(r.amount)}
              </td>
              <td
                className={cn(
                  'border border-border px-3 py-2 text-right tabular-nums',
                  r.change > 0 && 'text-emerald-600',
                  r.change < 0 && 'text-rose-600',
                  r.change === 0 && 'text-muted-foreground/50',
                )}
              >
                {r.change === 0
                  ? '—'
                  : (r.change > 0 ? '+' : '') + formatMoney(r.change)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-muted/50 font-semibold">
            <td className="border border-border px-3 py-2" colSpan={2}>
              本月合计
            </td>
            <td className="border border-border px-3 py-2 text-right tabular-nums">
              ¥ {formatMoney(monthDetail.prevTotal)}
            </td>
            <td
              className={cn(
                'border border-border px-3 py-2 text-right tabular-nums',
                monthDetail.currentTotal < 0 && 'text-rose-600',
              )}
            >
              ¥ {formatMoney(monthDetail.currentTotal)}
            </td>
            <td
              className={cn(
                'border border-border px-3 py-2 text-right tabular-nums',
                monthDetail.diff > 0 && 'text-emerald-600',
                monthDetail.diff < 0 && 'text-rose-600',
              )}
            >
              {monthDetail.diff > 0 ? '+' : ''}¥ {formatMoney(Math.abs(monthDetail.diff))}
            </td>
          </tr>
        </tfoot>
      </table>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        数据来源：本地 SQLite（{dayjs(month).format('YYYY-MM')} 期末快照）
      </p>
    </div>
  )
}
