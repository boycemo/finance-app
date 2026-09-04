import { createContext, useCallback, useContext, type ReactNode } from 'react'
import dayjs from 'dayjs'
import { useRecords } from '../hooks/useRecords'
import { useAssets } from '../hooks/useAssets'
import { api } from '../utils/api'
import { downloadJSON, isValidBackup, readJSONFile } from '../utils/backup'

/**
 * 全局数据上下文：收拢 records / assets 两块状态与全部操作。
 * 任何组件通过 useAppData() 直接订阅，消除 App → Dashboard → 子组件 的 props drilling。
 */
export interface AppData {
  // ===== 记录（收支） =====
  records: ReturnType<typeof useRecords>['records']
  categories: ReturnType<typeof useRecords>['categories']
  recordsLoading: boolean
  recordsError: string | null
  apiOnline: boolean
  addRecord: ReturnType<typeof useRecords>['addRecord']
  updateRecord: ReturnType<typeof useRecords>['updateRecord']
  deleteRecord: ReturnType<typeof useRecords>['deleteRecord']
  reloadRecords: () => Promise<void>
  // ===== 资产（账户 / 子账户 / 余额） =====
  accounts: ReturnType<typeof useAssets>['accounts']
  subAccounts: ReturnType<typeof useAssets>['subAccounts']
  balances: ReturnType<typeof useAssets>['balances']
  assetsLoading: boolean
  assetsError: string | null
  addAccount: ReturnType<typeof useAssets>['addAccount']
  updateAccount: ReturnType<typeof useAssets>['updateAccount']
  deleteAccount: ReturnType<typeof useAssets>['deleteAccount']
  reorderAccounts: ReturnType<typeof useAssets>['reorderAccounts']
  addSubAccount: ReturnType<typeof useAssets>['addSubAccount']
  updateSubAccount: ReturnType<typeof useAssets>['updateSubAccount']
  deleteSubAccount: ReturnType<typeof useAssets>['deleteSubAccount']
  addBalance: ReturnType<typeof useAssets>['addBalance']
  batchAddBalances: ReturnType<typeof useAssets>['batchAddBalances']
  updateBalance: ReturnType<typeof useAssets>['updateBalance']
  deleteBalance: ReturnType<typeof useAssets>['deleteBalance']
  batchDeleteBalances: ReturnType<typeof useAssets>['batchDeleteBalances']
  batchDeleteByDate: ReturnType<typeof useAssets>['batchDeleteByDate']
  reloadAssets: () => Promise<void>
  // ===== 全局操作 =====
  clearAll: () => Promise<void>
  exportBackup: () => Promise<void>
  importBackup: (file: File) => Promise<void>
}

const DataContext = createContext<AppData | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const {
    records,
    categories,
    loading: recordsLoading,
    error: recordsError,
    apiOnline,
    addRecord,
    updateRecord,
    deleteRecord,
    reload: reloadRecords,
  } = useRecords()

  const {
    accounts,
    subAccounts,
    balances,
    loading: assetsLoading,
    error: assetsError,
    addAccount,
    updateAccount,
    deleteAccount,
    reorderAccounts,
    addSubAccount,
    updateSubAccount,
    deleteSubAccount,
    addBalance,
    batchAddBalances,
    updateBalance,
    deleteBalance,
    batchDeleteBalances,
    batchDeleteByDate,
    reload: reloadAssets,
  } = useAssets()

  const clearAll = useCallback(async () => {
    await api.clearAll()
    await Promise.all([reloadRecords(), reloadAssets()])
  }, [reloadRecords, reloadAssets])

  const exportBackup = useCallback(async () => {
    const data = await api.getBackup()
    downloadJSON(`finance-backup-${dayjs().format('YYYYMMDD-HHmmss')}.json`, data)
  }, [])

  const importBackup = useCallback(
    async (file: File) => {
      const data = await readJSONFile(file)
      if (!isValidBackup(data)) {
        throw new Error('备份文件格式不正确')
      }
      await api.restoreBackup(data)
      await Promise.all([reloadRecords(), reloadAssets()])
    },
    [reloadRecords, reloadAssets],
  )

  const value: AppData = {
    records,
    categories,
    recordsLoading,
    recordsError,
    apiOnline,
    addRecord,
    updateRecord,
    deleteRecord,
    reloadRecords,
    accounts,
    subAccounts,
    balances,
    assetsLoading,
    assetsError,
    addAccount,
    updateAccount,
    deleteAccount,
    reorderAccounts,
    addSubAccount,
    updateSubAccount,
    deleteSubAccount,
    addBalance,
    batchAddBalances,
    updateBalance,
    deleteBalance,
    batchDeleteBalances,
    batchDeleteByDate,
    reloadAssets,
    clearAll,
    exportBackup,
    importBackup,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useAppData(): AppData {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useAppData 必须在 <AppDataProvider> 内使用')
  return ctx
}
