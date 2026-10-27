import { ExtractedContent, DarkPatternFinding } from '../types';

export function checkPreselectedOptions(content: ExtractedContent): DarkPatternFinding[] {
  const findings: DarkPatternFinding[] = [];

  for (const control of content.formControls) {
    if (control.checked && (control.type === 'checkbox' || control.type === 'radio')) {
      const label = control.label.toLowerCase();

      // Check paid add-on / insurance / warranty
      const isPaidAddon = /(?:insurance|warranty|protection\s+plan|donation|\$\d+|€\d+|£\d+|₹\d+|upgrade\s+to\s+priority)/i.test(label);
      if (isPaidAddon) {
        findings.push({
          id: `preselected-paid-${control.id}`,
          category: 'preselected_options',
          categoryName: 'Preselected Options',
          title: 'Pre-Checked Paid Option or Insurance',
          severity: 'high',
          confidence: 92,
          evidence: `Checkbox label: "${control.label}" (Pre-selected by default)`,
          whyFlagged: 'Default-checking optional paid extras exploits user inertia and inattention, causing accidental purchases.',
          detectionMethod: 'rule',
          recommendedAction: 'Uncheck this box if you did not intentionally request this optional protection or extra service.',
          elementId: control.id
        });
        continue;
      }

      // Check pre-selected marketing consent or auto-renewal
      const isMarketing = /(?:send\s+me\s+promotional|marketing\s+emails|newsletter|third-party\s+partners|share\s+my\s+data)/i.test(label);
      if (isMarketing) {
        findings.push({
          id: `preselected-marketing-${control.id}`,
          category: 'preselected_options',
          categoryName: 'Preselected Options',
          title: 'Pre-Selected Marketing or Data-Sharing Consent',
          severity: 'medium',
          confidence: 85,
          evidence: `Checkbox: "${control.label}" is checked by default`,
          whyFlagged: 'Opt-out consent defaults violate privacy-by-default principles and lead to unsolicited email campaigns and data dissemination.',
          detectionMethod: 'rule',
          recommendedAction: 'Uncheck the checkbox if you do not wish to receive marketing correspondence.',
          elementId: control.id
        });
      }
    }
  }

  return findings;
}
