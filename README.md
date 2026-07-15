# Consulta Camionetas — Monitoring

Dos módulos independientes. Repo: `git@github.com:Monitoring-ti/consulta_camionetas.git`

```
consulta_camionetas/
├── checklist/     ← Terreno (inspección ECF 4)
├── app/ …         ← Administración (raíz del repo = módulo admin)
├── package.json   ← admin
└── README.md
```

Base de datos Supabase compartida.

---

## 1. Checklist (terreno) — `checklist/`

| | |
|--|--|
| Propósito | Inspección ECF 4 en terreno |
| Acceso | RUT + patente |
| Local | `cd checklist && npm run dev` → :3000 |
| Features | Combustible opcional, fotos opcionales (izq→trasera→der→frontal), hallazgos, firma, aceptación, Apto/No apto, PWA |

Rutas: `/check`, `/check/inspeccion`  
**Sin** panel admin.

Env: `checklist/.env.local` → `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
SQL: `checklist/supabase/security.sql` + migración `nivel_combustible`

### Deploy Vercel (checklist)

- Proyecto: `monitoring-checklist` (o similar)
- **Root Directory: `checklist`**
- Prod: https://monitoring-checklist.vercel.app

---

## 2. Administración — raíz del repo

| | |
|--|--|
| Propósito | Flota, QR, workers/docs, inspecciones, dashboard |
| Acceso | Login admin Monitoring |
| Local | `npm run dev` → :3000 (o `:3001`) |
| Features | Vehículos, trabajadores y vencimientos, historial (combustible + fotos) |

Rutas: `/login`, `/dashboard`, `/vehicles`, `/workers`, `/inspections`

Env: `.env.local` con URL + **`SUPABASE_SERVICE_ROLE_KEY`** (solo servidor)

### Deploy Vercel (admin)

- Proyecto: `monitoring-admin`
- **Root Directory: `.`** (raíz)
- Prod: https://monitoring-admin-sigma.vercel.app

---

## Setup rápido

```bash
# Admin
npm install && npm run dev

# Checklist
cd checklist && npm install && npm run dev
```

## Smoke

1. Checklist: RUT + patente → completar → enviar  
2. Admin: login → ver inspección con combustible  
