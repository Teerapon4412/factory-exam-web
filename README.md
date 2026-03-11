# Factory Exam Web

Full-stack exam system with React, Express, and SQLite persistence.

## Local development

```bash
npm install
npm run dev
```

- Frontend dev server: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:4000`

## Production server

```bash
npm run build
npm run server
```

## Deploy on Render

This repo includes [render.yaml](./render.yaml) for deployment on Render.

Important notes:
- The app uses SQLite, so it needs a persistent disk in production.
- The Render blueprint mounts the disk at `/opt/render/project/src/data`.
- The database file will be stored as `factory-exam.sqlite` inside that mounted path.
- SQLite + persistent disk should run as a single instance.

### Steps

1. Push this repo to GitHub.
2. In Render, choose `New +` -> `Blueprint`.
3. Connect this repository.
4. Render will detect `render.yaml`.
5. Review the web service settings and create the service.
6. After deploy finishes, open the Render service URL.

### Persistence

Exam bank and results are stored through the API in SQLite, so all users who open the deployed URL will see the same shared data.
