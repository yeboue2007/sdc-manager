'use client'
import { Bell, Wifi, Battery } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function TopBar({ title }: { title: string }) {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4"
      style={{ background: 'rgba(2,6,23,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(249,115,22,0.1)' }}>
      <div className="flex items-center gap-3 lg:pl-0 pl-10">
        <h1 className="font-bold text-white text-lg">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-slate-400 text-sm hidden sm:block">{time}</span>
        <button className="relative p-2 rounded-lg hover:bg-slate-800 transition-colors">
          <Bell size={18} className="text-slate-400" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: '#F97316' }}></span>
        </button>
        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white"
          style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
          A
        </div>
      </div>
    </header>
  )
}
