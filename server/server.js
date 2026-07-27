require('dotenv').config();
const express = require('express');
const cors = require('cors');
const incidentsRoute = require('./routes/incidents');
const packetsRoute = require('./routes/packets');
const custodyRoute = require('./routes/custody');
const statsRoute = require('./routes/stats');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/incidents', incidentsRoute);
app.use('/api/packets', packetsRoute);
app.use('/api/custody', custodyRoute);
app.use('/api/stats', statsRoute);

app.get('/', (req, res) => res.send('TraceExam API is running ✅'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

