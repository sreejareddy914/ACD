import { ExtractedContent, DarkPatternFinding } from '../types';

export function checkSocialProof(content: ExtractedContent): DarkPatternFinding[] {
  const findings: DarkPatternFinding[] = [];

  const socialProofRegex = /(?:\d+[kK\+]?\+?\s+(?:people|shoppers|customers|travelers|users)?\s*(?:bought|purchased|viewed|booked|ordered)\s+(?:this\s+)?(?:in\s+the\s+last|in\s+past|today|recently)|someone\s+from\s+[A-Za-z\s]+\s+just\s+(?:purchased|ordered)|trending\s+now(?::\s*\d+\s*views)?|in\s+high\s+demand!\s+\d+\s+others\s+looking|popular\s+(?:choice|pick)|#?1\s+best\s*seller|loved\s+by\s+\d+[kK\+]?)/i;

  let count = 0;
  for (const item of content.visibleTexts) {
    if (count >= 2) break;
    if (socialProofRegex.test(item.text) && item.text.length < 120) {
      count++;
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
    }
  }

  return findings;
}
