# TraceExam Backend

Express + PostgreSQL API for TraceExam — serves exam paper-leak incident data,
and will host custody-chain and leak-detection endpoints as the project grows.

## Setup (pehli baar)

```bash
npm install
```

Fir `.env` file mein apna real database connection string daalo:

```
DATABASE_URL=postgresql://username:password@ep-xxxxx.neon.tech/neondb?sslmode=require
PORT=4000
```

(`.env.example` mein format dekh sakte ho — `.env` khud kabhi GitHub pe push nahi hota, `.gitignore` mein hai)

## Chalane Ke Liye

```bash
npm run dev
```

Ye chalega: `http://localhost:4000`

## Available Endpoints

| Route | Kya deta hai |
|---|---|
| `GET /` | Health check — "TraceExam API is running" |
| `GET /api/incidents` | Saare 174 incidents |
| `GET /api/incidents/demo` | Sirf 20 curated demo-worthy incidents |
| `GET /api/incidents/:id` | Ek specific incident (e.g. `/api/incidents/PL-0172`) |

## Aage Kya Add Hoga

- `POST /api/packets` — naya paper packet create karna (unique ID + canary phrase)
- `POST /api/custody` — QR scan se custody log entry add karna
- `GET /api/verify-chain/:packetId` — hash-chain verify karna
- `POST /api/leak-check` — OCR + canary match (leak detection)

## Team

- Priya Dubey — Team Lead / Backend & System Architecture
- Palak Tripathi — Data Integration, Docs
- Shambhavi Jha — Frontend & Dashboard Lead
- Sweta Singh — AI & ML Lead
