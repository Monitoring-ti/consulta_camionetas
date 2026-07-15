# Consulta Camionetas — Monitoring

Dos módulos independientes. Una base de datos Supabase compartida.

```
consulta_camionetas/
├── checklist/   ← Terreno: inspección ECF 4
└── admin/       ← Administración: flota, workers, historial
```

Repo: `git@github.com:Monitoring-ti/consulta_camionetas.git`

---

## 1. Checklist (terreno) — `checklist/`

| | |
|--|--|
| Propósito | Inspección ECF 4 en terreno |
| Acceso | RUT + patente (trabajadores / vehículos Monitoring) |
| Local | `cd checklist && npm run dev` → http://localhost:3000 |
| Responsive | Sí (móvil / tablet) |
| Features | Combustible opcional, fotos opcionales (izq→trasera→der→frontal), hallazgos, firma, aceptación, Apto/No apto |

Rutas: `/check`, `/check/inspeccion`  
**Sin** panel admin.

Env (`checklist/.env.local`):

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

SQL: `checklist/supabase/security.sql` + migración `nivel_combustible`.

---

## 2. Administración — `admin/`

| | |
|--|--|
| Propósito | Flota, QR, workers/docs, inspecciones, dashboard |
| Acceso | Login admin Monitoring (dominio / sesión protegida) |
| Local | `cd admin && npm run dev` → http://localhost:3001 |
| Features | Vehículos, trabajadores y vencimientos, historial de inspecciones (combustible + fotos) |

Rutas: `/login`, `/dashboard`, `/vehicles`, `/workers`, `/inspections`  
**Sin** wizard de checklist.

Env (`admin/.env.local`) — service role solo servidor:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # o publishable, según cliente SSR
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Deploy Vercel (2 proyectos)

| Proyecto | Root Directory | App |
|--|--|--|
| Checklist | `checklist` | terreno |
| Admin | `admin` | administración |

No desplegar apps del monorepo legacy `Check_list_camionetas` (`monitoring-checklist`, `monitoring-check-admin`, etc.).

---

## Orden recomendado de setup

1. SQL combustible + security checklist en Supabase  
2. `checklist`: env + deploy  
3. `admin`: env (service role) + deploy  
4. Smoke: RUT+patente → envío; login admin → ver inspección  
