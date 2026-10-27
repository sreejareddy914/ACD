import { ExtractedContent, DarkPatternFinding } from '../types';

export function checkTravelBooking(content: ExtractedContent): DarkPatternFinding[] {
  const findings: DarkPatternFinding[] = [];

  const travelRegex = /(?:only\s+1\s+room\s+left\s+at\s+this\s+price|resort\s+fee\s+payable\s+at\s+check-in|mandatory\s+cleaning\s+fee\s+added\s+at\s+checkout|price\s+held\s+for\s+\d+\s+minutes\s+only|seats\s+filling\s+fast\s+in\s+this\s+tier)/i;

  for (const item of content.visibleTexts) {
    if (travelRegex.test(item.text)) {
      findings.push({
        id: `travel-booking-${item.id}`,
        category: 'travel_booking',
        categoryName: 'Travel & Booking Pressure',
        title: 'Travel Booking Surcharge or Artificial Room Scarcity',
        severity: 'high',
        confidence: 84,
        evidence: `"${item.text.trim()}"`,
        whyFlagged: 'Travel portals frequently employ countdown locks on flight prices and obscure mandatory resort or cleaning fees until the last booking step.',
        detectionMethod: 'rule',
        recommendedAction: 'Verify the grand total including property-collected fees, taxes, and service charges before confirming.',
        elementId: item.id
      });
      break;
    }
  }

  return findings;
}
