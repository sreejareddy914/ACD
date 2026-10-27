import { ExtractedContent, DarkPatternFinding } from '../types';

export function checkEcommerce(content: ExtractedContent): DarkPatternFinding[] {
  const findings: DarkPatternFinding[] = [];

  const ecomRegex = /(?:bundle\s+deal\s+costs\s+more\s+than\s+individual|restocking\s+fee\s+of\s+\d+%|mandatory\s+gift\s+box\s+fee|non-returnable\s+final\s+sale\s+hidden|free\s+shipping\s+requires\s+hidden\s+annual\s+membership|download\s+app\s+(?:to\s+unlock|for\s+extra|for\s+best)|app[\s-]only\s+(?:deal|price|discount)|lowest\s+price\s+guaranteed)/i;

  let ecomCount = 0;
  for (const item of content.visibleTexts) {
    if (ecomCount >= 2) break;
    if (ecomRegex.test(item.text) && item.text.length < 120) {
      ecomCount++;
      findings.push({
        id: `ecommerce-pattern-${item.id}`,
        category: 'ecommerce',
        categoryName: 'Ecommerce Manipulation',
        title: 'Ecommerce Funneling / Unverified Guarantee',
        severity: 'medium',
        confidence: 78,
        evidence: `"${item.text.trim()}"`,
        whyFlagged: 'Deceptive bundle pricing, unverified low-price claims, or forcing mobile app downloads to gate advertised web prices.',
        detectionMethod: 'rule',
        recommendedAction: 'Check the prices of items independently and review return/cancellation terms before proceeding.',
        elementId: item.id
      });
    }
  }

  return findings;
}
