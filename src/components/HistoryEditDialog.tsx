import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { Pencil, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { cn, formatMoney } from '@/lib/utils'
import type { Account, AccountKind, BalanceSnapshot, SubAccount } from '@/types'
import { signedAmount } from '@/utils/assets'

interface Props {
  open: boolean
  account: Account | null
  editing: BalanceSnapshot | null
  subAccounts: SubAccount[]
  onClose: () => void
  onSubmit: (id: string, data: { amount: number; date: string; note?: string }) => Promise<void> | void
}

export default function HistoryEditDialog({
  open,
  account,
  editing,
  subAccounts,
  onClose,
  onSubmit,
}: Props) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sub = editing?.subAccountId
    ? subAccounts.find((s) => s.id === editing.subAccountId) ?? null
    : null
  // 父账户的 kind 决定正负（子账户沿用）
  const kind: AccountKind | undefined = account?.kind

  useEffect(() => {
    if (open && editing) {
      // 存的是符号化值，预填时按类型还原成"用户视角"的数
      const abs = Math.abs(editing.amount)
      setAmount(String(abs))
      setDate(editing.date)
      setNote(editing.note ?? '')
      setError(null)
    }
  }, [open, editing])

  const handleSave = async () => {
    if (!editing) return
    const num = Number(amount)
    if (amount === '' || isNaN(num)) {
      setError('请输入有效金额（可填正数、负数或 0）')
      return
    }
    if (!date) {
      setError('请选择日期')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSubmit(editing.id, {
        amount: signedAmount(num, kind),
        date,
        note: note.trim() || '',
      })
      onClose()
    } catch (err) {
      setError(`保存失败：${String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const isDebt = kind === 'payable' || kind === 'credit'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            编辑余额
          </DialogTitle>
          <DialogDescription>
            修改此条记录（{account ? `${account.icon} ${account.name}` : ''}
            {sub ? ` · ${sub.icon} ${sub.name}` : ''}）
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {isDebt && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              账户类型为「{kind === 'payable' ? '应付' : '信用'}」——请直接输入正数，系统自动保存为负数。
            </div>
          )}

          <div className="space-y-1.5">
            <Label>金额</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                ¥
              </span>
              <Input
                type="number"
                inputMode="decimal"
                min={isDebt ? 0 : undefined}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  setError(null)
                }}
                onWheel={(e) => e.currentTarget.blur()}
                onKeyDown={(e) => {
                  if (isDebt && e.key === '-') e.preventDefault()
                }}
                className="pl-7 text-base tabular-nums"
              />
            </div>
            {isDebt && (
              <p className="text-[11px] text-muted-foreground">
                预览：¥ {formatMoney(-Math.abs(Number(amount) || 0))}（自动取负）
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>日期</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={dayjs().format('YYYY-MM-DD')}
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              备注 <span className="text-xs text-muted-foreground">（可选）</span>
            </Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder=""
              maxLength={50}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={busy} className="gap-1.5">
            <Save className="h-4 w-4" />
            {busy ? '保存中…' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
