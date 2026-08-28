import { useEffect, useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import dayjs from 'dayjs'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { Category, FinanceRecord, RecordType } from '@/types'

interface Props {
  categories: Category[]
  onSubmit: (record: Omit<FinanceRecord, 'id' | 'createdAt'>) => void
  editing?: FinanceRecord | null
  onCancelEdit?: () => void
}

const EXPENSE_TYPES: Array<{ value: RecordType; label: string; color: string }> = [
  { value: 'expense', label: '支出', color: 'data-[state=active]:bg-expense data-[state=active]:text-white' },
  { value: 'income', label: '收入', color: 'data-[state=active]:bg-income data-[state=active]:text-white' },
]

export default function RecordForm({ categories, onSubmit, editing, onCancelEdit }: Props) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<RecordType>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (editing) {
      setOpen(true)
      setType(editing.type)
      setAmount(String(editing.amount))
      setCategoryId(editing.category)
      setDate(editing.date)
      setNote(editing.note ?? '')
    }
  }, [editing])

  const filteredCategories = categories.filter((c) => c.type === type)
  const currentCat = filteredCategories.find((c) => c.id === categoryId)

  const handleTypeChange = (next: RecordType) => {
    setType(next)
    setCategoryId('')
  }

  const reset = () => {
    setType('expense')
    setAmount('')
    setCategoryId('')
    setDate(dayjs().format('YYYY-MM-DD'))
    setNote('')
    setError(null)
  }

  const handleClose = () => {
    setOpen(false)
    reset()
    onCancelEdit?.()
  }

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const num = Number(amount)
    if (!amount || isNaN(num) || num <= 0) {
      setError('请输入大于 0 的金额')
      return
    }
    if (!categoryId) {
      setError('请选择分类')
      return
    }
    if (!date) {
      setError('请选择日期')
      return
    }
    onSubmit({
      type,
      amount: Number(num.toFixed(2)),
      category: categoryId,
      date,
      note: note.trim() || '',
    })
    handleClose()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="default" className="gap-2">
        <Plus className="h-4 w-4" />
        记一笔
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) handleClose()
          else setOpen(true)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editing ? '编辑记录' : '记一笔'}
            </DialogTitle>
            <DialogDescription>记下今天的收支，明天的你会感谢现在的你</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 类型切换 */}
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
              {EXPENSE_TYPES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleTypeChange(opt.value)}
                  data-state={type === opt.value ? 'active' : 'inactive'}
                  className={cn(
                    'rounded-md py-1.5 text-sm font-medium transition-all',
                    'data-[state=inactive]:text-muted-foreground hover:text-foreground',
                    opt.color,
                    type === opt.value && opt.value === 'expense' && 'bg-expense text-white shadow',
                    type === opt.value && opt.value === 'income' && 'bg-income text-white shadow',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* 金额 */}
            <div className="space-y-1.5">
              <Label htmlFor="amount">金额</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  ¥
                </span>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value)
                    setError(null)
                  }}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="pl-7 text-base tabular-nums"
                />
              </div>
            </div>

            {/* 分类 */}
            <div className="space-y-1.5">
              <Label>分类</Label>
              <Select
                value={categoryId}
                onValueChange={(v) => {
                  setCategoryId(v)
                  setError(null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择分类">
                    {currentCat && (
                      <span className="flex items-center gap-2">
                        <span>{currentCat.icon}</span>
                        <span>{currentCat.name}</span>
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span>{c.icon}</span>
                        <span>{c.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 日期 */}
            <div className="space-y-1.5">
              <Label htmlFor="date">日期</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={dayjs().format('YYYY-MM-DD')}
              />
            </div>

            {/* 备注 */}
            <div className="space-y-1.5">
              <Label htmlFor="note">
                备注 <span className="text-xs text-muted-foreground">（可选）</span>
              </Label>
              <Input
                id="note"
                placeholder="比如：午餐、和朋友吃饭"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={50}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button type="submit">保存</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
