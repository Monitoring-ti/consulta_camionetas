import type { ReactNode } from 'react';
import AppVersion from '@/components/AppVersion';

interface AppHeaderProps {
  subtitle?: string;
  badge?: ReactNode;
}

export default function AppHeader({ subtitle, badge }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="app-header-brand">
          <img
            src="/branding/logo-banner.svg"
            alt="Monitoring — Gestión de Activos"
            className="app-logo-banner"
          />
          {subtitle ? <p className="app-subtitle">{subtitle}</p> : null}
        </div>
        <div className="app-header-badges">
          <AppVersion />
          {badge}
        </div>
      </div>
    </header>
  );
}
