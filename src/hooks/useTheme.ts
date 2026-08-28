import { useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'finance:theme'
// 默认 dark（用户要求"默认暗色模式"）
const DEFAULT_THEME: Theme = 'dark'

function readInitial(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'dark' || saved === 'light') return saved
  } catch {
    // ignore
  }
  return DEFAULT_THEME
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export function useTheme(): [Theme, () => void] {
  // 用一个特殊的 init 函数避免 hydration mismatch（首屏用 saved value）
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME)

  // 首次挂载时从 localStorage 读真实偏好
  useEffect(() => {
    const initial = readInitial()
    setTheme(initial)
    applyTheme(initial)
  }, [])

  const toggle = () => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // ignore
      }
      applyTheme(next)
      return next
    })
  }

  return [theme, toggle]
}
