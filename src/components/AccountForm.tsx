import { useEffect, useState } from 'react'
import { Landmark, Pencil } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import type { Account, AccountKind } from '@/types'

interface Props {
  open: boolean
  account: Account | null // null = 新增
  onClose: () => void
  onSubmit: (data: {
    name: string
    kind: AccountKind
    icon: string
    color: string
    note?: string
    archived?: boolean
  }) => void
}

const KIND_OPTIONS: Array<{ value: AccountKind; label: string; desc: string }> = [
  { value: 'cash', label: '货币资金', desc: '支付宝 / 微信 / 银行卡 / 余额宝' },
  { value: 'investment', label: '投资账户', desc: '同花顺 / 证券 / 股票 / 虚拟币' },
  { value: 'fund', label: '基金理财', desc: '基金 / 理财 / 定存 / 养老金' },
  { value: 'credit', label: '信用账户', desc: '信用卡 / 花呗 / 借呗 / 京东白条' },
  { value: 'receivable', label: '应收', desc: '押金 / 保证金 / 借出 / 别人欠你' },
  { value: 'payable', label: '应付', desc: '贷款 / 你欠别人 / 待还' },
  { value: 'other', label: '其他', desc: '公积金 / 社保 / 其它' },
]

const ICON_OPTIONS = [
  // 通用
  '💳', '📱', '🏦', '📈', '🪙', '💼', '💰', '🏠', '🎯', '🧧', '📒', '🔮', '🟢', '🟠', '🟡',
  // 常见平台
  '💬', // 微信
  '☁️', // 云闪付
  '🏛️', // 公积金 / 政府
  '🪪', // 信用卡
  '🔒', // 押金 / 保证金
  '⚠️', // 欠款 / 负债
  '📉', // 负债 / 亏损
  '🧾', // 账单
  '🗂️', // 存单
  '⛓️', // 虚拟币
  '🎁', // 红包
  '✈️', // 出行
]

const COLOR_OPTIONS = [
  '#1677ff', '#f97316', '#10b981', '#dc2626', '#8b5cf6',
  '#ec4899', '#06b6d4', '#eab308', '#64748b', '#22c55e',
  '#0ea5e9', '#f43f5e', '#a3a3a3',
]

export default function AccountForm({ open, account, onClose, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<AccountKind>('cash')
  const [icon, setIcon] = useState('💳')
  const [color, setColor] = useState('#1677ff')
  const [note, setNote] = useState('')
  const [archived, setArchived] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(account?.name ?? '')
      setKind(account?.kind ?? 'cash')
      setIcon(account?.icon ?? '💳')
      setColor(account?.color ?? '#1677ff')
      setNote(account?.note ?? '')
      setArchived(account?.archived ?? false)
      setError(null)
    }
  }, [open, account])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!name.trim()) {
      setError('请输入账户名称')
      return
    }
    onSubmit({ name: name.trim(), kind, icon, color, note: note.trim() || '', archived })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {account ? <Pencil className="h-4 w-4" /> : <Landmark className="h-4 w-4" />}
            {account ? '编辑账户' : '新增账户'}
          </DialogTitle>
          <DialogDescription>比如支付宝、京东金融、同花顺，之后按这些项目录入每月余额</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="acc-name">账户名称</Label>
            <Input
              id="acc-name"
              placeholder="例如：支付宝 / 京东金融 / 同花顺"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              maxLength={20}
            />
          </div>

          <div className="space-y-1.5">
            <Label>类型</Label>
            <div className="grid grid-cols-2 gap-2">
              {KIND_OPTIONS.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => setKind(k.value)}
                  className={cn(
                    'rounded-md border p-2 text-left text-sm transition-colors',
                    kind === k.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  <span className="font-medium">{k.label}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {k.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>图标</Label>
            <div className="flex flex-wrap gap-1.5">
              {ICON_OPTIONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-md border text-lg transition-colors',
                    icon === ic
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>颜色</Label>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-8 w-8 rounded-full ring-offset-2 transition-all',
                    color === c && 'ring-2 ring-primary',
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="acc-note">
              备注 <span className="text-xs text-muted-foreground">（可选）</span>
            </Label>
            <Input
              id="acc-note"
              placeholder="比如：证券账户 / 余额宝"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={30}
            />
          </div>

          {account && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={archived}
                onChange={(e) => setArchived(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              停用该账户（保留历史余额，不再出现在列表）
            </label>
          )}

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
