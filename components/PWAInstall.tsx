'use client'

import { useEffect, useState } from 'react'
import { X, Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      console.log('[PWAInstall] Registering service worker...')
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWAInstall] Service worker registered successfully:', registration.scope)

          // Check for updates every hour
          setInterval(() => {
            registration.update()
              .then(() => console.log('[PWAInstall] Checked for service worker updates'))
              .catch((err) => console.error('[PWAInstall] Update check failed:', err))
          }, 60 * 60 * 1000)

          // Listen for service worker updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            console.log('[PWAInstall] New service worker found, installing...')

            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWAInstall] New service worker installed, will activate on next page load')
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('[PWAInstall] Service worker registration failed:', error)
        })
    } else {
      console.log('[PWAInstall] Service workers not supported in this browser')
    }

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone === true)

    setIsIOS(isIOSDevice)
    setIsStandalone(isInStandaloneMode)

    if (isIOSDevice && !isInStandaloneMode) {
      setTimeout(() => setShowInstallBanner(true), 3000)
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      if (!localStorage.getItem('pwa-install-dismissed')) {
        setTimeout(() => setShowInstallBanner(true), 3000)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setShowInstallBanner(false)
    }
  }

  const handleDismiss = () => {
    setShowInstallBanner(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  if (!showInstallBanner || isStandalone) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 animate-slide-up">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
          <Download className="w-6 h-6 text-blue-600" />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">Install EstatePro</h3>
          {isIOS ? (
            <div className="text-sm text-gray-600 space-y-2">
              <p>Install this app on your iPhone:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Tap the share button <span className="inline-block w-4 h-4 align-middle">⬆️</span></li>
                <li>Scroll down and tap &quot;Add to Home Screen&quot;</li>
                <li>Tap &quot;Add&quot;</li>
              </ol>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-3">
                Get quick access to EstatePro right from your home screen
              </p>
              <button
                onClick={handleInstallClick}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Install App
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
