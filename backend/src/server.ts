import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { analyzeRouter } from './routes/analyze';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ClearChoice AI Backend',
    timestamp: Date.now(),
    aiConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.AI_API_KEY)
  });
});

app.use('/api', analyzeRouter);

app.listen(PORT, () => {
  console.log(`ClearChoice AI backend server listening on port ${PORT}`);
});

export default app;
