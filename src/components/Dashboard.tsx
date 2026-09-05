import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { AlertTriangle, Download, Loader2, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FinanceRecord } from '@/types'
import { useAppData } from '@/context/DataContext'
import { useSidebar } from '@/hooks/useSidebar'
import {
  NAV_ITEMS,
  buildRoute,
  parseRoute,
  type ViewTab,
} from '@/config/navigation'
import AppHeader from './AppHeader'
import Sidebar from './Sidebar'
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

  // hash 路由：#/assets | #/records
  const [view, setView] = useState<ViewTab>(() => parseRoute(window.location.hash))

  const [month, setMonth] = useState<string>(dayjs().format('YYYY-MM'))
  const [editing, setEditing] = useState<FinanceRecord | null>(null)
  const [clearOpen, setClearOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sidebarCollapsed, toggleSidebar] = useSidebar()

  /** 导航入口：更新 hash（hashchange 监听负责同步状态，支持前进/后退） */
  const navigate = useCallback((nextView: ViewTab) => {
    window.location.hash = buildRoute(nextView)
  }, [])

  // 首次进入若无 hash，补默认路径（不产生历史记录）
  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, '', buildRoute(view))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 监听 hash 变化（含浏览器前进/后退、菜单跳转）
  useEffect(() => {
    const handleHashChange = () => setView(parseRoute(window.location.hash))
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Esc 关闭移动端抽屉
  useEffect(() => {
    if (!mobileNavOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [mobileNavOpen])

  // 打印完成后清除 data-print-mode（保证下次正常显示）
  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.removeAttribute('data-print-mode')
    }
    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [])

  // 标题行文案：菜单配置驱动
  const activeItem = NAV_ITEMS.find((item) => item.key === view)

  return (
    <div className="min-h-screen">
      <div className="flex min-h-screen">
        <Sidebar
          view={view}
          onNavigate={navigate}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={toggleSidebar}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />

        <div className="min-w-0 flex-1">
          <AppHeader
            month={month}
            onMonthChange={setMonth}
            showRecordForm={view === 'records'}
            editing={editing}
            onCancelEdit={() => setEditing(null)}
            onOpenMobileNav={() => setMobileNavOpen(true)}
          />

          <main id="dashboard-print-area" className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* 仅收支记账保留简单标题（账户余额由 AssetsView 自己控制标题与操作） */}
        {view === 'records' && (
          <div className="flex items-baseline gap-3">
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground/90">
              收支记账
            </h2>
            <span className="text-xs text-muted-foreground/70">
              {dayjs(month).format('YYYY年MM月')} · 流水明细与消费趋势
            </span>
          </div>
        )}

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

        <footer className="mt-4 rounded-2xl border border-border/40 bg-card/50 p-4 text-center text-xs text-muted-foreground backdrop-blur-sm dark:border-white/8 dark:bg-white/[0.02]">
          <p>
            数据持久化于本地 SQLite（server/finance.db）· 浏览器清理缓存不影响
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              onClick={async () => {
                try {
                  await exportBackup()
                  alert('备份已导出')
                } catch (err) {
                  alert(`导出失败：${String(err)}`)
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm transition-all hover:border-primary/40 hover:text-primary active:scale-95"
              title="导出完整备份（JSON，含账户/余额/记录）"
            >
              <Download className="h-3.5 w-3.5" />
              导出备份
            </button>
            <button
              onClick={() => document.getElementById('backup-file-input')?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm transition-all hover:border-primary/40 hover:text-primary active:scale-95"
              title="从备份文件还原（覆盖当前数据）"
            >
              <Upload className="h-3.5 w-3.5" />
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm transition-all hover:border-destructive/40 hover:text-destructive active:scale-95"
              title="清空全部数据（需输入密码）"
            >
              <Trash2 className="h-3.5 w-3.5" />
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
      </div>
    </div>
  )
}
