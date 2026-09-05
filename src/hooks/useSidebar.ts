import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'finance:sidebar-collapsed'
// 默认展开（宽屏优先，首次使用能看到完整导航）
const DEFAULT_COLLAPSED = false

function readInitial(): boolean {
  if (typeof window === 'undefined') return DEFAULT_COLLAPSED
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'true') return true
    if (saved === 'false') return false
  } catch {
    // localStorage 不可用（隐私模式等）时静默降级
  }
  return DEFAULT_COLLAPSED
}

/**
 * 侧边栏折叠状态（持久化到 localStorage）
 * 首屏用默认值渲染，挂载后再读真实偏好，避免 SSR/首帧闪烁与布局跳动
 */
export function useSidebar(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState<boolean>(DEFAULT_COLLAPSED)

  useEffect(() => {
    setCollapsed(readInitial())
  }, [])

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  return [collapsed, toggle]
}
