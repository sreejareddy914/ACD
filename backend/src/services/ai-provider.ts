import dotenv from 'dotenv';
import { AnalyzeRequest } from '../schemas/analysis-schema';
import { buildAnalysisPrompt } from './prompt-builder';

// Safely load environment configuration from .env
dotenv.config();

export interface AiAnalysisResult {
  summary: string;
  findings: any[];
  recommendations: string[];
  aiProviderUsed?: string;
}

/**
 * Sanitizes log messages to ensure API keys, tokens, and authorization headers are never logged.
 */
export function sanitizeError(msg: any): string {
  if (!msg) return '';
  let str = typeof msg === 'string' ? msg : (msg.message || JSON.stringify(msg));
  const secrets = [
    process.env.GEMINI_API_KEY,
    process.env.GROQ_API_KEY,
    process.env.AI_API_KEY
  ].filter(Boolean) as string[];

  for (const s of secrets) {
    if (s.length >= 6) {
      str = str.split(s).join('[REDACTED]');
    }
  }
  return str
    .replace(/key=[^&\s]+/gi, 'key=[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, 'Bearer [REDACTED]')
    .replace(/gsk_[A-Za-z0-9]+/gi, '[REDACTED]');
}

/**
 * Parses and validates raw JSON output from either Gemini or Groq into the internal format expected
 * by the ClearChoice AI analysis pipeline and browser extension.
 */
export function parseAndSanitizeAiResponse(
  rawText: string,
  providerName: 'Gemini' | 'Groq',
  modelName: string
): AiAnalysisResult | null {
  try {
    let cleanText = rawText.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }

    const parsed = JSON.parse(cleanText);

    // Helper to infer category if missing or generic
    const inferCategory = (str: string): string => {
      const s = str.toLowerCase();
      if (/hurry|urgent|expire|timer|countdown|ending|today only|last chance/i.test(s)) return 'urgency';
      if (/stock|left|few|only \d+|demand|selling|gone|almost sold/i.test(s)) return 'scarcity';
      if (/discount|save|off|was|mrp|strike|deal|markdown|phantom/i.test(s)) return 'discounts';
      if (/fee|charge|surcharge|hidden|drip|handling|convenience/i.test(s)) return 'hidden_charges';
      if (/download|stream|watch|play|ad|torrent|magnet|sponsor|fake button/i.test(s)) return 'disguised_ads';
      if (/people|bought|viewing|customer|trending|popular/i.test(s)) return 'social_proof';
      if (/sign|account|login|register|wall|guest/i.test(s)) return 'forced_signup';
      if (/cancel|unsubscribe|call|retention/i.test(s)) return 'cancellation';
      return 'other_patterns';
    };

    const inferCategoryName = (cat: string): string => {
      switch (cat) {
        case 'urgency': return 'Fake Urgency';
        case 'scarcity': return 'Fake Scarcity';
        case 'discounts': return 'Misleading Discounts';
        case 'hidden_charges': return 'Hidden Charges & Drip Pricing';
        case 'disguised_ads': return 'Disguised Advertisements';
        case 'social_proof': return 'Social Proof Manipulation';
        case 'forced_signup': return 'Forced Sign-Up';
        case 'cancellation': return 'Difficult Cancellation (Roach Motel)';
        default: return 'Deceptive Design Pattern';
      }
    };

    // Extract raw findings list from various LLM structures
    let rawList: any[] = [];
    if (Array.isArray(parsed.findings)) {
      rawList = parsed.findings;
    } else if (parsed.findings && typeof parsed.findings === 'object') {
      if (Array.isArray(parsed.findings.indicators)) {
        rawList = parsed.findings.indicators;
      } else if (Array.isArray(parsed.findings.items)) {
        rawList = parsed.findings.items;
      } else {
        rawList = Object.values(parsed.findings).filter(v => typeof v === 'string' || typeof v === 'object');
      }
    } else if (Array.isArray(parsed.patterns)) {
      rawList = parsed.patterns;
    } else if (Array.isArray(parsed.deceptivePatterns)) {
      rawList = parsed.deceptivePatterns;
    }

    // Validate and sanitize AI findings according to ClearChoice AI standards
    const validFindings: any[] = [];
    for (const f of rawList) {
      if (!f) continue;
      
      if (typeof f === 'string') {
        const cat = inferCategory(f);
        validFindings.push({
          id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          category: cat,
          categoryName: inferCategoryName(cat),
          title: f.length > 80 ? f.slice(0, 80) + '...' : f,
          severity: 'medium',
          confidence: 75,
          classification: 'potential_dark_pattern',
          evidenceStrength: 'limited',
          verificationStatus: 'observed',
          evidence: f.slice(0, 300),
          whyFlagged: f.slice(0, 300),
          detectionMethod: 'ai',
          recommendedAction: 'Carefully inspect page terms and compare options independently before proceeding.',
          supportingEvidence: [f],
          contradictoryEvidence: [],
          missingEvidence: [],
          limitations: [`Evaluated by ${providerName} AI based on extracted webpage content.`]
        });
        continue;
      }

      if (typeof f === 'object') {
        const title = f.title || f.name || f.pattern || f.heading || (typeof f.evidence === 'string' ? f.evidence.slice(0, 60) : 'Deceptive Interface Pattern');
        const evidence = f.evidence || f.text || f.observedValue || f.quote || f.description || title;
        const cat = f.category && f.category !== 'other_patterns' ? f.category : inferCategory(`${title} ${evidence}`);

        validFindings.push({
          id: f.id || `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          category: cat,
          categoryName: f.categoryName || inferCategoryName(cat),
          title: String(title).slice(0, 120),
          severity: ['informational', 'low', 'medium', 'high', 'critical'].includes(f.severity) ? f.severity : 'medium',
          confidence: typeof f.confidence === 'number' ? Math.max(0, Math.min(100, f.confidence)) : 75,
          classification: ['verified_deceptive', 'strong_evidence', 'potential_dark_pattern', 'insufficient_evidence'].includes(f.classification)
            ? f.classification
            : 'potential_dark_pattern',
          evidenceStrength: ['conclusive', 'strong', 'limited', 'insufficient'].includes(f.evidenceStrength)
            ? f.evidenceStrength
            : 'limited',
          verificationStatus: ['verified', 'observed', 'unverified', 'unsupported'].includes(f.verificationStatus)
            ? f.verificationStatus
            : 'observed',
          evidence: String(evidence).slice(0, 300),
          whyFlagged: String(f.whyFlagged || f.reason || f.description || `Manipulative pattern detected by ${providerName} AI model.`).slice(0, 300),
          detectionMethod: 'ai',
          recommendedAction: String(f.recommendedAction || f.action || 'Review terms carefully before proceeding.').slice(0, 250),
          elementId: f.elementId ? String(f.elementId) : undefined,
          supportingEvidence: Array.isArray(f.supportingEvidence) ? f.supportingEvidence : [String(evidence)],
          contradictoryEvidence: Array.isArray(f.contradictoryEvidence) ? f.contradictoryEvidence : [],
          missingEvidence: Array.isArray(f.missingEvidence) ? f.missingEvidence : [],
          limitations: Array.isArray(f.limitations)
            ? f.limitations
            : [`Evaluated by ${providerName} AI based on extracted text.`]
        });
      }
    }

    return {
      summary: parsed.summary || 'Contextual analysis completed.',
      findings: validFindings,
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      aiProviderUsed: `${providerName} (${modelName})`
    };
  } catch (err: any) {
    console.warn(`[ClearChoice AI Provider] Failed to parse response from ${providerName} (${modelName}):`, sanitizeError(err.message));
    return null;
  }
}

/**
 * Main AI analysis executor.
 * Gemini is the primary provider. If Gemini fails (timeout, unavailable model, rate limit, API error),
 * Groq is called as the fallback provider. If both fail or neither is configured, returns null to trigger
 * the deterministic local rule-based fallback.
 */
export async function executeAiAnalysis(req: AnalyzeRequest): Promise<AiAnalysisResult | null> {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;

  if (!geminiApiKey && !groqApiKey) {
    // Neither API key configured: return null so backend flags as deterministic rule-based fallback
    return null;
  }

  const { systemInstruction, userPrompt } = buildAnalysisPrompt(req);

  // Budget management: total 12s budget leaves 3s headroom for frontend's 15s timeout
  const startTime = Date.now();
  const MAX_TOTAL_BACKEND_TIMEOUT_MS = 12000;

  // 1. Primary AI Provider: Gemini
  if (geminiApiKey) {
    const configuredModel = process.env.AI_MODEL;
    const supportedGeminiModels = [
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.8-flash'
    ];
    // Filter out known deprecated models (e.g. gemini-2.5-flash) and put configured model first if valid
    const geminiModelsToTry = configuredModel && !configuredModel.includes('2.5')
      ? [configuredModel, ...supportedGeminiModels.filter(m => m !== configuredModel)]
      : supportedGeminiModels;

    for (const geminiModel of geminiModelsToTry) {
      const elapsed = Date.now() - startTime;
      const remainingBudget = MAX_TOTAL_BACKEND_TIMEOUT_MS - elapsed;
      // Reserve at least 6.5s for Groq fallback if Groq key is present
      const minReserveForGroq = groqApiKey ? 6500 : 1000;
      if (remainingBudget <= minReserveForGroq) {
        console.warn(`[ClearChoice AI Provider] Time budget prioritizes Groq fallback (${remainingBudget}ms remaining).`);
        break;
      }

      // Cap Gemini timeout at 4000ms so fallback to Groq happens rapidly on quota/load spikes
      const geminiTimeoutMs = Math.min(4000, remainingBudget - minReserveForGroq);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), geminiTimeoutMs);

      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1
            }
          }),
          signal: controller.signal
        });

        if (res.ok) {
          const data: any = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const result = parseAndSanitizeAiResponse(text, 'Gemini', geminiModel);
            if (result) {
              clearTimeout(timeoutId);
              return result;
            }
          }
        } else {
          const status = res.status;
          const errBody = await res.text().catch(() => '');
          let errDetail = errBody.slice(0, 200);
          try {
            const parsed = JSON.parse(errBody);
            if (parsed.error?.message) {
              errDetail = parsed.error.message;
            }
          } catch {
            // Keep trimmed text
          }
          console.warn(
            `[ClearChoice AI Provider] Gemini (${geminiModel}) returned HTTP ${status}: ${sanitizeError(errDetail)}.`
          );

          // If Gemini returns 429 (quota exceeded), 503 (high demand), 403, 401, or 500:
          // Immediately break to Groq fallback without burning time on other Gemini models
          if (groqApiKey && (status === 429 || status === 503 || status === 403 || status === 401 || status === 500 || status === 404)) {
            console.warn(`[ClearChoice AI Provider] Gemini unavailable (${status}). Immediately transferring to Groq fallback.`);
            break;
          }
        }
      } catch (err: any) {
        const isAbort = err.name === 'AbortError';
        console.warn(
          `[ClearChoice AI Provider] Gemini (${geminiModel}) ${isAbort ? `timed out after ${geminiTimeoutMs}ms` : 'request failed'}:`,
          sanitizeError(err.message || err)
        );
        // On timeout or connection failure, immediately fall back to Groq
        if (groqApiKey) {
          console.warn('[ClearChoice AI Provider] Gemini timed out or failed. Switching to Groq fallback.');
          break;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }

  // 2. Fallback AI Provider: Groq
  const elapsed = Date.now() - startTime;
  const remainingBudget = MAX_TOTAL_BACKEND_TIMEOUT_MS - elapsed;

  if (!groqApiKey) {
    console.warn('[ClearChoice AI Provider] Groq fallback provider is not configured (GROQ_API_KEY missing).');
    return null;
  }

  if (remainingBudget <= 1000) {
    console.warn(`[ClearChoice AI Provider] Total AI budget (${MAX_TOTAL_BACKEND_TIMEOUT_MS}ms) reached; aborting before Groq fallback.`);
    return null;
  }

  // Model list for Groq: use configured GROQ_MODEL, with fallback to supported high-performance chat models
  const configuredGroqModel = process.env.GROQ_MODEL;
  const supportedGroqModels = [
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'allam-2-7b',
    'llama-3.3-70b-versatile'
  ];
  const groqModelsToTry = configuredGroqModel
    ? [configuredGroqModel, ...supportedGroqModels.filter(m => m !== configuredGroqModel)]
    : supportedGroqModels;

  for (const model of groqModelsToTry) {
    const currentRemaining = MAX_TOTAL_BACKEND_TIMEOUT_MS - (Date.now() - startTime);
    if (currentRemaining <= 1000) {
      console.warn(`[ClearChoice AI Provider] Timeout budget exhausted before trying Groq model ${model}.`);
      break;
    }

    const groqTimeoutMs = Math.min(8000, currentRemaining - 200);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), groqTimeoutMs);

    try {
      const endpoint = 'https://api.groq.com/openai/v1/chat/completions';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ClearChoiceAI/1.0'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      });

      if (res.ok) {
        const data: any = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          const result = parseAndSanitizeAiResponse(text, 'Groq', model);
          if (result) {
            return result;
          }
        }
      } else {
        const status = res.status;
        const errBody = await res.text().catch(() => '');
        console.warn(
          `[ClearChoice AI Provider] Groq model ${model} returned HTTP ${status}:`,
          sanitizeError(errBody.slice(0, 150))
        );

        // If model not found (404), continue loop to next supported Groq model
        if (status === 404 && errBody.includes('model_not_found')) {
          continue;
        }

        // For quota (429) or invalid auth (401), trying other models under the same account won't help
        if (status === 429 || status === 401) {
          break;
        }
      }
    } catch (err: any) {
      const isAbort = err.name === 'AbortError';
      console.warn(
        `[ClearChoice AI Provider] Groq model ${model} ${isAbort ? `timed out after ${groqTimeoutMs}ms` : 'failed'}:`,
        sanitizeError(err.message || err)
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // If both providers failed or timed out, return null to activate deterministic rule fallback
  return null;
}

