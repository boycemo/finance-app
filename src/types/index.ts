export type RecordType = 'income' | 'expense'

export interface FinanceRecord {
  id: string
  type: RecordType
  amount: number
  category: string
  date: string // YYYY-MM-DD
  note?: string
  createdAt: number
}

export interface Category {
  id: string
  name: string
  type: RecordType
  icon: string
  color: string
}

export interface MonthStat {
  month: string // YYYY-MM
  income: number
  expense: number
  balance: number
}

// 账户类型
//   cash: 货币资金（支付宝、银行卡、余额宝…）
//   investment: 投资账户（同花顺、股票账户、虚拟币…）
//   fund: 基金理财（基金、债券、养老金…）
//   credit: 信用账户（信用卡、花呗、借呗…）
//   receivable: 应收（别人欠你的、押金、保证金…）
//   payable: 应付（你欠别人的、贷款…）
//   other: 其他
export type AccountKind = 'cash' | 'investment' | 'fund' | 'credit' | 'receivable' | 'payable' | 'other'

// 账户（用户自定义项目：支付宝/京东金融/同花顺…）
export interface Account {
  id: string
  name: string
  kind: AccountKind
  icon: string
  color: string
  note?: string
  sortOrder: number
  archived: boolean
  createdAt: number
}

// 余额快照（某账户 / 某子账户在某天记录的余额）
export interface BalanceSnapshot {
  id: string
  accountId: string
  subAccountId?: string | null
  amount: number
  date: string // YYYY-MM-DD
  note?: string
  createdAt: number
}

// 子账户（小项目：余额宝 / 股票 / 基金…，挂在账户下，可开关）
export interface SubAccount {
  id: string
  accountId: string
  name: string
  icon: string
  color: string
  note?: string
  enabled: boolean
  sortOrder: number
  createdAt: number
}
