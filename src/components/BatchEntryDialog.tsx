import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Calendar, CheckCircle2, ListChecks, Plus, Save, Sparkles, Trash2 } from 'lucide-react'
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
import { cn, formatMoney } from '@/lib/utils'
import type { Account, AccountKind, BalanceSnapshot, SubAccount } from '@/types'
import { useDraftedState, loadDraft, clearDraft } from '@/hooks/useDraft'
import { accountLatestBalance, signedAmount } from '@/utils/assets'

interface Props {
  open: boolean
  onClose: () => void
  accounts: Account[]
  subAccounts: SubAccount[]
  balances: BalanceSnapshot[]
  onSubmit: (items: Array<{
    accountId: string
    subAccountId?: string
    amount: number
    date: string
    note?: string
  }>) => Promise<void>
  onCreateAccount: (data: {
    name: string
    kind: AccountKind
    icon: string
    color: string
    note?: string
  }) => Promise<void> | void
}

interface Row {
  key: string // 唯一键：accountId-subAccountId
  accountId: string
  subAccountId?: string
  label: string
  icon: string
  color: string
  hint?: string
  kind?: AccountKind // 父账户的 kind（用于按类型取负）
}

interface AmountLines {
  // 每行的多笔金额输入（字符串列表，空行忽略）
  lines: string[]
}

