import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { Plus, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, formatMoney } from '@/lib/utils'
import { signedAmount } from '@/utils/assets'
import type { Account, AccountKind, BalanceSnapshot, SubAccount } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Props {
  open: boolean
  account: Account | null
  subAccounts: SubAccount[]
  defaultSubAccountId?: string
  balances: BalanceSnapshot[]
  onSubmit: (data: {
    accountId: string
    subAccountId?: string
    amount: number
    date: string
    note?: string
  }) => void
  onClose: () => void
}

export default function BalanceForm({
  open,
  account,
  subAccounts,
  defaultSubAccountId,
  balances,
  onSubmit,
  onClose,
}: Props) {
  const [lines, setLines] = useState<Array<{ id: string; value: string }>>([{ id: 'l-1', value: '' }])
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [note, setNote] = useState('')
  const [subId, setSubId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // 选中的归属账户类型（payable/credit 视为负债，输入正数但存为负）
  const effectiveKind: AccountKind | undefined = (() => {
    if (!account) return undefined
    if (subId) return account.kind
    return account.kind
  })()

  const enabledSubs = account
    ? subAccounts
        .filter((s) => s.accountId === account.id && s.enabled)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : []

  // 多行金额合计（忽略空行）
  const total = lines.reduce((sum, l) => {
    if (l.value.trim() === '') return sum
    const n = Number(l.value)
    return !isNaN(n) && n > 0 ? sum + n : sum
  }, 0)

  const addLine = () =>
    setLines((prev) => [...prev, { id: `l-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, value: '' }])

  const removeLine = (id: string) =>
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)))

  const setLineValue = (id: string, value: string) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, value } : l)))

  // 打开时重置并预填上期余额
  useEffect(() => {
    if (open && account) {
      const targetId = defaultSubAccountId || ''
      const scope = targetId
        ? balances.filter((b) => b.subAccountId === targetId)
        : balances.filter((b) => b.accountId === account.id && !b.subAccountId)

      // 若未指定子账户但有启用子账户，默认选第一个
      const effectiveSubId = !targetId && enabledSubs.length > 0 ? enabledSubs[0].id : targetId
      setSubId(effectiveSubId)

      const history = scope
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : -1))
      const last = history[0]
      setLines([{ id: 'l-1', value: last ? String(last.amount) : '' }])
      setDate(dayjs().format('YYYY-MM-DD'))
      setNote('')
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, account, defaultSubAccountId])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!account) return
    // 支持正数 / 负数 / 0（应付 / 欠款场景，0 余额也允许记录）
    const validLines = lines.filter((l) => {
      const v = l.value.trim()
      if (v === '') return false
      return !isNaN(Number(v))
    })
    if (validLines.length === 0) {
      setError('请输入有效金额（可填正数、负数或 0）')
      return
    }
    if (!date) {
      setError('请选择日期')
      return
    }
    onSubmit({
      accountId: account.id,
      subAccountId: subId || undefined,
      amount: signedAmount(Number(total.toFixed(2)), effectiveKind),
      date,
      note: note.trim() || '',
    })
    onClose()
  }

  const targetSub = subId ? enabledSubs.find((s) => s.id === subId) : null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            记录余额{account ? ` · ${account.icon} ${account.name}` : ''}
          </DialogTitle>
          <DialogDescription>录入该账户（或小项目）当下的余额，历史快照都会保留</DialogDescription>
        </DialogHeader>

        {/* 负债类提示：输入正数，自动存为负 */}
        {account && (account.kind === 'payable' || account.kind === 'credit') && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            账户类型为「{account.kind === 'payable' ? '应付' : '信用'}」——请直接输入<span className="font-semibold">正数</span>（如 500），系统会自动保存为负数（-500），表示你欠/已用。
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {enabledSubs.length > 0 && (
            <div className="space-y-1.5">
              <Label>归属小项目</Label>
              <Select value={subId} onValueChange={setSubId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择小项目" />
                </SelectTrigger>
                <SelectContent>
                  {enabledSubs.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        <span>{s.icon}</span>
                        <span>{s.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {targetSub
                  ? `余额将记到「${targetSub.name}」名下`
                  : '账户开启了小项目，余额需归属到具体小项目'}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>余额（支持多笔相加）</Label>
            <div className="space-y-1.5">
              {lines.map((l, idx) => (
                <div key={l.id} className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      ¥
                    </span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={effectiveKind === 'payable' || effectiveKind === 'credit' ? 0 : undefined}
                      placeholder={idx === 0 ? '0.00' : '加一笔…'}
                      value={l.value}
                      onChange={(e) => {
                        setLineValue(l.id, e.target.value)
                        setError(null)
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={(e) => {
                        if (
                          (effectiveKind === 'payable' || effectiveKind === 'credit') &&
                          e.key === '-'
                        ) {
                          e.preventDefault()
                        }
                      }}
                      className="pl-7 text-base tabular-nums"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(l.id)}
                    disabled={lines.length <= 1}
                    className={cn(
                      'shrink-0 rounded-md border border-border px-2.5 py-2 text-xs text-muted-foreground transition-colors',
                      lines.length <= 1
                        ? 'cursor-not-allowed opacity-40'
                        : 'hover:border-destructive/50 hover:text-destructive',
                    )}
                    title={lines.length <= 1 ? '至少保留一项' : '删除这一项'}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1 text-xs font-medium text-primary transition-opacity hover:opacity-80"
              >
                <Plus className="h-3.5 w-3.5" />
                添加一项
              </button>
              {lines.length > 1 && (
                <span className="text-sm">
                  合计{' '}
                  <span className="font-semibold tabular-nums text-primary">
                    ¥ {formatMoney(total)}
                  </span>
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="balance-date">日期</Label>
            <Input
              id="balance-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={dayjs().format('YYYY-MM-DD')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="balance-note">
              备注 <span className="text-xs text-muted-foreground">（可选）</span>
            </Label>
            <Input
              id="balance-note"
              placeholder="比如：月底盘点 / 工资到账"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={50}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit">保存</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
