'use client'
import { useEffect, useState } from 'react'
import { Download, X, Smartphone } from 'lucide-react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Déjà installé ?
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }

    // iOS detection
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(ios)

    // Android/Desktop : écouter l'événement beforeinstallprompt
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS : montrer guide si pas encore installé
    if (ios && !localStorage.getItem('sdc-ios-prompt-dismissed')) {
      setTimeout(() => setShowBanner(true), 2000)
    }

    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setShowBanner(false)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (isIOS) {
      setShowIOSGuide(true)
      return
    }
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setShowBanner(false)
    setDeferredPrompt(null)
  }

  function dismiss() {
    setShowBanner(false)
    if (isIOS) localStorage.setItem('sdc-ios-prompt-dismissed', '1')
  }

  if (installed || !showBanner) return null

  return (
    <>
      {/* Bandeau principal */}
      <div className="mx-6 mb-4 rounded-xl p-4 flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(234,88,12,0.1))', border: '1px solid rgba(249,115,22,0.35)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
          <Smartphone size={20} color="white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white text-sm">Installer SDC Manager</div>
          <div className="text-xs text-slate-400 mt-0.5">
            {isIOS ? 'Ajoutez l\'app sur votre écran d\'accueil iOS' : 'Installez l\'app sur votre appareil pour un accès rapide'}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={handleInstall}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
            <Download size={13} />
            Installer
          </button>
          <button onClick={dismiss} className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Guide iOS */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: '#1E293B', border: '1px solid rgba(249,115,22,0.3)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">Installer sur iPhone / iPad</h3>
              <button onClick={() => setShowIOSGuide(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              {[
                { step: '1', icon: '📤', text: 'Appuyez sur le bouton Partager en bas de Safari' },
                { step: '2', icon: '➕', text: 'Faites défiler et tapez « Sur l\'écran d\'accueil »' },
                { step: '3', icon: '✅', text: 'Appuyez sur « Ajouter » en haut à droite' },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                    style={{ background: '#F97316' }}>{s.step}</div>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="text-xl">{s.icon}</span>
                    <span>{s.text}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 p-3 rounded-xl text-center text-xs text-slate-400"
              style={{ background: 'rgba(249,115,22,0.08)' }}>
              L'app apparaîtra comme une vraie application sur votre écran d'accueil 🎉
            </div>
            <button onClick={() => { setShowIOSGuide(false); dismiss() }}
              className="w-full mt-4 py-2.5 rounded-xl font-bold text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
              J'ai compris !
            </button>
          </div>
        </div>
      )}
    </>
  )
}
