import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Calendar, Database, Download, FileText, Moon, Sun, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { FinanceRecord } from '@/types'
import { useTheme } from '@/hooks/useTheme'
import { useAppData } from '@/context/DataContext'
import RecordForm from './RecordForm'

interface Props {
  month: string
  onMonthChange: (m: string) => void
  /** 收支记账视图时显示「记一笔」按钮 */
  showRecordForm: boolean
  /** 当前正在编辑的记录（编辑态复用录入表单） */
  editing: FinanceRecord | null
  onCancelEdit: () => void
}

/** 顶部导航：Logo + 月份选择 + 打印导出 + 主题切换 + 记一笔 */
export default function AppHeader({
  month,
  onMonthChange,
  showRecordForm,
  editing,
  onCancelEdit,
}: Props) {
  const { categories, apiOnline, addRecord, updateRecord } = useAppData()
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const [theme, toggleTheme] = useTheme()

  // 月份选择：最近 24 个月
  const monthOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string }> = []
    for (let i = 0; i < 24; i++) {
      const m = dayjs().subtract(i, 'month')
      opts.push({ value: m.format('YYYY-MM'), label: m.format('YYYY年MM月') })
    }
    return opts
  }, [])

  const handleSubmit = (r: Omit<FinanceRecord, 'id' | 'createdAt'>) => {
    if (editing) {
      updateRecord(editing.id, r)
      onCancelEdit()
    } else {
      addRecord(r)
    }
  }

  const handlePrintFull = () => {
    document.body.removeAttribute('data-print-mode')
    // 给浏览器一点时间应用样式
    requestAnimationFrame(() => window.print())
  }

  const handlePrintMonth = () => {
    document.body.setAttribute('data-print-mode', 'month')
    requestAnimationFrame(() => window.print())
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">个人记账</h1>
            <p className="text-xs leading-tight text-muted-foreground flex items-center gap-1">
              <Database className="h-3 w-3" />
              SQLite 本地存储
              <span
                className={cn(
                  'ml-1 inline-block h-1.5 w-1.5 rounded-full',
                  apiOnline ? 'bg-emerald-500' : 'bg-rose-500',
                )}
                title={apiOnline ? '后端在线' : '后端离线'}
              />
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 月份选择器 */}
          <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {dayjs(month).format('YYYY年MM月')}
                </span>
                <span className="sm:hidden">{dayjs(month).format('YYYY-MM')}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1" align="end">
              <div className="max-h-72 overflow-y-auto">
                {monthOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onMonthChange(opt.value)
                      setMonthPickerOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-sm px-3 py-1.5 text-sm transition-colors',
                      opt.value === month
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'hover:bg-muted',
                    )}
                  >
                    <span>{opt.label}</span>
                    {opt.value === dayjs().format('YYYY-MM') && (
                      <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                        本月
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* 月度明细 PDF（按当前选中月份） */}
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrintMonth}
            title={`打印 ${dayjs(month).format('YYYY年MM月')} 账户余额明细`}
          >
            <FileText className="h-4 w-4" />
          </Button>

          {/* 整页 PDF（账户余额全览 / 收支记账全页） */}
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrintFull}
            title="导出当前页面为 PDF"
          >
            <Download className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            title={theme === 'dark' ? '切换到浅色模式' : '切换到暗色模式'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {showRecordForm && (
            <RecordForm
              categories={categories}
              onSubmit={handleSubmit}
              editing={editing}
              onCancelEdit={onCancelEdit}
            />
          )}
        </div>
      </div>
    </header>
  )
}
