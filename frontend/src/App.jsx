import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import AppRoutes from './routes/AppRoutes'
import ErrorBoundary from './components/common/ErrorBoundary'

function App() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return undefined

    let cancelled = false

    const cleanupServiceWorkers = async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map((registration) => registration.unregister()))

        if ('caches' in window) {
          const cacheKeys = await caches.keys()
          await Promise.all(cacheKeys.map((key) => caches.delete(key)))
        }

        if (!cancelled) {
          console.log('[App] Cleared service workers and caches')
        }
      } catch (error) {
        console.warn('[App] Service worker cleanup skipped:', error)
      }
    }

    cleanupServiceWorkers()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <ErrorBoundary>
      <div className="light-theme">
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </div>
    </ErrorBoundary>
  )
}

export default App
