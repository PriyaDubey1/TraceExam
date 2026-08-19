# TraceExam

**From Press to Paper to Public — Nobody Leaks. Nobody Hides.**

An AI-powered exam-paper-leak prevention and public-accountability system, built for a national-level hackathon.

**Team TechMates:** Priya Dubey · Palak Tripathi · Shambhavi Jha · Sweta Singh

---

## What It Does

TraceExam has two core functions:

1. **Prevention** — tracks exam papers through a tamper-evident custody chain (press → warehouse → transport → exam centre) using SHA-256 hash chaining, so any tampering in the physical handoff process is instantly detectable.
2. **Accountability** — an AI pipeline (OCR + LLM) automatically detects suspected leaks from uploaded files or social-media chatter, traces them back to a custody stage, and publishes a public case file.

## Live Demo Flow

The core "wow moment" of the product, in order:

1. **Log custody scans** on `/scan` as a packet moves through press → warehouse → transport → exam centre
2. **Verify the chain** on `/dashboard` — instantly confirms whether the custody chain is intact or has been tampered with
3. **Upload a leak-containing file** on `/report-leak` — the AI pipeline OCRs the file, checks it against canary phrases, traces it back to the responsible custody stage, and classifies it with Groq AI
4. **See the incident go public** on `/public` — a new case automatically appears on the public accountability dashboard

## Tech Stack

**Frontend**
- React + Vite, React Router
- Design system: charcoal (`#1A1A1A`) + orange (`#FF5D1F`) accent, off-white (`#F7F7F5`) background
- `lucide-react` for icons
- GSAP (`@gsap/react`) for entrance/transition animations
- Vanta.js for the animated hero background
- Lenis for smooth scrolling
- Dark mode throughout

**Backend**
- Node.js + Express
- PostgreSQL (hosted on [Neon](https://neon.tech))
- Groq API (LLM) for leak classification
- Tesseract.js for OCR
- `multer`, `pdf-parse`, `officeparser`, `pdf2pic` for file handling
- `express-rate-limit` for abuse protection

## Project Structure

```
TraceExam/
├── src/                       # React frontend
│   ├── components/             # Sidebar, Skeleton, etc.
│   ├── context/                 # Theme + Toast providers
│   ├── layouts/                  # MainLayout
│   └── pages/                     # Home, PublicDashboard, ScanCustody,
│                                    VerifyChain, ReportLeak, MonitorFeed
└── server/                     # Express backend
    ├── routes/                  # incidents, packets, custody, stats, leak, monitor
    ├── db.js                     # PostgreSQL connection (Neon)
    └── server.js                  # App entry point
```

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/stats` | Dashboard summary numbers |
| GET | `/api/incidents` / `/api/incidents/demo` | Incident data |
| POST | `/api/packets` | Create packet + QR code |
| GET | `/api/packets/:id` | Packet + custody trail |
| GET | `/api/packets/:id/verify` | Tamper-check the hash chain |
| POST | `/api/custody` | Log a custody scan |
| POST | `/api/leak/report-file` | Upload file → OCR → canary match → Groq AI classification → auto-incident |
| GET | `/api/monitor/feed` | Simulated social-media posts |
| POST | `/api/monitor/scan` | Scan feed for canary-phrase matches |

## Security Measures

- Parameterized SQL queries throughout (no injection risk)
- Rate limiting: 100 req/15min globally, 10 req/15min on the costly AI leak-detection endpoint
- File upload restricted to 15MB and to specific MIME types (JPG, PNG, PDF, PPTX, DOCX)
- CORS locked to the frontend origin only
- Input validation on all write endpoints
- Generic error messages returned to clients (details logged server-side only)
- Secrets (`DATABASE_URL`, `GROQ_API_KEY`) kept in `.env`, excluded from git

## Setup Instructions

You'll need **two terminals** running at the same time.

### 1. Clone and install

```bash
git clone https://github.com/PriyaDubey1/TraceExam.git
cd TraceExam
npm install
cd server
npm install
```

### 2. Environment variables

Create a `server/.env` file with:

```
DATABASE_URL=your_neon_postgres_connection_string
GROQ_API_KEY=your_groq_api_key
PORT=4000
```

### 3. Run the backend

```bash
cd server
npm run dev
# runs on http://localhost:4000
```

### 4. Run the frontend (in a second terminal)

```bash
cd TraceExam
npm run dev
# runs on http://localhost:5173
```

### 5. Open the app

Visit `http://localhost:5173` in your browser.

## Database

The `incidents` table ships with 174 real, researched exam-leak cases from 2004–2026 (20 flagged as `is_demo_seed = true` for the live demo), plus `packets`, `custody_logs`, and `social_feed` tables for the custody-chain and monitoring simulation.

---

*Built in a hackathon sprint. Feedback and contributions welcome.*git add README.md
git commit -m "Add comprehensive README for judges"
git push origin main