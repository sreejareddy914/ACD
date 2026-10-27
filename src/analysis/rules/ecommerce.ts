import { ExtractedContent, DarkPatternFinding } from '../types';

export function checkEcommerce(content: ExtractedContent): DarkPatternFinding[] {
  const findings: DarkPatternFinding[] = [];

  const ecomRegex = /(?:bundle\s+deal\s+costs\s+more\s+than\s+individual|restocking\s+fee\s+of\s+\d+%|mandatory\s+gift\s+box\s+fee|non-returnable\s+final\s+sale\s+hidden|free\s+shipping\s+requires\s+hidden\s+annual\s+membership)/i;

  for (const item of content.visibleTexts) {
    if (ecomRegex.test(item.text)) {
      findings.push({
        id: `ecommerce-pattern-${item.id}`,
        category: 'ecommerce',
        categoryName: 'Ecommerce Manipulation',
        title: 'Ecommerce Bundle / Return Trap',
        severity: 'medium',
        confidence: 80,
        evidence: `"${item.text.trim()}"`,
        whyFlagged: 'Deceptive bundle pricing, hidden restocking charges, or disguised shipping restrictions inflate the net purchase cost.',
        detectionMethod: 'rule',
        recommendedAction: 'Check the prices of items purchased individually and read the return policy carefully before buying.',
        elementId: item.id
      });
      break;
    }
  }

  return findings;
}
