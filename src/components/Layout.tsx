import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useData } from '../app'
import { useLocale } from '../i18n'
import { ICONS, Icon, Logo } from './ui'

function DemoBanner() {
  const { t, locale } = useLocale()
  const [hidden, setHidden] = useState(false)
  if (!__DEMO__ || hidden) return null
  return (
    <div id="demo-banner" role="note">
      <a href={locale === 'fa' ? '/fa/' : '/'}>{t('demo.banner')}</a>
      <button type="button" aria-label={t('demo.dismiss')} onClick={() => setHidden(true)}>
        ×
      </button>
    </div>
  )
}

export function Layout() {
  const { t, locale, setLocale } = useLocale()
  const { api } = useData()
  const items = [
    { to: '/', label: t('nav.dashboard'), icon: ICONS.dashboard, end: true },
    { to: '/employees', label: t('nav.employees'), icon: ICONS.people },
    { to: '/departments', label: t('nav.departments'), icon: ICONS.dept },
    { to: '/data', label: t('nav.data'), icon: ICONS.data },
  ]
  return (
    <div className="shell">
      <a href="#main" className="skip">
        {t('app.skip')}
      </a>
      <aside className="side">
        <div className="brand">
          <Logo />
          <span>{t('app.name')}</span>
        </div>
        <nav aria-label={t('nav.main')} className="nav">
          {items.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="nav-link">
              <Icon d={n.icon} />
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <span className="avatar avatar-md tint-0" aria-hidden="true">HR</span>
          <span className="side-who">
            <span className="side-name">{t('side.office')}</span>
            <span className="muted small">{t('side.local')}</span>
          </span>
          <button type="button" className="lang" lang={locale === 'fa' ? 'en' : 'fa'} onClick={() => setLocale(locale === 'fa' ? 'en' : 'fa')}>
            {t('lang.switch')}
          </button>
        </div>
      </aside>
      <main id="main" className="main" tabIndex={-1}>
        {api.storageBlocked && (
          <p className="notice" role="alert">
            {t('storage.blocked')}
          </p>
        )}
        <Outlet />
      </main>
      <DemoBanner />
    </div>
  )
}
