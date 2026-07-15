# Admin — Consulta Camionetas (módulo 2)

Administración de flota, trabajadores e inspecciones.  
Sin wizard de checklist de terreno (eso es `../checklist`).

## Setup

```bash
cd admin
npm install
# .env.local con URL Supabase + SERVICE_ROLE (solo servidor)
npm run dev -- -p 3001
```

## Rutas

`/login` · `/dashboard` · `/vehicles` · `/workers` · `/inspections`

## Deploy

Root Directory Vercel: `admin`

Ver `../README.md`.
