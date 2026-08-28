import { useEffect, useState } from 'react'
import { Layers, Pencil } from 'lucide-react'
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
import type { Account, SubAccount } from '@/types'

interface Props {
  open: boolean
  account: Account | null
  subAccount: SubAccount | null // null = 新增
  onClose: () => void
  onSubmit: (data: { name: string; icon: string; color: string; note?: string }) => void
}

const ICON_OPTIONS = [
  // 通用
  '💰', '🟠', '🟡', '🏦', '🧾', '📊', '📈', '🪙', '💳', '📒', '🎯', '🧧', '📱', '🔮',
  // 常见平台/账户
  '💬', // 微信
  '☁️', // 云闪付
  '🏛️', // 公积金
  '🪪', // 信用卡
  '🔒', // 押金 / 保证金
  '⚠️', // 欠款 / 负债
  '📉', // 负债 / 亏损
  '🟢', // 零钱
  '🗂️', // 存单
]

const COLOR_OPTIONS = [
  '#1677ff', '#f97316', '#10b981', '#dc2626', '#8b5cf6',
  '#ec4899', '#06b6d4', '#eab308', '#64748b', '#22c55e',
]

export default function SubAccountForm({ open, account, subAccount, onClose, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('💰')
  const [color, setColor] = useState('#1677ff')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(subAccount?.name ?? '')
      setIcon(subAccount?.icon ?? '💰')
      setColor(subAccount?.color ?? '#1677ff')
      setNote(subAccount?.note ?? '')
      setError(null)
    }
  }, [open, subAccount])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!name.trim()) {
      setError('请输入小项目名称')
      return
    }
    onSubmit({ name: name.trim(), icon, color, note: note.trim() || '' })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {subAccount ? <Pencil className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
            {subAccount ? '编辑小项目' : `添加小项目${account ? ` · ${account.icon} ${account.name}` : ''}`}
          </DialogTitle>
          <DialogDescription>
            小项目独立记余额（如余额宝 / 股票 / 基金），可随时停用
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sub-name">名称</Label>
            <Input
              id="sub-name"
              placeholder="例如：余额宝 / 股票 / 货币基金"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              maxLength={20}
            />
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
            <Label htmlFor="sub-note">
              备注 <span className="text-xs text-muted-foreground">（可选）</span>
            </Label>
            <Input
              id="sub-note"
              placeholder="比如：货币基金 / 股票市值"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={30}
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