export default function BatchEntryDialog({
  open,
  onClose,
  accounts,
  subAccounts,
  balances,
  onSubmit,
  onCreateAccount,
}: Props) {
  // 草稿键：按月份区分（每月初打开是空草稿）
  const draftKey = `batch-balance:${dayjs().format('YYYY-MM')}`
  const [date, setDate] = useDraftedState<string>(`${draftKey}:date`, dayjs().format('YYYY-MM-DD'))
  const [note, setNote] = useDraftedState<string>(`${draftKey}:note`, '')
  // 金额行（多笔相加）；只要这一行有有效金额，保存时就入库
  const [amountLines, setAmountLines] = useDraftedState<Record<string, string[]>>(
    `${draftKey}:amounts`,
    {},
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const d = loadDraft<Record<string, string[]>>(`${draftKey}:amounts`)
    return !!d && Object.keys(d).length > 0
  })

  // 构造可选行（每个账户/小项目一行，账户直录也作为独立选项）
  const allRows = useMemo<Row[]>(() => {
    const rows: Row[] = []
    accounts
      .filter((a) => !a.archived)
      .forEach((a) => {
        const enabled = subAccounts
          .filter((s) => s.accountId === a.id && s.enabled)
          .sort((x, y) => x.sortOrder - y.sortOrder)
        if (enabled.length > 0) {
          // 只列小项目（开启小项目的账户按小项目计）
          enabled.forEach((s) => {
            rows.push({
              key: `${a.id}-${s.id}`,
              accountId: a.id,
              subAccountId: s.id,
              label: `${a.name} · ${s.name}`,
              icon: s.icon,
              color: s.color,
              hint: s.note || undefined,
              kind: a.kind,
            })
          })
        } else {
          // 账户直录
          rows.push({
            key: `${a.id}-direct`,
            accountId: a.id,
            label: a.name,
            icon: a.icon,
            color: a.color,
            hint: a.note || undefined,
            kind: a.kind,
          })
        }
      })
    return rows
  }, [accounts, subAccounts, balances])

  // 打开时：如果有本月草稿则恢复；否则全部留空（不自动预填，由「全部预填上月」按选定日期控制）
  useEffect(() => {
    if (!open) return
    const existing = loadDraft<Record<string, string[]>>(`${draftKey}:amounts`)
    if (existing && Object.keys(existing).length > 0) {
      setHasDraft(true)
      return
    }
    setAmountLines({})
    setDate(dayjs().format('YYYY-MM-DD'))
    setNote('')
    setError(null)
    setHasDraft(false)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // 单行求和（空 / 非法跳过；支持负数）
  const sumLines = (lines: string[] | undefined): number => {
    if (!lines) return 0
    return lines.reduce((s, v) => {
      const v2 = v.trim()
      if (v2 === '') return s
      const n = Number(v2)
      return !isNaN(n) ? s + n : s
    }, 0)
  }

  // 某行是否"有输入"（任意一格填了有效数字，包括 0）
  const hasAnyInput = (lines: string[] | undefined): boolean => {
    if (!lines) return false
    return lines.some((l) => {
      const v = l.trim()
      return v !== '' && !isNaN(Number(v))
    })
  }

  // 智能摘要：列出"有输入"的行（保存时全部入库，支持正数/负数/0）
  const validKeys = useMemo(
    () =>
      allRows
        .filter((r) => hasAnyInput(amountLines[r.key]))
        .map((r) => r.key),
    [allRows, amountLines],
  )

  // 根据选定日期计算每个账户/小项目"上月"的金额（当月口径：上月无记录 = 0，不继承更早；取绝对值）
  // 共享给：每行下面的"上月(YYYY-MM) ¥ xxx"展示行 + 「全部预填上月」按钮
  const prevMonthInfo = useMemo(() => {
    const map: Record<string, number> = {}
    let prevMonthLabel = ''
    if (!date) return { amounts: map, prevMonthLabel }
    const selected = dayjs(date)
    if (!selected.isValid()) return { amounts: map, prevMonthLabel }
    prevMonthLabel = selected.subtract(1, 'month').format('YYYY-MM')
    allRows.forEach((r) => {
      const last = balances
        .filter(
          (b) =>
            b.accountId === r.accountId &&
            (b.subAccountId ?? null) === (r.subAccountId ?? null) &&
            b.date.startsWith(prevMonthLabel),
        )
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt))[0]
      map[r.key] = last ? Math.abs(last.amount) : 0
    })
    return { amounts: map, prevMonthLabel }
  }, [date, allRows, balances])

  // 一键按上月余额填充所有未填项
  // 全部预填上月：按"选定日期"的上月算；负数取绝对值（用户输入视角）
  // 口径：上月当月内有记录 → 填该金额；上月无记录 → 填 0（不继承更早）
  const fillFromLast = () => {
    if (!date) return
    const selected = dayjs(date)
    if (!selected.isValid()) return
    const map = { ...amountLines }
    let filled = 0
    allRows.forEach((r) => {
      // 复用 prevMonthInfo.amounts（口径一致：绝对值，无记录 = 0）
      const v = prevMonthInfo.amounts[r.key] ?? 0
      map[r.key] = [String(v)]
      filled++
    })
    setAmountLines(map)
    if (filled > 0) {
      setError(null)
    } else {
      alert(`选定日期的上月（${prevMonthInfo.prevMonthLabel}）没有可参照的余额数据`)
    }
  }

  // 修改某行某条金额
  const setLine = (key: string, idx: number, val: string) => {
    setAmountLines((prev) => {
      const list = prev[key] ? [...prev[key]] : ['']
      list[idx] = val
      return { ...prev, [key]: list }
    })
  }

  // 新增一行
  const addLine = (key: string) => {
    setAmountLines((prev) => {
      const list = prev[key] ? [...prev[key], ''] : ['', '']
      return { ...prev, [key]: list }
    })
  }

  // 删某行（至少留一行）
  const removeLine = (key: string, idx: number) => {
    setAmountLines((prev) => {
      const list = prev[key] ? [...prev[key]] : ['']
      if (list.length <= 1) return { ...prev, [key]: [''] }
      list.splice(idx, 1)
      return { ...prev, [key]: list }
    })
  }

  // 添加账户小弹窗
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createKind, setCreateKind] = useState<AccountKind>('cash')
  const [createIcon, setCreateIcon] = useState('💳')
  const [createColor, setCreateColor] = useState('#1677ff')
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  // 汇总：所有有有效金额的行都算候选
  // 计算"按账户类型符号化后"的实际存储值（payable/credit 转为负）
  const summary = useMemo(() => {
    const items = validKeys.map((k) => {
      const r = allRows.find((x) => x.key === k)!
      const raw = sumLines(amountLines[k])
      const signed = signedAmount(raw, r.kind)
      return { row: r, num: signed }
    })
    const totalAll = items.reduce((s, it) => s + it.num, 0)
    return { items, total: totalAll, validCount: items.length }
  }, [validKeys, amountLines, allRows])

  // 打开 / 关闭添加账户小弹窗
  const openCreate = () => {
    setCreateName('')
    setCreateKind('cash')
    setCreateIcon('💳')
    setCreateColor('#1677ff')
    setCreateError(null)
    setCreateOpen(true)
  }
  const closeCreate = () => {
    if (creating) return
    setCreateOpen(false)
  }
  const submitCreate = async () => {
    if (!createName.trim()) {
      setCreateError('请输入账户名称')
      return
    }
    setCreating(true)
    setCreateError(null)
    try {
      await onCreateAccount({
        name: createName.trim(),
        kind: createKind,
        icon: createIcon,
        color: createColor,
      })
      setCreateOpen(false)
    } catch (err) {
      setCreateError(`创建失败：${String(err)}`)
    } finally {
      setCreating(false)
    }
  }

  const handleSubmit = async () => {
    if (summary.validCount === 0) {
      setError('请至少勾选一行并填入大于 0 的金额')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const items = summary.items.map((it) => ({
        accountId: it.row.accountId,
        subAccountId: it.row.subAccountId,
        amount: signedAmount(Number(it.num.toFixed(2)), it.row.kind),
        date,
        note: note.trim() || undefined,
      }))
      await onSubmit(items)
      // 成功后清草稿
      ;[`${draftKey}:amounts`, `${draftKey}:note`, `${draftKey}:date`].forEach((k) =>
        clearDraft(k),
      )
      setHasDraft(false)
      onClose()
    } catch (err) {
      setError(`保存失败：${String(err)}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !submitting && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            批量录入余额
          </DialogTitle>
          <DialogDescription>
            一次性给多个账户/小项目录余额，月底盘点神器
          </DialogDescription>
        </DialogHeader>

        {/* 公共设置 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1 min-h-[20px]">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              日期
            </Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={dayjs().format('YYYY-MM-DD')} />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1 min-h-[20px]">
              <span className="inline-block h-3.5 w-3.5 shrink-0" aria-hidden />
              备注（会应用到所有行）
            </Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder=""
              maxLength={50}
            />
          </div>
        </div>

        {/* 工具条 */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-1.5 text-xs">
          <span className="text-muted-foreground">
            有效 <span className="font-semibold text-foreground">{summary.validCount}</span> /{' '}
            {allRows.length} 条
            {hasDraft && (
              <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-amber-700">
                <Save className="h-2.5 w-2.5" />
                草稿
              </span>
            )}
          </span>
          <div className="flex items-center gap-1.5">
            {hasDraft && (
              <button
                onClick={() => {
                  if (confirm('清除本月所有批量录入草稿？已填金额会被清空，可通过「全部预填上月」重新填入。')) {
                    ;[`${draftKey}:amounts`, `${draftKey}:note`, `${draftKey}:date`].forEach((k) =>
                      clearDraft(k),
                    )
                    setNote('')
                    setHasDraft(false)
                    // 全部留空，由「全部预填上月」按选定日期控制
                    setAmountLines({})
                    setDate(dayjs().format('YYYY-MM-DD'))
                  }
                }}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                title="清除草稿，重新从上月余额预填"
              >
                <Trash2 className="h-3 w-3" />
                清除草稿
              </button>
            )}
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
              title="新建账户，立刻出现在下方列表中"
            >
              <Plus className="h-3 w-3" />
              添加账户
            </button>
            <button
              onClick={fillFromLast}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 font-medium text-primary transition-colors hover:border-primary/40 hover:bg-primary/5"
              title="按当前选定日期的上月，把有上月记录的行预填（负数取绝对值，不影响已录）"
            >
              <Sparkles className="h-3 w-3" />
              全部预填上月
            </button>
          </div>
        </div>

        {/* 列表 - 固定列宽 grid：图标 / 名称 / 金额(多行) / 状态 */}
        <div className="max-h-[460px] space-y-1 overflow-y-auto pr-1">
          {allRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">还没有账户</p>
          ) : (
            <div className="grid grid-cols-[32px_minmax(0,1fr)_180px_24px] items-start gap-2 px-2 py-1 text-[11px] font-medium text-muted-foreground">
              <span></span>
              <span>账户 / 小项目</span>
              <span className="text-right">金额（多笔相加 = 合计）</span>
              <span></span>
            </div>
          )}
          {allRows.map((r) => {
            const lines = amountLines[r.key] ?? ['']
            // 行内合计：按账户类型符号化（payable/credit 转为负）
            const rawTotal = sumLines(lines)
            const total = signedAmount(rawTotal, r.kind)
            const hasValid = hasAnyInput(lines)
            return (
              <div
                key={r.key}
                className={cn(
                  'grid grid-cols-[32px_minmax(0,1fr)_180px_24px] items-center gap-2 rounded-md border px-2 py-2 transition-colors',
                  hasValid
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border hover:bg-muted/40',
                )}
              >
                {/* 图标 */}
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-md text-base"
                  style={{ background: (r.color || '#64748b') + '20' }}
                >
                  {r.icon}
                </span>
                {/* 名称 */}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.label}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {prevMonthInfo.amounts[r.key] !== undefined
                      ? `上月(${prevMonthInfo.prevMonthLabel}) ¥ ${formatMoney(prevMonthInfo.amounts[r.key])}`
                      : r.hint || '暂无上月记录'}
                  </p>
                </div>
                {/* 金额（多笔相加） */}
                <div className="space-y-1">
                  {lines.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <div className="relative w-[140px]">
                        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
                          ¥
                        </span>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={r.kind === 'payable' || r.kind === 'credit' ? 0 : undefined}
                          placeholder={
                            r.kind === 'payable' || r.kind === 'credit'
                              ? '0.00（系统自动取负）'
                              : idx === 0
                                ? '0.00（如 -1500）'
                                : '加一笔…'
                          }
                          value={line}
                          onChange={(e) => setLine(r.key, idx, e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                          onKeyDown={(e) => {
                            // 负债类账户禁止输入负号
                            if (
                              (r.kind === 'payable' || r.kind === 'credit') &&
                              e.key === '-'
                            ) {
                              e.preventDefault()
                            }
                          }}
                          className="h-7 w-full pl-5 text-sm tabular-nums"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(r.key, idx)}
                        disabled={lines.length <= 1}
                        className={cn(
                          'shrink-0 rounded border border-border px-1 text-[10px] text-muted-foreground transition-colors',
                          lines.length <= 1
                            ? 'cursor-not-allowed opacity-30'
                            : 'hover:border-destructive/50 hover:text-destructive',
                        )}
                        title={lines.length <= 1 ? '至少保留一项' : '删除这一项'}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-1 px-0.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => addLine(r.key)}
                      className="font-medium text-primary transition-opacity hover:opacity-80"
                    >
                      + 加一笔
                    </button>
                    {lines.length > 1 && (
                      <span className="tabular-nums text-muted-foreground">
                        合计{' '}
                        <span
                          className={cn(
                            'font-semibold',
                            total < 0 ? 'text-rose-600' : 'text-foreground',
                          )}
                        >
                          ¥ {formatMoney(total)}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                {/* 状态 */}
                <div className="flex justify-center">
                  {hasValid ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <span className="h-4 w-4" />
                  )}
                </div>
              </div>
            )
          })}
          {allRows.length === 0 ? null : <div className="h-1" />}
        </div>

        {/* 合计 */}
        {summary.validCount > 0 && (
          <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              合计 <span className="font-semibold text-foreground">{summary.validCount}</span> 条有效记录
            </span>
            <span
              className={cn(
                'text-base font-semibold tabular-nums',
                summary.total < 0 ? 'text-rose-600' : 'text-primary',
              )}
            >
              ¥ {formatMoney(summary.total)}
            </span>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={summary.validCount === 0 || submitting}
            className="gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" />
            {submitting ? '保存中…' : `保存 ${summary.validCount} 条`}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* 添加账户嵌套弹窗 */}
      <Dialog open={createOpen} onOpenChange={(v) => !v && closeCreate()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              添加账户
            </DialogTitle>
            <DialogDescription>保存后立刻出现在上方列表，可继续录入</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>账户名称</Label>
              <Input
                value={createName}
                onChange={(e) => {
                  setCreateName(e.target.value)
                  setCreateError(null)
                }}
                placeholder="如：微信 / 公积金 / 信用卡"
                maxLength={20}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label>类型</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    ['cash', '货币资金'],
                    ['investment', '投资账户'],
                    ['fund', '基金理财'],
                    ['credit', '信用账户'],
                    ['receivable', '应收'],
                    ['payable', '应付'],
                    ['other', '其他'],
                  ] as Array<[AccountKind, string]>
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setCreateKind(k)}
                    className={cn(
                      'rounded-md border px-2 py-1.5 text-left text-sm transition-colors',
                      createKind === k
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:bg-muted',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>图标</Label>
                <div className="flex flex-wrap gap-1">
                  {['💳', '💰', '🏦', '📈', '💬', '☁️', '🏛️', '🪪', '🔒', '⚠️', '📉', '🪙', '⛓️'].map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setCreateIcon(ic)}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded border text-sm transition-colors',
                        createIcon === ic
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
                <div className="flex flex-wrap gap-1">
                  {['#1677ff', '#10b981', '#f97316', '#dc2626', '#8b5cf6', '#06b6d4', '#eab308', '#64748b', '#ec4899', '#22c55e', '#f43f5e', '#0ea5e9'].map(
                    (c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCreateColor(c)}
                        className={cn(
                          'h-7 w-7 rounded-full ring-offset-1 transition-all',
                          createColor === c && 'ring-2 ring-primary',
                        )}
                        style={{ background: c }}
                      />
                    ),
                  )}
                </div>
              </div>
            </div>

            {createError && <p className="text-sm text-destructive">{createError}</p>}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={closeCreate} disabled={creating}>
              取消
            </Button>
            <Button onClick={submitCreate} disabled={creating} className="gap-1.5">
              <Plus className="h-4 w-4" />
              {creating ? '创建中…' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
