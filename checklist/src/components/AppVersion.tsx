import { APP_VERSION } from '@/lib/version';

export default function AppVersion() {
  return <span className="app-version">v{APP_VERSION}</span>;
}
