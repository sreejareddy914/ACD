import { ExtractedContent, DarkPatternFinding } from '../types';

export function checkSneaking(content: ExtractedContent): DarkPatternFinding[] {
  const findings: DarkPatternFinding[] = [];

  const sneakingRegex = /(?:automatically\s+added\s+to\s+(?:your\s+)?cart|protection\s+plan\s+included\s+by\s+default|extended\s+warranty\s+(?:added|selected)|express\s+shipping\s+auto-selected|donation\s+automatically\s+added|surprise\s+fee\s+in\s+cart)/i;

  for (const item of content.visibleTexts) {
    if (sneakingRegex.test(item.text)) {
      findings.push({
        id: `sneaking-${item.id}`,
        category: 'sneaking',
        categoryName: 'Sneaking & Hidden Add-Ons',
        title: 'Sneak into Basket / Auto-Added Extra Item',
        severity: 'high',
        confidence: 88,
        evidence: `"${item.text.trim()}"`,
        whyFlagged: 'Items, warranties, or service fees added to the cart without explicit user selection force customers to manually remove unwanted charges.',
        detectionMethod: 'rule',
        recommendedAction: 'Carefully review every line item in your cart before checking out and remove any unrequested add-ons.',
        elementId: item.id
      });
      break;
    }
  }

  return findings;
}
