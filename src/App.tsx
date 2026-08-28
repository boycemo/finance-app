import Dashboard from './components/Dashboard'
import { useRecords } from './hooks/useRecords'
import { useAssets } from './hooks/useAssets'
import { api } from './utils/api'
import { downloadJSON, isValidBackup, readJSONFile } from './utils/backup'
import dayjs from 'dayjs'

export default function App() {
  const {
    records,
    categories,
    loading,
    error,
    apiOnline,
    addRecord,
    updateRecord,
    deleteRecord,
    reload,
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

  const clearAll = async () => {
    await api.clearAll()
    await Promise.all([reload(), reloadAssets()])
  }

  const handleExportBackup = async () => {
    const data = await api.getBackup()
    downloadJSON(`finance-backup-${dayjs().format('YYYYMMDD-HHmmss')}.json`, data)
  }

  const handleImportBackup = async (file: File) => {
    const data = await readJSONFile(file)
    if (!isValidBackup(data)) {
      throw new Error('备份文件格式不正确')
    }
    await api.restoreBackup(data)
    await Promise.all([reload(), reloadAssets()])
  }

  return (
    <Dashboard
      records={records}
      categories={categories}
      loading={loading}
      error={error}
      apiOnline={apiOnline}
      onAdd={addRecord}
      onUpdate={updateRecord}
      onDelete={deleteRecord}
      onReload={reload}
      accounts={accounts}
      subAccounts={subAccounts}
      balances={balances}
      assetsLoading={assetsLoading}
      assetsError={assetsError}
      onAddAccount={addAccount}
      onUpdateAccount={updateAccount}
      onDeleteAccount={deleteAccount}
      onAddSubAccount={addSubAccount}
      onUpdateSubAccount={updateSubAccount}
      onDeleteSubAccount={deleteSubAccount}
      onReorderAccounts={reorderAccounts}
      onAddBalance={addBalance}
      onDeleteBalance={deleteBalance}
      onUpdateBalance={updateBalance}
      onBatchDeleteBalances={batchDeleteBalances}
      onBatchDeleteByDate={batchDeleteByDate}
      onBatchAddBalances={batchAddBalances}
      onClearAll={clearAll}
      onExportBackup={handleExportBackup}
      onImportBackup={handleImportBackup}
    />
  )
}
