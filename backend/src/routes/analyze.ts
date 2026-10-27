import { Router, Request, Response } from 'express';
import { validateAnalyzeRequest } from '../schemas/analysis-schema';
import { executeAiAnalysis } from '../services/ai-provider';

export const analyzeRouter = Router();

// In-memory simple rate limiting: max 60 requests per minute per IP
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }
  if (record.count >= 60) {
    return false;
  }
  record.count++;
  return true;
}

analyzeRouter.post('/analyze', async (req: Request, res: Response): Promise<void> => {
  const clientIp = req.ip || 'anonymous';
  if (!checkRateLimit(clientIp)) {
    res.status(429).json({ error: 'Rate limit exceeded. Please try again in a minute.' });
    return;
  }

  const validation = validateAnalyzeRequest(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error });
    return;
  }

  try {
    const aiResult = await executeAiAnalysis(req.body);

    if (aiResult) {
      res.json({
        scanStatus: 'completed',
        analysisMode: 'ai',
        aiAvailable: true,
        summary: aiResult.summary,
        findings: aiResult.findings,
        categoriesDetected: Array.from(new Set(aiResult.findings.map((f: any) => f.categoryName || f.category))),
        recommendations: aiResult.recommendations,
        limitations: []
      });
    } else {
      // Graceful local rule fallback
      res.json({
        scanStatus: 'partial',
        analysisMode: 'rule',
        aiAvailable: false,
        summary: 'External AI model was not configured or timed out. Analysis performed via deterministic local engine.',
        findings: [],
        categoriesDetected: [],
        recommendations: [],
        limitations: ['AI contextual evaluation unavailable; ensure GEMINI_API_KEY is configured in backend.']
      });
    }
  } catch (err: any) {
    console.error('Analysis route error:', err);
    res.status(500).json({ error: 'Internal server error during analysis.' });
  }
});
