import type { Category, FinanceRecord } from '../types'

// CSV 字段转义：含逗号/引号/换行的字段用双引号包裹，内部双引号转义为两个
const escape = (val: string | number): string => {
  const s = String(val ?? '')
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function exportRecordsToCSV(
  records: FinanceRecord[],
  categories: Category[],
): string {
  const catMap = new Map(categories.map((c) => [c.id, c]))
  const header = ['日期', '类型', '分类', '金额', '备注']
  const rows = records
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((r) => {
      const cat = catMap.get(r.category)
      return [
        r.date,
        r.type === 'income' ? '收入' : '支出',
        cat?.name ?? '未分类',
        r.amount.toFixed(2),
        r.note ?? '',
      ].map(escape).join(',')
    })
  // 加 BOM，让 Excel 正确识别 UTF-8
  return '\uFEFF' + [header.join(','), ...rows].join('\r\n')
}

export function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
