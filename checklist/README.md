# Checklist terreno — ECF 4 (módulo 1 de consulta_camionetas)

Ingreso con **RUT + patente**. Sin administración.

## Setup

```bash
cd checklist
cp .env.example .env.local   # completar URL + anon key
npm install
npm run dev                  # http://localhost:3000
```

## Features

- Wizard ECF 4 / SIGO (responsive)
- Nivel de combustible opcional (1/8 → FULL)
- Fotos generales opcionales: Lateral Izquierdo → Trasera → Lateral Derecho → Frontal
- Hallazgos con foto, firma digital, aceptación de envío
- Resultado Apto / No Apto (ítems bloqueantes)

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/check` | Acceso RUT + patente |
| `/check/inspeccion` | Checklist |

## Deploy

Root Directory Vercel: `checklist`

Ver `../README.md` para arquitectura de los 2 módulos.
