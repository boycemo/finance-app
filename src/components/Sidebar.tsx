import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV_ITEMS, type ViewTab } from '@/config/navigation'

export type { ViewTab } from '@/config/navigation'

interface Props {
  view: ViewTab
  onNavigate: (view: ViewTab) => void
  collapsed: boolean
  onToggleCollapsed: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

export default function Sidebar({
  view,
  onNavigate,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: Props) {
  return (
    <>
      <div
        onClick={onCloseMobile}
        aria-hidden="true"
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200 lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col',
          'border-r border-border/60 bg-card/95 backdrop-blur-md',
          'transition-transform duration-300 ease-out motion-reduce:transition-none',
          'lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:translate-x-0 lg:transition-[width]',
          collapsed ? 'lg:w-[76px]' : 'lg:w-56',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* 移动端关闭按钮 */}
        <div className="flex h-14 items-center justify-between border-b border-border/60 px-4 lg:hidden">
          <span className="font-serif text-sm font-semibold text-foreground/80">导航</span>
          <button
            onClick={onCloseMobile}
            aria-label="关闭导航"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 桌面 Logo 区 */}
        <div
          className={cn(
            'hidden flex-col items-center justify-center border-b border-border/60 px-4 py-5 lg:flex',
            collapsed && 'lg:px-2',
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <span className="font-serif text-lg font-bold">墨</span>
          </div>
          {!collapsed && (
            <div className="mt-2 text-center">
              <p className="font-serif text-sm font-semibold">墨账</p>
              <p className="text-[10px] text-muted-foreground">Ink Ledger</p>
            </div>
          )}
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 overflow-y-auto p-2" aria-label="主导航">
          <p
            className={cn(
              'mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 transition-opacity duration-200',
              collapsed && 'lg:hidden',
            )}
          >
            工作台
          </p>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = view === item.key
              const Icon = item.icon
              return (
                <li key={item.key}>
                  <button
                    onClick={() => {
                      onNavigate(item.key)
                      onCloseMobile()
                    }}
                    aria-current={active ? 'page' : undefined}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left',
                      'transition-all duration-200 motion-reduce:transition-none',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                      collapsed && 'lg:justify-center lg:px-0',
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className={cn('min-w-0 flex-1', collapsed && 'lg:hidden')}>
                      <span className="block truncate text-sm font-medium">{item.label}</span>
                      <span className="block truncate text-[11px] opacity-70">
                        {item.desc}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* 底部状态 */}
        <div className="border-t border-border/60 p-3">
          <div
            className={cn(
              'mb-2 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2',
              collapsed && 'lg:hidden',
            )}
          >
            <span className="truncate text-[11px] text-muted-foreground/70">SQLite 本地存储</span>
          </div>
          <button
            onClick={onToggleCollapsed}
            aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
            aria-expanded={!collapsed}
            title={collapsed ? '展开侧边栏' : '收起侧边栏'}
            className={cn(
              'hidden w-full items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground',
              'transition-colors duration-200 hover:bg-muted/60 hover:text-foreground',
              'lg:flex',
              collapsed && 'lg:justify-center lg:px-0',
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5 shrink-0" />
            ) : (
              <PanelLeftClose className="h-5 w-5 shrink-0" />
            )}
            <span className={cn('text-sm font-medium', collapsed && 'lg:hidden')}>收起侧边栏</span>
          </button>
        </div>
      </aside>
    </>
  )
}
