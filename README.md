# Cloud-Based Emergency Alert & Assistance System

College mini-project: SOS emergency alert system with user/responder/admin roles, GPS location, emergency contacts, AWS-ready notifications, incident tracking, live dashboard updates, history, and offline SOS queue.

## Stack
- Frontend: React + Vite + Leaflet
- Backend: Node.js + Express + Socket.IO
- Authentication: JWT + bcrypt
- Cloud database: AWS DynamoDB
- Notifications: AWS SNS (SMS) and optional SES email
- Local development fallback: JSON file database + notification console
- Maps: OpenStreetMap + Leaflet

## Project structure
```text
Cloud-Emergency-Alert-Assistance-System/
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── config.js
│   │   ├── db.js
│   │   ├── auth.js
│   │   ├── routes.js
│   │   └── notifications.js
│   ├── data/
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── api.js
│   │   └── styles.css
│   ├── index.html
│   ├── .env.example
│   └── package.json
└── docs/
    ├── architecture.md
    ├── api.md
    └── deployment.md
```

## 1. Run locally in VS Code

### Backend
```bash
cd backend
npm install
copy .env.example .env
npm run dev
```
Linux/macOS:
```bash
cp .env.example .env
npm run dev
```

Backend runs at `http://localhost:5000`.

### Frontend
Open another VS Code terminal:
```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```
Linux/macOS:
```bash
cp .env.example .env
npm run dev
```

Frontend normally runs at `http://localhost:5173`.

If AWS credentials are not configured, the app automatically uses the local JSON store and prints notifications in the backend terminal. This lets you demonstrate the complete workflow before connecting AWS.

## Demo accounts
The application creates demo accounts automatically on first backend start:
- User: `user@demo.com` / `User@123`
- Responder: `responder@demo.com` / `Responder@123`
- Admin: `admin@demo.com` / `Admin@123`

Change these passwords before any real deployment.

## Important
Browser GPS requires permission and normally works on `localhost` during development. For a deployed HTTPS site, GPS works through HTTPS.

For AWS mode, configure the variables in `backend/.env` and follow `docs/deployment.md`.
