import { useEffect, useState } from 'react'

// 简单 localStorage 包装：存/读/删 JSON
const PREFIX = 'finance:draft:'

export function saveDraft<T>(key: string, data: T) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(data))
  } catch {
    // 静默失败（localStorage 不可用、容量满等）
  }
}

export function loadDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // ignore
  }
}

// 把草稿装入 state 的 hook：初次渲染时从 localStorage 读，之后只更 state。
export function useDraftedState<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial
    return loadDraft<T>(key) ?? initial
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    // 只有非空才写，避免覆盖
    if (value !== null && value !== undefined) saveDraft(key, value)
  }, [key, value])

  return [value, setValue]
}
