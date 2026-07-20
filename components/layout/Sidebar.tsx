'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  {
    section: 'Principal',
    links: [
      {
        href: '/dashboard',
        label: 'Dashboard',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
        ),
      },
    ],
  },
  {
    section: 'Maestros',
    links: [
      {
        href: '/vehicles',
        label: 'Vehículos',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v9a2 2 0 01-2 2h-2" />
            <circle cx="7.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
          </svg>
        ),
      },
      {
        href: '/workers',
        label: 'Trabajadores',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        ),
      },
    ],
  },
  {
    section: 'Operaciones',
    links: [
      {
        href: '/inspections',
        label: 'Inspecciones',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
        ),
      },
    ],
  },
]

interface SidebarProps {
  userEmail?: string
}

export default function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [pinned, setPinned] = useState(false)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const collapse = useCallback(() => {
    if (!pinned) setExpanded(false)
  }, [pinned])

  useEffect(() => {
    if (!pinned) setExpanded(false)
  }, [pathname, pinned])

  useEffect(() => {
    return () => {
      if (leaveTimer.current) clearTimeout(leaveTimer.current)
    }
  }, [])

  function handleEnter() {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    setExpanded(true)
  }

  function handleLeave() {
    if (pinned) return
    leaveTimer.current = setTimeout(() => setExpanded(false), 180)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = userEmail
    ? userEmail.split('@')[0].slice(0, 2).toUpperCase()
    : 'AD'

  const isExpanded = expanded || pinned

  return (
    <aside
      className={`sidebar${isExpanded ? ' is-expanded' : ' is-collapsed'}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div className="sidebar-logo">
        <button
          type="button"
          className="sidebar-brand"
          title={pinned ? 'Desfijar menú' : 'Fijar menú abierto'}
          aria-label={pinned ? 'Desfijar menú' : 'Fijar menú abierto'}
          onClick={() => {
            setPinned(p => !p)
            setExpanded(true)
          }}
        >
          <span className="sidebar-brand-mark">M</span>
          <span className="sidebar-brand-text">
            <strong>Monitoring</strong>
            <small>Admin</small>
          </span>
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(section => (
          <div key={section.section} className="nav-section">
            <div className="nav-section-label">{section.section}</div>
            {section.links.map(link => {
              const active =
                pathname === link.href || pathname.startsWith(link.href + '/')
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link${active ? ' active' : ''}`}
                  title={link.label}
                  aria-label={link.label}
                  onClick={collapse}
                >
                  <span className="nav-link-icon">{link.icon}</span>
                  <span className="nav-link-label">{link.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info" title={userEmail ?? 'Administrador'}>
          <div className="user-avatar">{initials}</div>
          <div className="user-email">{userEmail ?? 'Administrador'}</div>
        </div>
        <button
          className="btn-logout"
          onClick={handleLogout}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="btn-logout-label">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}
