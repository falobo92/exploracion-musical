<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Exploración Musical (Atlas Sónico)

App web creada con **Vite + React + TypeScript + Tailwind 4** para descubrir música del mundo, reproducir resultados con YouTube y crear playlists.

## Requisitos

- Node.js 20+
- npm 10+

## Variables de entorno

Crea un archivo `.env.local`:

```bash
VITE_GEMINI_API_KEY=tu_api_key_de_gemini
VITE_GOOGLE_API_KEY=tu_api_key_de_youtube_data_api
VITE_GOOGLE_CLIENT_ID=tu_google_oauth_client_id
```

> [!IMPORTANT]
> En Vite, solo las variables `VITE_*` se exponen al cliente. **No uses secretos de backend** en este proyecto.

La app también permite guardar estas claves en `localStorage` desde el modal de ajustes para desarrollo local.

## Scripts

- `npm run dev` → entorno de desarrollo
- `npm run build` → build de producción
- `npm run preview` → preview local del build
- `npm run typecheck` → chequeo estático de TypeScript

## Ejecutar localmente

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Configura `.env.local` con tus claves.
3. Inicia la app:
   ```bash
   npm run dev
   ```

## Notas operativas

- Si falta `VITE_GEMINI_API_KEY` (o no se configura manualmente), la generación IA mostrará error y abrirá ajustes.
- Si falta `VITE_GOOGLE_API_KEY`, la reproducción/búsqueda de videos no podrá resolver `videoId`.
- Si falta `VITE_GOOGLE_CLIENT_ID`, no se podrá crear playlists en YouTube.
