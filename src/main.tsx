import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// 在 React 挂载前应用主题，避免首屏闪一下浅色再切暗色
;(function applyInitialTheme() {
  try {
    const saved = localStorage.getItem('finance:theme')
    const theme = saved === 'light' ? 'light' : 'dark' // 默认 dark
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  } catch {
    document.documentElement.classList.add('dark')
  }
})()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
