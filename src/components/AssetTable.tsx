import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, GripVertical, History, Pencil, Plus, Trash2 } from 'lucide-react'
import dayjs from 'dayjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatMoney } from '@/lib/utils'
import type { Account, BalanceSnapshot, SubAccount } from '@/types'
import { accountBalanceAtLatest, latestBalanceDate } from '@/utils/assets'
import { KIND_LABELS } from './AssetOverview'

interface Props {
  accounts: Account[]
  balances: BalanceSnapshot[]
  subAccounts: SubAccount[]
  onAddBalance: (account: Account, subAccountId?: string) => void
  onManageAccount: (account?: Account) => void
  onDeleteAccount: (account: Account) => void
  onShowHistory: (account: Account) => void
  onAddSubAccount: (account: Account) => void
  onEditSubAccount: (sub: SubAccount) => void
  onToggleSubAccount: (sub: SubAccount, enabled: boolean) => void
  onDeleteSubAccount: (sub: SubAccount) => void
  onReorder: (orderedIds: string[]) => void
}

// 某子账户最新余额
function subLatest(subId: string, balances: BalanceSnapshot[]): BalanceSnapshot | null {
  const list = balances
    .filter((b) => b.subAccountId === subId)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt))
  return list[0] ?? null
}

export default function AssetTable({
  accounts,
  balances,
  subAccounts,
  onAddBalance,
  onManageAccount,
  onDeleteAccount,
  onShowHistory,
  onAddSubAccount,
  onEditSubAccount,
  onToggleSubAccount,
  onDeleteSubAccount,
  onReorder,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  // 小项目列表展开状态（默认折叠）
  const [subsOpen, setSubsOpen] = useState<Set<string>>(new Set())

  // 拖拽排序：本地临时顺序（null = 跟随 props）
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [localOrder, setLocalOrder] = useState<string[] | null>(null)

  const active = accounts.filter((a) => !a.archived)

  // props 变化（新增/删除/外部排序）时重置本地顺序
  useEffect(() => {
    setLocalOrder(null)
  }, [accounts])

  const orderedAccounts = (() => {
    if (!localOrder) return active
    const map = new Map(active.map((a) => [a.id, a]))
    const result = localOrder.map((id) => map.get(id)).filter((a): a is Account => Boolean(a))
    active.forEach((a) => {
      if (!localOrder.includes(a.id)) result.push(a)
    })
    return result
  })()

  // ---- 拖拽事件 ----
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
    // Firefox 需要设置 data 才能触发拖拽
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!dragId || dragId === targetId) return
    setOverId(targetId)
    // 把 dragId 插入到 targetId 的位置
    setLocalOrder((prev) => {
      const base = prev ?? active.map((a) => a.id)
      const list = base.filter((id) => id !== dragId)
      const idx = list.indexOf(targetId)
      if (idx === -1) return base
      list.splice(idx, 0, dragId)
      return list
    })
  }

  const handleDragEnd = () => {
    if (dragId && localOrder) {
      const orderedIds = localOrder.filter((id) => active.some((a) => a.id === id))
      if (orderedIds.length === active.length) {
        onReorder(orderedIds)
      }
    }
    setDragId(null)
    setOverId(null)
    setLocalOrder(null)
  }

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSubs = (id: string) => {
    setSubsOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const subsOf = (accountId: string) =>
    subAccounts
      .filter((s) => s.accountId === accountId)
      .sort((a, b) => a.sortOrder - b.sortOrder)

  const historyOf = (accountId: string) =>
    balances
      .filter((b) => b.accountId === accountId)
      .sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <Card className="flex h-full max-h-[900px] flex-col overflow-hidden border-border/60 bg-card shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/60 bg-muted/20 px-4 py-3">
        <div>
          <CardTitle className="font-serif text-base font-semibold">账户</CardTitle>
          <CardDescription className="text-xs">
            悬停预览 · 点击展开小项目
          </CardDescription>
        </div>
        <Button size="sm" variant="ghost" onClick={() => onManageAccount()} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          新增账户
        </Button>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {active.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            还没有账户，点右上角「新增账户」添加（比如：支付宝、京东金融、同花顺…）
          </p>
        )}
        {orderedAccounts.map((acc, idx) => {
          // 账户合计 = 截至最新记录日期的余额（本月没录也能正确显示）
          const lb = accountBalanceAtLatest(acc, balances, subAccounts)
          const latestDate = latestBalanceDate(balances)
          const subs = subsOf(acc.id)
          const enabledSubs = subs.filter((s) => s.enabled)
          const history = historyOf(acc.id)
          const isOpen = expanded.has(acc.id)
          const isDragging = dragId === acc.id
          const isDragOver = overId === acc.id && dragId !== acc.id

          return (
            <div
              key={acc.id}
              draggable
              onDragStart={(e) => handleDragStart(e, acc.id)}
              onDragOver={(e) => handleDragOver(e, acc.id)}
              onDragEnd={handleDragEnd}
              className={cn(
                'group relative rounded-lg border border-border transition-colors',
                isDragging && 'border-primary opacity-50 shadow-lg',
                isDragOver && 'border-primary ring-1 ring-primary',
                !isDragging && !isDragOver && 'hover:bg-muted/40',
                dragId && idx > 0 && 'cursor-grab',
              )}
            >
              {/* 拖拽指示条 */}
              {isDragOver && (
                <div className="h-0.5 w-full bg-primary" />
              )}
              {/* 主行 */}
              <div className="flex items-center gap-3 px-3 py-2.5">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg"
                  style={{ background: (acc.color || '#64748b') + '20' }}
                >
                  {acc.icon}
                </span>
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground/60 active:cursor-grabbing" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{acc.name}</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {KIND_LABELS[acc.kind]}
                    </span>
                    {enabledSubs.length > 0 && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                        {enabledSubs.length} 个小项目
                      </span>
                    )}
                    {acc.note && (
                      <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                        {acc.note}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {lb !== 0 || latestDate ? (
                      <>
                        账户合计{' '}
                        <span
                          className={cn(
                            'font-semibold tabular-nums',
                            lb >= 0 ? 'text-emerald-600' : 'text-rose-600',
                          )}
                        >
                          ¥ {formatMoney(lb)}
                        </span>
                        {latestDate && <span className="ml-1.5">（截至 {latestDate}）</span>}
                      </>
                    ) : (
                      '尚未记录余额'
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="sm"
                    onClick={() => onAddBalance(acc)}
                    className="gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    记余额
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="历史记录"
                    onClick={() => onShowHistory(acc)}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="编辑账户"
                    onClick={() => onManageAccount(acc)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    title="删除账户"
                    onClick={() => {
                      if (
                        confirm(
                          `删除账户「${acc.name}」？\n其所有小项目和余额记录也会一并删除。\n（如只想停用，请用编辑改为「停用」）`,
                        )
                      ) {
                        onDeleteAccount(acc)
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* hover 余额明细浮层（卡片下方靠右，避免遮挡操作按钮） */}
              <div className="pointer-events-none absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border border-border bg-popover p-3 text-popover-foreground opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
                <p className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                  <span>
                    {acc.icon} {acc.name} · 余额明细
                  </span>
                  <span className="font-normal text-muted-foreground">{history.length} 条</span>
                </p>
                {history.length === 0 ? (
                  <p className="py-2 text-center text-xs text-muted-foreground">暂无余额记录</p>
                ) : (
                  <ul className="space-y-1">
                    {history.slice(0, 5).map((b) => (
                      <li
                        key={b.id}
                        className="flex items-center justify-between gap-2 rounded px-1.5 py-1 text-xs hover:bg-muted"
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="shrink-0 text-muted-foreground">
                            {dayjs(b.date).format('MM-DD')}
                          </span>
                          {(() => {
                            const sub = b.subAccountId
                              ? subAccounts.find((s) => s.id === b.subAccountId)
                              : null
                            return sub ? (
                              <span className="truncate">
                                {sub.icon} {sub.name}
                              </span>
                            ) : null
                          })()}
                        </span>
                        <span className="shrink-0 font-medium tabular-nums">
                          ¥ {formatMoney(b.amount)}
                        </span>
                      </li>
                    ))}
                    {history.length > 5 && (
                      <li className="border-t border-border/60 pt-1 text-center text-[10px] text-muted-foreground/70">
                        共 {history.length} 条 · 点右上角历史按钮查看全部
                      </li>
                    )}
                  </ul>
                )}
              </div>

              {/* 小项目区（默认折叠；停用的不展示） */}
              {enabledSubs.length > 0 && (
                <div className="border-t border-border/70 bg-muted/20 px-3 py-1.5">
                  {/* 折叠条 */}
                  <button
                    onClick={() => toggleSubs(acc.id)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <span>小项目（{enabledSubs.length} 个）</span>
                    <span className="flex items-center gap-1">
                      {subsOpen.has(acc.id) ? '收起' : '展开'}
                      {subsOpen.has(acc.id) ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </span>
                  </button>

                  {subsOpen.has(acc.id) && (
                    <ul className="space-y-1">
                    {enabledSubs.map((s) => {
                      const sl = subLatest(s.id, balances)
                      return (
                        <li
                          key={s.id}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted"
                        >
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sm"
                            style={{ background: (s.color || '#64748b') + '20' }}
                          >
                            {s.icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium">{s.name}</span>
                            {s.note && (
                              <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">
                                {s.note}
                              </span>
                            )}
                          </div>
                          <div className="shrink-0">
                            {sl ? (
                              <span className="text-sm font-semibold tabular-nums text-foreground">
                                ¥ {formatMoney(sl.amount)}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">未记录</span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title={`记 ${s.name} 余额`}
                            onClick={() => onAddBalance(acc, s.id)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="编辑小项目"
                            onClick={() => onEditSubAccount(s)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <button
                            title="停用小项目"
                            onClick={() => onToggleSubAccount(s, false)}
                            className={cn(
                              'relative h-5 w-9 rounded-full transition-colors',
                              s.enabled ? 'bg-primary' : 'bg-muted-foreground/30',
                            )}
                          >
                            <span
                              className={cn(
                                'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
                                s.enabled ? 'left-[18px]' : 'left-0.5',
                              )}
                            />
                          </button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            title="删除小项目"
                            onClick={() => {
                              if (confirm(`删除小项目「${s.name}」？其余额记录也会一并删除。`)) {
                                onDeleteSubAccount(s)
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </li>
                      )
                    })}
                    </ul>
                  )}

                  <button
                    onClick={() => onAddSubAccount(acc)}
                    className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    添加小项目（如：余额宝 / 股票 / 基金…）
                  </button>
                </div>
              )}

              {/* 无启用小项目时提供添加入口 */}
              {enabledSubs.length === 0 && (
                <div className="border-t border-border/70 bg-muted/20 px-3 py-1.5">
                  <button
                    onClick={() => onAddSubAccount(acc)}
                    className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    给小项目记账？先添加小项目（如：余额宝 / 股票 / 基金…）
                  </button>
                </div>
              )}

              {/* 展开历史 */}
              {history.length > 0 && (
                <button
                  onClick={() => toggle(acc.id)}
                  className="flex w-full items-center justify-center gap-1 border-t border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  {isOpen ? '收起' : `最近余额 ${history.length} 条`}
                </button>
              )}
              {isOpen && (
                <div className="border-t border-border bg-background px-3 py-2">
                  <ul className="space-y-1">
                    {history.slice(0, 15).map((b) => {
                      const sub = b.subAccountId ? subAccounts.find((s) => s.id === b.subAccountId) : null
                      return (
                        <li
                          key={b.id}
                          className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-muted"
                        >
                          <span className="text-muted-foreground">
                            {dayjs(b.date).format('YYYY-MM-DD')}
                            {sub && (
                              <span className="ml-2 rounded bg-muted px-1 py-0.5 text-xs">
                                {sub.icon} {sub.name}
                              </span>
                            )}
                            {b.note && <span className="ml-2 text-xs">{b.note}</span>}
                          </span>
                          <span className="font-medium tabular-nums">¥ {formatMoney(b.amount)}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
