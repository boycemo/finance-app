import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { ListChecks, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn, formatMoney } from '@/lib/utils'
import type { Account, AccountKind, BalanceSnapshot, SubAccount } from '@/types'
import { allMonthsFromRecords, fillDateForMonth } from '@/utils/assets'
import { useAppData } from '@/context/DataContext'
import AssetOverview from './AssetOverview'
import AssetTable from './AssetTable'
import BalanceForm from './BalanceForm'
import AccountForm from './AccountForm'
import SubAccountForm from './SubAccountForm'
import BalanceReport from './BalanceReport'
import HistoryEditDialog from './HistoryEditDialog'
import BatchEntryDialog from './BatchEntryDialog'

export default function AssetsView() {
  // 直接订阅全局数据上下文（重命名为 on* 风格，保持下方代码不变）
  const {
    accounts,
    subAccounts,
    balances,
    assetsLoading: loading,
    assetsError: error,
    addAccount: onAddAccount,
    updateAccount: onUpdateAccount,
    deleteAccount: onDeleteAccount,
    addSubAccount: onAddSubAccount,
    updateSubAccount: onUpdateSubAccount,
    deleteSubAccount: onDeleteSubAccount,
    reorderAccounts: onReorderAccounts,
    addBalance: onAddBalance,
    deleteBalance: onDeleteBalance,
    updateBalance: onUpdateBalance,
    batchDeleteBalances: onBatchDeleteBalances,
    batchDeleteByDate: onBatchDeleteByDate,
    batchAddBalances: onBatchAddBalances,
  } = useAppData()
  // 记余额
  const [balanceOpen, setBalanceOpen] = useState(false)
  const [balanceAccount, setBalanceAccount] = useState<Account | null>(null)
  const [balanceSubId, setBalanceSubId] = useState<string>()

  // 账户表单
  const [accountFormOpen, setAccountFormOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)

  // 小项目表单
  const [subFormOpen, setSubFormOpen] = useState(false)
  const [subFormAccount, setSubFormAccount] = useState<Account | null>(null)
  const [editingSub, setEditingSub] = useState<SubAccount | null>(null)

  // 历史
  const [historyAccount, setHistoryAccount] = useState<Account | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingBalance, setEditingBalance] = useState<BalanceSnapshot | null>(null)

  // 批量录入
  const [batchOpen, setBatchOpen] = useState(false)

  const handleOpenHistory = (acc: Account) => {
    setHistoryAccount(acc)
    setSelectedIds(new Set())
  }

  const handleAddBalance = (acc: Account, subAccountId?: string) => {
    setBalanceAccount(acc)
    setBalanceSubId(subAccountId)
    setBalanceOpen(true)
  }

  const handleManageAccount = (acc?: Account) => {
    setEditingAccount(acc ?? null)
    setAccountFormOpen(true)
  }

  const handleAddSub = (acc: Account) => {
    setSubFormAccount(acc)
    setEditingSub(null)
    setSubFormOpen(true)
  }

  const handleEditSub = (sub: SubAccount) => {
    setSubFormAccount(accounts.find((a) => a.id === sub.accountId) ?? null)
    setEditingSub(sub)
    setSubFormOpen(true)
  }

  // 历史（按日期倒序，每个日期一个分组）
  const history = useMemo(() => {
    if (!historyAccount) return []
    return balances
      .filter((b) => b.accountId === historyAccount.id)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [historyAccount, balances])

  // 按日期分组
  const historyByDate = useMemo(() => {
    const map = new Map<string, BalanceSnapshot[]>()
    history.forEach((b) => {
      const list = map.get(b.date) || []
      list.push(b)
      map.set(b.date, list)
    })
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [history])

  // 统一新增账户：创建后自动为所有历史月份补 0 余额记录
  const handleCreateAccount = async (data: {
    name: string
    kind: AccountKind
    icon: string
    color: string
    note?: string
  }) => {
    const created = await onAddAccount(data)
    // 补历史 0 记录（从最早记录月到当前月）
    const months = allMonthsFromRecords(balances)
    if (created && months.length > 0) {
      await onBatchAddBalances(
        months.map((m) => ({
          accountId: created.id,
          amount: 0,
          date: fillDateForMonth(m),
          note: '新增账户补录',
        })),
      )
    }
  }

  return (
    <div className="space-y-4">
      <AssetOverview accounts={accounts} balances={balances} subAccounts={subAccounts} />

      {/* 工具条：批量录入 */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2">
        <p className="text-xs text-muted-foreground">
          一次性给多个账户/小项目录余额，月底盘点神器
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setBatchOpen(true)} className="gap-1.5">
            <ListChecks className="h-3.5 w-3.5" />
            批量录入余额
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          资产数据加载失败：{error}
        </p>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">加载资产数据…</p>
      ) : (
        <>
          <AssetTable
            accounts={accounts}
            balances={balances}
            subAccounts={subAccounts}
            onAddBalance={handleAddBalance}
            onManageAccount={handleManageAccount}
            onDeleteAccount={(acc) => onDeleteAccount(acc.id)}
            onShowHistory={handleOpenHistory}
            onAddSubAccount={handleAddSub}
            onEditSubAccount={handleEditSub}
            onToggleSubAccount={(sub, enabled) => onUpdateSubAccount(sub.id, { enabled })}
            onDeleteSubAccount={(sub) => onDeleteSubAccount(sub.id)}
            onReorder={onReorderAccounts}
          />
          <BalanceReport accounts={accounts} balances={balances} subAccounts={subAccounts} />
        </>
      )}

      {/* 记录余额 */}
      <BalanceForm
        open={balanceOpen}
        account={balanceAccount}
        subAccounts={subAccounts}
        defaultSubAccountId={balanceSubId}
        balances={balances}
        onSubmit={onAddBalance}
        onClose={() => {
          setBalanceOpen(false)
          setBalanceAccount(null)
          setBalanceSubId(undefined)
        }}
      />

      {/* 新增/编辑账户 */}
      <AccountForm
        open={accountFormOpen}
        account={editingAccount}
        onClose={() => {
          setAccountFormOpen(false)
          setEditingAccount(null)
        }}
        onSubmit={(data) => {
          if (editingAccount) {
            onUpdateAccount(editingAccount.id, data)
          } else {
            handleCreateAccount(data)
          }
        }}
      />

      {/* 新增/编辑小项目 */}
      <SubAccountForm
        open={subFormOpen}
        account={subFormAccount}
        subAccount={editingSub}
        onClose={() => {
          setSubFormOpen(false)
          setSubFormAccount(null)
          setEditingSub(null)
        }}
        onSubmit={(data) => {
          if (editingSub) {
            onUpdateSubAccount(editingSub.id, data)
          } else if (subFormAccount) {
            onAddSubAccount({ accountId: subFormAccount.id, ...data })
          }
        }}
      />

      {/* 历史快照弹窗 */}
      <Dialog
        open={!!historyAccount}
        onOpenChange={(v) => {
          if (!v) {
            setHistoryAccount(null)
            setEditingBalance(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {historyAccount?.icon} {historyAccount?.name} · 余额历史
            </DialogTitle>
            <DialogDescription>共 {history.length} 条记录 · {historyByDate.length} 个时间点</DialogDescription>
          </DialogHeader>
          {history.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">还没有余额记录</p>
          ) : (
            <>
              {/* 批量操作栏 */}
              <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-1.5">
                <button
                  onClick={() => {
                    setSelectedIds((prev) =>
                      prev.size === history.length
                        ? new Set()
                        : new Set(history.map((b) => b.id)),
                    )
                  }}
                  className="text-xs font-medium text-primary transition-opacity hover:opacity-80"
                >
                  {selectedIds.size === history.length ? '取消全选' : '全选'}
                </button>
                <span className="text-xs text-muted-foreground">
                  已选 <span className="font-semibold text-foreground">{selectedIds.size}</span> 条
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={selectedIds.size === 0}
                  className="h-7 gap-1 text-xs"
                  onClick={() => {
                    if (confirm(`删除选中的 ${selectedIds.size} 条余额记录？`)) {
                      onBatchDeleteBalances(Array.from(selectedIds))
                      setSelectedIds(new Set())
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                  删除选中
                </Button>
              </div>

              <ul className="max-h-80 space-y-3 overflow-y-auto">
                {historyByDate.map(([date, list]) => (
                  <li key={date}>
                    {/* 日期分组头 */}
                    <div className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1 text-xs">
                      <span className="font-medium text-foreground">
                        {dayjs(date).format('YYYY年MM月DD日')}
                        <span className="ml-2 text-muted-foreground">{list.length} 条</span>
                      </span>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `删除 ${date} 的全部 ${list.length} 条余额记录？此操作不可恢复。`,
                            )
                          ) {
                            onBatchDeleteByDate([date])
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                        title="删除该日期下的所有记录"
                      >
                        <Trash2 className="h-3 w-3" />
                        删日期
                      </button>
                    </div>

                    {/* 该日期下的记录 */}
                    <ul className="mt-1 space-y-1">
                      {list.map((b) => {
                        const sub = b.subAccountId
                          ? subAccounts.find((s) => s.id === b.subAccountId)
                          : null
                        const checked = selectedIds.has(b.id)
                        return (
                          <li
                            key={b.id}
                            className={cn(
                              'group flex items-center gap-2 rounded-md border border-border px-3 py-2 transition-colors',
                              checked && 'border-primary/50 bg-primary/5',
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setSelectedIds((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(b.id)) next.delete(b.id)
                                  else next.add(b.id)
                                  return next
                                })
                              }}
                              className="h-4 w-4 shrink-0 rounded accent-primary"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium tabular-nums">
                                ¥ {formatMoney(b.amount)}
                                {sub && (
                                  <span className="ml-2 rounded bg-muted px-1 py-0.5 text-xs font-normal text-muted-foreground">
                                    {sub.icon} {sub.name}
                                  </span>
                                )}
                              </p>
                              {b.note && (
                                <p className="text-xs text-muted-foreground">{b.note}</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                              title="编辑"
                              onClick={() => setEditingBalance(b)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                              title="删除"
                              onClick={() => {
                                if (confirm('删除这条余额记录？')) {
                                  onDeleteBalance(b.id)
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </li>
                        )
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 批量录入 */}
      <BatchEntryDialog
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        accounts={accounts}
        subAccounts={subAccounts}
        balances={balances}
        onSubmit={onBatchAddBalances}
        onCreateAccount={(data) => handleCreateAccount(data)}
      />

      {/* 编辑单条余额 */}
      <HistoryEditDialog
        open={!!editingBalance}
        account={historyAccount}
        editing={editingBalance}
        subAccounts={subAccounts}
        onClose={() => setEditingBalance(null)}
        onSubmit={onUpdateBalance}
      />
    </div>
  )
}
