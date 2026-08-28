import { useEffect, useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
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

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
}

const CLEAR_PASSWORD = 'moraoming'

export default function ClearDataDialog({ open, onClose, onConfirm }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setPassword('')
      setError(null)
      setBusy(false)
    }
  }, [open])

  const handleConfirm = async () => {
    if (password !== CLEAR_PASSWORD) {
      setError('密码错误，请重新输入')
      return
    }
    setBusy(true)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(`清空失败：${String(err)}`)
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            清空数据
          </DialogTitle>
          <DialogDescription>
            将删除所有<strong>收支记录</strong>和<strong>余额快照</strong>。账户、小项目、分类等元数据会保留。此操作不可恢复。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="clear-password">输入密码确认</Label>
          <Input
            id="clear-password"
            type="password"
            placeholder="输入清空密码"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleConfirm()
              }
            }}
            autoFocus
          />
          {error && (
            <p className={cn('text-sm', error.startsWith('清空失败') ? 'text-muted-foreground' : 'text-destructive')}>
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            取消
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={busy}
            className="gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            {busy ? '清空中…' : '确认清空'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
