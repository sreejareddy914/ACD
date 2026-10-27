export interface AnalyzeRequest {
  pageTitle: string;
  pageUrl: string;
  extractedContent: {
    visibleTexts?: Array<{ id: string; text: string }>;
    buttons?: Array<{ id: string; text: string }>;
    prices?: Array<{ id: string; raw: string; value: number }>;
    formControls?: Array<{ id: string; label: string; checked?: boolean }>;
  };
  observedSignals?: any[];
  scanOptions?: {
    strictness?: 'normal' | 'strict';
  };
}

export function validateAnalyzeRequest(body: any): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object.' };
  }
  if (typeof body.pageTitle !== 'string') {
    return { valid: false, error: 'pageTitle is required and must be a string.' };
  }
  if (typeof body.pageUrl !== 'string') {
    return { valid: false, error: 'pageUrl is required and must be a string.' };
  }
  if (!body.extractedContent || typeof body.extractedContent !== 'object') {
    return { valid: false, error: 'extractedContent must be an object containing extracted DOM data.' };
  }
  return { valid: true };
}
