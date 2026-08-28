import type { BackupData } from './api'

// 下载 JSON 文件
export function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// 读取用户选择的 JSON 文件并解析
export function readJSONFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result))
        resolve(data as BackupData)
      } catch (err) {
        reject(new Error('文件不是有效的 JSON'))
      }
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsText(file, 'utf-8')
  })
}

// 校验备份文件结构
export function isValidBackup(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') return false
  const d = data as BackupData
  return (
    Array.isArray(d.categories) &&
    Array.isArray(d.accounts) &&
    Array.isArray(d.subAccounts) &&
    Array.isArray(d.records) &&
    Array.isArray(d.balances)
  )
}
