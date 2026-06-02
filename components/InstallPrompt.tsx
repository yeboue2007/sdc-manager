'use client'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true); return
    }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(ios)
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); setShowBanner(true) }
    window.addEventListener('beforeinstallprompt', handler)
    if (ios && !localStorage.getItem('sdc-ios-dismissed')) {
      setTimeout(() => setShowBanner(true), 2000)
    }
    window.addEventListener('appinstalled', () => { setInstalled(true); setShowBanner(false) })
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (isIOS) { setShowIOSGuide(true); return }
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setShowBanner(false); setDeferredPrompt(null)
  }

  function dismiss() {
    setShowBanner(false)
    if (isIOS) localStorage.setItem('sdc-ios-dismissed', '1')
  }

  if (installed || !showBanner) return null

  return (
    <>
      {/* Bandeau */}
      <div style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 12, padding: '14px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#F97316,#EA580C)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 14, flexShrink: 0 }}>
          SDC
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 13 }}>Installer SDC Manager</div>
          <div style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>
            {isIOS ? 'Ajoutez l\'app sur votre écran d\'accueil' : 'Accès rapide depuis votre appareil'}
          </div>
        </div>
        <button onClick={handleInstall}
          style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
          Installer
        </button>
        <button onClick={dismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4, flexShrink: 0 }}>
          <X size={16} />
        </button>
      </div>

      {/* Guide iOS */}
      {showIOSGuide && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.7)' }}>
          <div style={{ width: '100%', maxWidth: 400, background: '#1E293B', borderRadius: 20, padding: 24, border: '1px solid rgba(249,115,22,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 16 }}>Installer sur iPhone / iPad</span>
              <button onClick={() => setShowIOSGuide(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={20} /></button>
            </div>
            {[
              { step: '1', icon: '📤', text: 'Appuyez sur le bouton Partager en bas de Safari' },
              { step: '2', icon: '➕', text: 'Faites défiler et tapez « Sur l\'écran d\'accueil »' },
              { step: '3', icon: '✅', text: 'Appuyez sur « Ajouter » en haut à droite' },
            ].map(s => (
              <div key={s.step} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 13, flexShrink: 0 }}>
                  {s.step}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#CBD5E1', fontSize: 14, paddingTop: 4 }}>
                  <span style={{ fontSize: 20 }}>{s.icon}</span>
                  <span>{s.text}</span>
                </div>
              </div>
            ))}
            <div style={{ background: 'rgba(249,115,22,0.08)', borderRadius: 8, padding: 12, marginBottom: 16, color: '#94A3B8', fontSize: 12, textAlign: 'center' }}>
              L'app apparaîtra comme une vraie application sur votre écran d'accueil 🎉
            </div>
            <button onClick={() => { setShowIOSGuide(false); dismiss() }}
              style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg,#F97316,#EA580C)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              J'ai compris !
            </button>
          </div>
        </div>
      )}
    </>
  )
}
