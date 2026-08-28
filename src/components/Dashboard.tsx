import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
  AlertTriangle,
  Calendar,
  Database,
  Download,
  Eye,
  Landmark,
  Loader2,
  Moon,
  NotebookPen,
  Sun,
  Trash2,
  Upload,
  Wallet,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn, formatMoney } from '@/lib/utils'
import type { Account, AccountKind, BalanceSnapshot, Category, FinanceRecord, SubAccount } from '@/types'
import { accountMonthlyBalance } from '@/utils/assets'

// 弹窗预览用：单月报表的所有展示数据
interface ReportPreviewData {
  currentTotal: number
  prevTotal: number
  diff: number
  diffPctText: string
  curMonthNum: number
  prevMonthNum: number
  rows: Array<{
    accountId: string
    name: string
    icon: string
    kindLabel: string
    amount: number
    prevAmount: number
    change: number
  }>
}
import { filterByMonth, lastNMonthsTrend, summarizeMonth } from '@/utils/date'
import { api } from '@/utils/api'
import { useTheme } from '@/hooks/useTheme'
import StatCards from './StatCards'
import { KIND_LABELS } from './AssetOverview'
import TrendChart from './TrendChart'
import MonthOverview from './MonthOverview'
import RecordList from './RecordList'
import RecordForm from './RecordForm'
import AssetsView from './AssetsView'
import ClearDataDialog from './ClearDataDialog'

interface Props {
  records: FinanceRecord[]
  categories: Category[]
  loading?: boolean
  error?: string | null
  apiOnline?: boolean
  onAdd: (r: Omit<FinanceRecord, 'id' | 'createdAt'>) => void
  onUpdate: (id: string, patch: Partial<FinanceRecord>) => void
  onDelete: (id: string) => void
  onReload?: () => void
  accounts: Account[]
  subAccounts: SubAccount[]
  balances: BalanceSnapshot[]
  assetsLoading?: boolean
  assetsError?: string | null
  onAddAccount: (data: {
    name: string
    kind: AccountKind
    icon: string
    color: string
    note?: string
  }) => Promise<Account> | Account
  onUpdateAccount: (id: string, patch: Partial<Account>) => void
  onDeleteAccount: (id: string) => void
  onAddSubAccount: (data: {
    accountId: string
    name: string
    icon: string
    color: string
    note?: string
  }) => void
  onUpdateSubAccount: (id: string, patch: Partial<SubAccount>) => void
  onDeleteSubAccount: (id: string) => void
  onReorderAccounts: (orderedIds: string[]) => void
  onAddBalance: (data: {
    accountId: string
    subAccountId?: string
    amount: number
    date: string
    note?: string
  }) => void
  onDeleteBalance: (id: string) => void
  onUpdateBalance: (id: string, data: { amount: number; date: string; note?: string }) => Promise<void> | void
  onBatchDeleteBalances: (ids: string[]) => void
  onBatchDeleteByDate: (dates: string[]) => Promise<void> | void
  onBatchAddBalances: (items: Array<{
    accountId: string
    subAccountId?: string
    amount: number
    date: string
    note?: string
  }>) => Promise<void>
  onClearAll: () => Promise<void> | void
  onExportBackup: () => Promise<void>
  onImportBackup: (file: File) => Promise<void>
}

