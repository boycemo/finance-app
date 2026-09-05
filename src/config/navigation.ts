import { Landmark, NotebookPen, type LucideIcon } from 'lucide-react'

/** 顶级视图（路由第一段） */
export type ViewTab = 'assets' | 'records'

/** 顶级菜单项定义 */
export interface NavItem {
  key: ViewTab
  label: string
  desc: string
  icon: LucideIcon
  /** 顶级路径 */
  path: ViewTab
}

/**
 * 菜单 / 路由配置（集中定义，Sidebar 渲染、Dashboard 路由解析共用）
 * - 「账户余额」为第一项（资产总览 / 批量录入 / 账户列表 / 余额报表合并在同一页面内展示）；
 * - 「收支记账」为第二项，路径/图标/文案不变。
 */
export const NAV_ITEMS: NavItem[] = [
  {
    key: 'assets',
    label: '账户余额',
    desc: '资产 · 账户 · 报表',
    icon: Landmark,
    path: 'assets',
  },
  {
    key: 'records',
    label: '收支记账',
    desc: '流水 · 分类 · 趋势',
    icon: NotebookPen,
    path: 'records',
  },
]

/** 解析 hash 路径 → 视图（非法值回退默认 assets） */
export function parseRoute(hash: string): ViewTab {
  // '#/records' → 'records'
  const seg = hash.replace(/^#\/?/, '').split('/')[0]
  return seg === 'records' ? 'records' : 'assets'
}

/** 视图 → hash 路径 */
export function buildRoute(view: ViewTab): string {
  return view === 'assets' ? '#/assets' : '#/records'
}
