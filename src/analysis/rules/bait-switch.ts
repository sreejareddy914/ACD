import { ExtractedContent, DarkPatternFinding } from '../types';

export function checkBaitSwitch(content: ExtractedContent): DarkPatternFinding[] {
  const findings: DarkPatternFinding[] = [];

  const baitRegex = /(?:advertised\s+as\s+free\s+but\s+requires\s+payment|free\s+download\s+now.*credit\s+card\s+required|get\s+it\s+free\b.*\$|100%\s+free\s+trial.*non-refundable\s+deposit)/i;

  for (const item of content.visibleTexts) {
    if (baitRegex.test(item.text)) {
      findings.push({
        id: `bait-switch-${item.id}`,
        category: 'bait_switch',
        categoryName: 'Bait & Switch',
        title: 'Bait and Switch Claim (Advertised Free, Paid Required)',
        severity: 'high',
        confidence: 86,
        evidence: `"${item.text.trim()}"`,
        whyFlagged: 'Promising a free service or product but immediately demanding payment details or charging an unexpected fee is classic bait-and-switch.',
        detectionMethod: 'rule',
        recommendedAction: 'Verify whether payment is strictly mandatory or if a truly free tier exists.',
        elementId: item.id
      });
      break;
    }
  }

  // Also check button label saying "Download Free" right next to payment required notes
  for (const btn of content.buttons) {
    if (/download\s+free|get\s+free/i.test(btn.text)) {
      const nearbyText = content.visibleTexts.find(
        t => /credit\s+card\s+required|billed\s+after|\$\d+/i.test(t.text)
      );
      if (nearbyText) {
        findings.push({
          id: `bait-switch-btn-${btn.id}`,
          category: 'bait_switch',
          categoryName: 'Bait & Switch',
          title: 'Button Labels Action "Free" When Payment Card is Required',
          severity: 'medium',
          confidence: 80,
          evidence: `Button "${btn.text.trim()}" paired with condition: "${nearbyText.text.trim().slice(0, 70)}"`,
          whyFlagged: 'Using "Free" on primary action buttons when billing data is mandatory misrepresents the transaction.',
          detectionMethod: 'rule',
          recommendedAction: 'Be aware that entering payment credentials will likely result in future recurring charges.',
          elementId: btn.id
        });
        break;
      }
    }
  }

  return findings;
}
