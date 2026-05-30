'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #020617 0%, #0F172A 50%, #020617 100%)' }}>

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-5"
          style={{ background: '#F97316', filter: 'blur(80px)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-5"
          style={{ background: '#F59E0B', filter: 'blur(80px)' }} />
      </div>

      <div className="w-full max-w-md relative">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black text-2xl mx-auto mb-4 shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
            SDC
          </div>
          <h1 className="text-3xl font-black text-white">SDC Manager</h1>
          <p className="text-sm mt-1" style={{ color: '#F97316' }}>Son Du Ciel Events</p>
          <div className="mt-3 inline-block text-xs text-slate-400 px-4 py-1.5 rounded-full"
            style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}>
            🏆 Le Spécial 51 Jours Chrono du Mondial 2026
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 shadow-2xl"
          style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(249,115,22,0.2)', backdropFilter: 'blur(20px)' }}>

          <h2 className="text-lg font-bold text-white mb-6 text-center">Connexion</h2>

          {error && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-lg text-red-400 text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-medium">Adresse email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="votre@email.com"
                className="sdc-input text-sm"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-medium">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="••••••••••"
                  className="sdc-input text-sm pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading || !email || !password}
              className="w-full sdc-btn-primary flex items-center justify-center gap-2 py-3 text-sm font-bold mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Se connecter
                </>
              )}
            </button>
          </div>

          <div className="mt-6 pt-4 border-t text-center" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <p className="text-xs text-slate-500">
              Accès réservé à l'équipe Son Du Ciel Events
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-6">
          SDC Manager v1.0 · Espace Pavageau, Ebimpé · Abidjan
        </p>
      </div>
    </div>
  )
}
