import { ExtractedContent, DarkPatternFinding } from '../types';

export function checkSocialProof(content: ExtractedContent): DarkPatternFinding[] {
  const findings: DarkPatternFinding[] = [];

  const socialProofRegex = /(?:\d+\s+people\s+(?:bought|purchased|viewed|booked)\s+this\s+in\s+the\s+last|someone\s+from\s+[A-Za-z\s]+\s+just\s+(?:purchased|ordered)|trending\s+now:\s+\d+\s+views|in\s+high\s+demand!\s+\d+\s+others\s+looking)/i;

  for (const item of content.visibleTexts) {
    if (socialProofRegex.test(item.text) && item.text.length < 120) {
      findings.push({
        id: `social-proof-${item.id}`,
        category: 'social_proof',
        categoryName: 'Social Proof Manipulation',
        title: 'High-Velocity Social Proof or Activity Ticker',
        severity: 'low',
        confidence: 76,
        evidence: `"${item.text.trim()}"`,
        whyFlagged: 'Real-time purchase notifications and viewer numbers are often synthesized by sales scripts to foster herd mentality.',
        detectionMethod: 'rule',
        recommendedAction: 'Focus on whether the product meets your specific needs rather than peer-pressure tickers.',
        elementId: item.id
      });
      break;
    }
  }

  return findings;
}