export default function Dashboard({
  records,
  categories,
  loading = false,
  error = null,
  apiOnline = true,
  onAdd,
  onUpdate,
  onDelete,
  onReload,
  accounts,
  subAccounts,
  balances,
  assetsLoading = false,
  assetsError = null,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  onAddSubAccount,
  onUpdateSubAccount,
  onDeleteSubAccount,
  onReorderAccounts,
  onAddBalance,
  onDeleteBalance,
  onUpdateBalance,
  onBatchDeleteBalances,
  onBatchDeleteByDate,
  onBatchAddBalances,
  onClearAll,
  onExportBackup,
  onImportBackup,
}: Props) {
  const [view, setView] = useState<'records' | 'assets'>('assets')
  const [month, setMonth] = useState<string>(dayjs().format('YYYY-MM'))
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const [editing, setEditing] = useState<FinanceRecord | null>(null)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  // 弹窗内 HTML 预览数据（避免 PDF viewer 渲染问题）
  const [reportPreview, setReportPreview] = useState<ReportPreviewData | null>(null)
  const [theme, toggleTheme] = useTheme()
  const [clearOpen, setClearOpen] = useState(false)

  // 计算当月汇总
  const monthSummary = useMemo(() => summarizeMonth(records, month), [records, month])
  const monthRecords = useMemo(() => filterByMonth(records, month), [records, month])
  // 12 个月趋势
  const trend = useMemo(() => lastNMonthsTrend(records, 12), [records])

  const handleEdit = (r: FinanceRecord) => setEditing(r)
  const handleCancelEdit = () => setEditing(null)

  const handleSubmit = (r: Omit<FinanceRecord, 'id' | 'createdAt'>) => {
    if (editing) {
      onUpdate(editing.id, r)
      setEditing(null)
    } else {
      onAdd(r)
    }
  }

  // 月份选择：最近 24 个月
  const monthOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string }> = []
    for (let i = 0; i < 24; i++) {
      const m = dayjs().subtract(i, 'month')
      opts.push({ value: m.format('YYYY-MM'), label: m.format('YYYY年MM月') })
    }
    return opts
  }, [])

  const handleExportPDF = async () => {
    // 打开预览弹窗
    setPdfPreviewOpen(true)
    setPdfPreviewUrl(null)
    setReportPreview(null)
    try {
      // 1) fetch PDF → blob URL（用于"下载"按钮）
      const url = `${api.base}/api/pdf/monthly?month=${encodeURIComponent(month)}&t=${Date.now()}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      setPdfPreviewUrl(blobUrl)

      // 2) 用前端逻辑算预览数据（绕过 PDF viewer 的渲染问题）
      const prevMonth = dayjs(`${month}-01`).subtract(1, 'month').format('YYYY-MM')
      const activeAccounts = accounts.filter((a) => !a.archived)
      const rows = activeAccounts.map((acc) => {
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
      const prevTotal = activeAccounts.reduce(
        (s, acc) => s + accountMonthlyBalance(acc, balances, subAccounts, prevMonth),
        0,
      )
      const currentTotal = rows.reduce((s, r) => s + r.amount, 0)
      const diff = currentTotal - prevTotal
      const diffPct = prevTotal === 0 ? null : (diff / Math.abs(prevTotal)) * 100
      const diffPctText =
        diffPct === null
          ? '— 较上月'
          : (diff > 0 ? '↑ +' : diff < 0 ? '↓ ' : '') + diffPct.toFixed(1) + '% 较上月'
      setReportPreview({
        currentTotal,
        prevTotal,
        diff,
        diffPctText,
        curMonthNum: parseInt(month.split('-')[1], 10),
        prevMonthNum: parseInt(prevMonth.split('-')[1], 10),
        rows,
      })
    } catch (err) {
      alert(`预览失败：${String(err)}`)
      setPdfPreviewOpen(false)
    }
  }

  const closePdfPreview = () => {
    setPdfPreviewOpen(false)
    if (pdfPreviewUrl && pdfPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(pdfPreviewUrl)
    }
    setPdfPreviewUrl(null)
  }

  // "下载 PDF"按钮：直接打开后端 PDF 端点
  // 浏览器会弹"下载文件"提示，保存即可
  // PDF 内容排版 = 后端 pdfkit 生成（4 列与 HTML 预览一致）
  const downloadPdfFile = () => {
    const url = `${api.base}/api/pdf/monthly?month=${encodeURIComponent(month)}&t=${Date.now()}`
    // 直接触发下载（不开新窗口，避免 PDF viewer 渲染）
    const a = document.createElement('a')
    a.href = url
    a.download = `monthly-report-${month}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    // 下载后自动关弹窗
    setTimeout(() => {
      setPdfPreviewOpen(false)
    }, 800)
  }

  const cancelPreview = () => {
    setPdfPreviewOpen(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      {/* Header */}
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
                        setMonth(opt.value)
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

            <Button
              variant="outline"
              size="icon"
              onClick={handleExportPDF}
              title={`导出 ${dayjs(month).format('YYYY年MM月')} 账户余额月度报表 PDF`}
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

            {view === 'records' && (
              <RecordForm
                categories={categories}
                onSubmit={handleSubmit}
                editing={editing}
                onCancelEdit={handleCancelEdit}
              />
            )}
          </div>
        </div>
      </header>

      {/* Tab 切换 */}
      <div className="sticky top-16 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl gap-1 px-4 pt-2 sm:px-6">
          <button
            onClick={() => setView('assets')}
            className={cn(
              'flex items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              view === 'assets'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Landmark className="h-4 w-4" />
            账户余额
          </button>
          <button
            onClick={() => setView('records')}
            className={cn(
              'flex items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              view === 'records'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <NotebookPen className="h-4 w-4" />
            收支记账
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {/* 错误条 */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">后端连不上</p>
              <p className="mt-1 text-xs text-rose-600/90">{error}</p>
              <p className="mt-1 text-xs text-rose-600/90">
                在 <code className="rounded bg-rose-100 px-1">server/</code> 目录跑 <code className="rounded bg-rose-100 px-1">npm run dev</code> 启动后端。
              </p>
            </div>
            {onReload && (
              <Button variant="outline" size="sm" onClick={onReload} className="shrink-0">
                重试
              </Button>
            )}
          </div>
        )}

        {/* 加载遮罩 */}
        {loading && (
          <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在加载数据…
          </div>
        )}

        {view === 'assets' ? (
          <AssetsView
            accounts={accounts}
            subAccounts={subAccounts}
            balances={balances}
            loading={assetsLoading}
            error={assetsError}
            onAddAccount={onAddAccount}
            onUpdateAccount={onUpdateAccount}
            onDeleteAccount={onDeleteAccount}
            onAddSubAccount={onAddSubAccount}
            onUpdateSubAccount={onUpdateSubAccount}
            onDeleteSubAccount={onDeleteSubAccount}
            onReorderAccounts={onReorderAccounts}
            onAddBalance={onAddBalance}
            onDeleteBalance={onDeleteBalance}
            onUpdateBalance={onUpdateBalance}
            onBatchDeleteBalances={onBatchDeleteBalances}
            onBatchDeleteByDate={onBatchDeleteByDate}
            onBatchAddBalances={onBatchAddBalances}
          />
        ) : (
        <>
        {/* 概览区 */}
        <section className="space-y-4">
          <StatCards
            income={monthSummary.income}
            expense={monthSummary.expense}
            balance={monthSummary.balance}
            monthLabel={`${dayjs(month).format('YYYY年MM月')}`}
          />
          <TrendChart data={trend} />
          <MonthOverview
            records={monthRecords}
            categories={categories}
            month={month}
            income={monthSummary.income}
            expense={monthSummary.expense}
            balance={monthSummary.balance}
          />
        </section>

        {/* 明细区 */}
        <section>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <CardTitle>本月明细</CardTitle>
                  <CardDescription>
                    共 {monthSummary.count} 笔 · 支出 ¥{formatMoney(monthSummary.expense)} · 收入 ¥
                    {formatMoney(monthSummary.income)}
                  </CardDescription>
                </div>
                {filterCategory && (
                  <Button variant="ghost" size="sm" onClick={() => setFilterCategory(null)}>
                    清除筛选
                  </Button>
                )}
              </div>

              {/* 分类筛选器 */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button
                  onClick={() => setFilterCategory(null)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs transition-colors',
                    filterCategory === null
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  全部
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setFilterCategory(c.id === filterCategory ? null : c.id)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs transition-colors',
                      filterCategory === c.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:bg-muted',
                    )}
                  >
                    <span className="mr-1">{c.icon}</span>
                    {c.name}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <RecordList
                records={monthRecords}
                categories={categories}
                onEdit={handleEdit}
                onDelete={onDelete}
                filterCategory={filterCategory}
              />
            </CardContent>
          </Card>
        </section>
        </>
        )}

        <footer className="pb-4 text-center text-xs text-muted-foreground">
          <p>
            数据持久化于本地 SQLite（server/finance.db）· 浏览器清理缓存不影响
          </p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <button
              onClick={async () => {
                try {
                  await onExportBackup()
                  alert('备份已导出')
                } catch (err) {
                  alert(`导出失败：${String(err)}`)
                }
              }}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              title="导出完整备份（JSON，含账户/余额/记录）"
            >
              <Download className="h-3 w-3" />
              导出备份
            </button>
            <button
              onClick={() => document.getElementById('backup-file-input')?.click()}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              title="从备份文件还原（覆盖当前数据）"
            >
              <Upload className="h-3 w-3" />
              导入还原
            </button>
            <input
              id="backup-file-input"
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                if (!confirm('导入备份将覆盖当前所有数据，确定继续？')) return
                try {
                  await onImportBackup(file)
                  alert('还原成功')
                } catch (err) {
                  alert(`还原失败：${String(err)}`)
                }
              }}
            />
            <button
              onClick={() => setClearOpen(true)}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
              title="清空全部数据（需输入密码）"
            >
              <Trash2 className="h-3 w-3" />
              清空全部数据（需密码）
            </button>
          </div>
        </footer>

        <ClearDataDialog
          open={clearOpen}
          onClose={() => setClearOpen(false)}
          onConfirm={onClearAll}
        />

        {/* 账户余额月度报表预览弹窗（HTML 渲染，不用 PDF viewer） */}
        <Dialog
          open={pdfPreviewOpen}
          onOpenChange={(v) => {
            if (!v) closePdfPreview()
          }}
        >
          <DialogContent className="flex h-[90vh] max-w-4xl flex-col gap-0 p-0 sm:rounded-lg [&>button]:hidden">
            <DialogHeader data-dialog-header className="flex flex-row items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Eye className="h-4 w-4" />
                  账户余额月度报表 · {dayjs(month).format('YYYY年MM月')}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  预览效果如下，确认无误后点右下角"下载 PDF"保存
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={cancelPreview}
                className="h-8 w-8"
                title="取消"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>
            <div data-dialog-body className="flex-1 overflow-auto bg-muted/30 p-6">
              {reportPreview ? (
                <div className="print-area mx-auto max-w-2xl rounded-lg bg-card p-6 shadow-sm">
                  {/* 标题 */}
                  <h1 className="text-center text-xl font-bold text-foreground">
                    个人记账 · 账户余额月度报表
                  </h1>
                  <p className="mt-1 text-center text-lg text-muted-foreground">
                    {dayjs(month).format('YYYY年MM月')}
                  </p>
                  <p className="mt-1 text-center text-xs text-muted-foreground/70">
                    生成时间：{dayjs().format('YYYY-MM-DD HH:mm')}
                  </p>

                  {/* 汇总卡（2 张） */}
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                      <p className="text-xs text-muted-foreground">本月总余额</p>
                      <p
                        className={cn(
                          'mt-1 text-2xl font-bold tabular-nums',
                          reportPreview.currentTotal >= 0 ? 'text-emerald-600' : 'text-rose-600',
                        )}
                      >
                        ¥ {formatMoney(reportPreview.currentTotal)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        上月 {reportPreview.prevMonthNum}月 · ¥{' '}
                        {formatMoney(reportPreview.prevTotal)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                      <p className="text-xs text-muted-foreground">环比变化</p>
                      <p
                        className={cn(
                          'mt-1 text-2xl font-bold tabular-nums',
                          reportPreview.diff > 0
                            ? 'text-emerald-600'
                            : reportPreview.diff < 0
                              ? 'text-rose-600'
                              : 'text-muted-foreground',
                        )}
                      >
                        {reportPreview.diff > 0 ? '+' : ''}¥ {formatMoney(Math.abs(reportPreview.diff))}
                      </p>
                      <p
                        className={cn(
                          'mt-1 text-xs tabular-nums',
                          reportPreview.diff > 0
                            ? 'text-emerald-600'
                            : reportPreview.diff < 0
                              ? 'text-rose-600'
                              : 'text-muted-foreground',
                        )}
                      >
                        {reportPreview.diffPctText}
                      </p>
                    </div>
                  </div>

                  {/* 明细表 */}
                  <h2 className="mt-6 text-sm font-semibold text-foreground">各账户余额明细</h2>
                  <div className="mt-2 overflow-hidden rounded-md border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-foreground text-background">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">账户</th>
                          <th className="px-3 py-2 text-left font-medium">类型</th>
                          <th className="px-3 py-2 text-right font-medium">
                            本月{reportPreview.curMonthNum}月
                          </th>
                          <th className="px-3 py-2 text-right font-medium">变化</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportPreview.rows.map((r, i) => (
                          <tr
                            key={r.accountId}
                            className={cn(
                              'border-t border-border/60',
                              i % 2 === 0 && 'bg-muted/30',
                            )}
                          >
                            <td className="px-3 py-2">
                              <span className="mr-1">{r.icon}</span>
                              {r.name}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {r.kindLabel}
                            </td>
                            <td
                              className={cn(
                                'px-3 py-2 text-right tabular-nums',
                                r.amount < 0 && 'text-rose-600',
                              )}
                            >
                              {formatMoney(r.amount)}
                            </td>
                            <td
                              className={cn(
                                'px-3 py-2 text-right tabular-nums',
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
                        <tr className="border-t-2 border-foreground/30 bg-muted/50">
                          <td className="px-3 py-2 font-semibold" colSpan={2}>
                            本月合计
                          </td>
                          <td
                            className={cn(
                              'px-3 py-2 text-right font-semibold tabular-nums',
                              reportPreview.currentTotal < 0 && 'text-rose-600',
                            )}
                          >
                            ¥ {formatMoney(reportPreview.currentTotal)}
                          </td>
                          <td
                            className={cn(
                              'px-3 py-2 text-right font-semibold tabular-nums',
                              reportPreview.diff > 0 && 'text-emerald-600',
                              reportPreview.diff < 0 && 'text-rose-600',
                            )}
                          >
                            {reportPreview.diff > 0 ? '+' : ''}¥{' '}
                            {formatMoney(Math.abs(reportPreview.diff))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  加载中…
                </div>
              )}
            </div>
            {/* 底部 footer：右下"下载 PDF" */}
            <div data-dialog-footer className="flex items-center justify-end gap-2 border-t border-border bg-card px-4 py-3">
              <Button
                variant="default"
                size="sm"
                onClick={downloadPdfFile}
                className="gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                下载 PDF
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
