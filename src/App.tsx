import Dashboard from './components/Dashboard'
import { AppDataProvider } from './context/DataContext'

export default function App() {
  return (
    <AppDataProvider>
      <Dashboard />
    </AppDataProvider>
  )
}
