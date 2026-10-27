import { ExtractedContent, DarkPatternFinding } from '../types';

export function checkConfirmshaming(content: ExtractedContent): DarkPatternFinding[] {
  const findings: DarkPatternFinding[] = [];

  const shameRegex = /(?:no[,\s]+(?:thanks[,\s]+)?(?:i\s+don't\s+want\s+to\s+save|i\s+prefer\s+(?:paying\s+full|losing\s+out)|i\s+don't\s+care\s+about\s+(?:my\s+health|saving|benefits|security)|i'll\s+pay\s+full\s+price|i\s+hate\s+discounts|no\s+thanks[,\s]+i\s+have\s+too\s+much\s+money|i\s+don't\s+deserve\s+this))/i;

  // Check buttons and interactive links
  const interactiveEls = [
    ...content.buttons.map(b => ({ id: b.id, text: b.text, isButton: true })),
    ...content.links.map(l => ({ id: l.id, text: l.text, isButton: false }))
  ];

  for (const item of interactiveEls) {
    if (shameRegex.test(item.text)) {
      findings.push({
        id: `confirmshame-${item.isButton ? 'btn' : 'link'}-${item.id}`,
        category: 'confirmshaming',
        categoryName: 'Confirmshaming',
        title: item.isButton
          ? 'Guilt-Inducing Opt-Out Button (Confirmshaming)'
          : 'Guilt-Inducing Opt-Out Link (Confirmshaming)',
        severity: 'high',
        confidence: 94,
        evidence: `${item.isButton ? 'Button' : 'Link'} text: "${item.text.trim()}"`,
        whyFlagged: 'Confirmshaming emotionalizes the refusal option to manipulate the user into feeling foolish, irresponsible, or guilty for declining an offer.',
        detectionMethod: 'rule',
        recommendedAction: 'Do not be swayed by manipulative phrasing. Declining an offer or newsletter is a completely valid choice.',
        elementId: item.id
      });
    }
  }

  // Check texts in popups / dialogs
  for (const text of content.visibleTexts) {
    if (shameRegex.test(text.text) && text.text.length < 120) {
      if (!findings.some(f => f.elementId === text.id)) {
        findings.push({
          id: `confirmshame-text-${text.id}`,
          category: 'confirmshaming',
          categoryName: 'Confirmshaming',
          title: 'Emotional Refusal Phrasing',
          severity: 'high',
          confidence: 90,
          evidence: `"${text.text.trim()}"`,
          whyFlagged: 'Phrasing opt-out choices in self-deprecating terms exploits psychological guilt rather than offering a neutral choice.',
          detectionMethod: 'rule',
          recommendedAction: 'Click to decline without hesitation if you do not want the offer.',
          elementId: text.id
        });
      }
    }
  }

  return findings;
}
