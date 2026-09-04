import { Suspense, lazy, useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { AlertTriangle, Download, Loader2, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FinanceRecord } from '@/types'
import { useAppData } from '@/context/DataContext'
import AppHeader from './AppHeader'
import TabBar, { type ViewTab } from './TabBar'
import ClearDataDialog from './ClearDataDialog'
import MonthDetailPrintArea from './MonthDetailPrintArea'

// 视图级懒加载：两个 Tab 各自成 chunk（recharts 等重依赖随之拆分）
const AssetsView = lazy(() => import('./AssetsView'))
const RecordsView = lazy(() => import('./RecordsView'))

export default function Dashboard() {
  const {
    recordsLoading,
    recordsError,
    reloadRecords,
    clearAll,
    exportBackup,
    importBackup,
  } = useAppData()

  const [view, setView] = useState<ViewTab>('assets')
  const [month, setMonth] = useState<string>(dayjs().format('YYYY-MM'))
  const [editing, setEditing] = useState<FinanceRecord | null>(null)
  const [clearOpen, setClearOpen] = useState(false)

  // 打印完成后清除 data-print-mode（保证下次正常显示）
  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.removeAttribute('data-print-mode')
    }
    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <AppHeader
        month={month}
        onMonthChange={setMonth}
        showRecordForm={view === 'records'}
        editing={editing}
        onCancelEdit={() => setEditing(null)}
      />

      <TabBar view={view} onChange={setView} />

      <main id="dashboard-print-area" className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {/* 错误条 */}
        {recordsError && (
          <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">后端连不上</p>
              <p className="mt-1 text-xs text-rose-600/90">{recordsError}</p>
              <p className="mt-1 text-xs text-rose-600/90">
                在 <code className="rounded bg-rose-100 px-1">server/</code> 目录跑 <code className="rounded bg-rose-100 px-1">npm run dev</code> 启动后端。
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={reloadRecords} className="shrink-0">
              重试
            </Button>
          </div>
        )}

        {/* 加载遮罩 */}
        {recordsLoading && (
          <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在加载数据…
          </div>
        )}

        <Suspense
          fallback={
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              加载视图…
            </div>
          }
        >
          {view === 'assets' ? (
            <AssetsView />
          ) : (
            <RecordsView
              month={month}
              editing={editing}
              onEdit={setEditing}
              onCancelEdit={() => setEditing(null)}
            />
          )}
        </Suspense>

        <footer className="pb-4 text-center text-xs text-muted-foreground">
          <p>
            数据持久化于本地 SQLite（server/finance.db）· 浏览器清理缓存不影响
          </p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <button
              onClick={async () => {
                try {
                  await exportBackup()
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
                  await importBackup(file)
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
          onConfirm={clearAll}
        />
      </main>

      {/* ===== 月度明细打印区（仅打印时显示） ===== */}
      <MonthDetailPrintArea month={month} />
    </div>
  )
}
