require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const incidentsRoute = require('./routes/incidents');
const packetsRoute = require('./routes/packets');
const custodyRoute = require('./routes/custody');
const statsRoute = require('./routes/stats');
const leakRoute = require('./routes/leak');
const monitorRoute = require('./routes/monitor');

const app = express();

// CORS: sirf frontend se requests allow karo (dev + prod dono add kar sakti ho)
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    // 'https://your-deployed-frontend.com', // deploy karte waqt yahan add karo
  ],
}));

app.use(express.json());

// General rate limit: har IP se 100 requests / 15 min
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(generalLimiter);

app.use('/api/incidents', incidentsRoute);
app.use('/api/packets', packetsRoute);
app.use('/api/custody', custodyRoute);
app.use('/api/stats', statsRoute);
app.use('/api/leak', leakRoute);
app.use('/api/monitor', monitorRoute);

app.get('/', (req, res) => res.send('TraceExam API is running ✅'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));