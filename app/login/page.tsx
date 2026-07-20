'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validación de dominio
    if (!email.toLowerCase().endsWith('@monitoring.cl')) {
      setError('Solo se permiten correos @monitoring.cl')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Correo o contraseña incorrectos.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ margin: '0 auto 12px' }}>
            <rect width="40" height="40" rx="8" fill="rgba(20,34,117,0.12)" />
            <path d="M8 28L12 16H28L32 28H8Z" fill="none" stroke="#142275" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="14" cy="30" r="2.5" fill="#fc9430" />
            <circle cx="26" cy="30" r="2.5" fill="#fc9430" />
            <path d="M12 22H28" stroke="#142275" strokeWidth="1.5" />
          </svg>
          <h1>Monitoring Admin</h1>
          <p>Control de Vehículos e Inspecciones</p>
        </div>

        {error && (
          <div className="login-error" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form className="login-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label required" htmlFor="email">
              Correo corporativo
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="usuario@monitoring.cl"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label required" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-action"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Ingresando…
              </>
            ) : (
              'Ingresar'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
