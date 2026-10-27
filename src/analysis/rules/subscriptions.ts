import { ExtractedContent, DarkPatternFinding } from '../types';

export function checkSubscriptions(content: ExtractedContent): DarkPatternFinding[] {
  const findings: DarkPatternFinding[] = [];

  // Check for free trial turning into recurring without prominent price display
  const trialRegex = /(?:free\s+trial\s+converts|automatically\s+renews\s+at\s+full\s+price|billed\s+annually\s+after\s+trial|subscription\s+renews\s+automatically|recurring\s+charge\s+of)/i;

  for (const item of content.visibleTexts) {
    if (trialRegex.test(item.text)) {
      // Check if price terms are hidden in tiny font or fine print
      const isTiny = item.fontSize && item.fontSize <= 11;
      findings.push({
        id: `subscription-trap-${item.id}`,
        category: 'subscriptions',
        categoryName: 'Subscription Traps & Continuity',
        title: isTiny ? 'Hidden Automatic Renewal in Fine Print' : 'Automatic Subscription Continuity Clause',
        severity: isTiny ? 'high' : 'medium',
        confidence: 86,
        evidence: `"${item.text.trim()}"`,
        whyFlagged: 'Free trials or low promotional rates that roll into recurring paid plans frequently lead to unexpected monthly or annual charges.',
        detectionMethod: 'rule',
        recommendedAction: 'Set a calendar reminder for 2 days before the trial expires to review your usage before automatic billing starts.',
        elementId: item.id
      });
      break;
    }
  }

  // Check deceptive billing period format, e.g., "$5/month" where tiny footnote says "Billed annually as $60"
  const annualDeceptionRegex = /\$\d+(?:\.\d{2})?\s*\/\s*(?:month|mo)\b.*(?:billed\s+annually|paid\s+upfront|annual\s+commitment)/i;
  for (const item of content.visibleTexts) {
    if (annualDeceptionRegex.test(item.text)) {
      findings.push({
        id: `subscription-annual-${item.id}`,
        category: 'subscriptions',
        categoryName: 'Subscription Traps & Continuity',
        title: 'Monthly Rate Advertised for Lump-Sum Annual Charge',
        severity: 'medium',
        confidence: 84,
        evidence: `"${item.text.trim()}"`,
        whyFlagged: 'Presenting an annualized total as a low monthly breakdown obscures the actual upfront sum charged immediately.',
        detectionMethod: 'rule',
        recommendedAction: 'Verify whether the charge will be deducted monthly or as an immediate full-year charge.',
        elementId: item.id
      });
      break;
    }
  }

  return findings;
}
