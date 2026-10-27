import { ExtractedContent, DarkPatternFinding } from '../types';

export function checkJobInternship(content: ExtractedContent): DarkPatternFinding[] {
  const findings: DarkPatternFinding[] = [];

  const jobScamRegex = /(?:100%\s+guaranteed\s+(?:placement|job|salary)\s+after\s+training|pay\s+(?:registration|application|security\s+deposit|processing)\s+fee\s+to\s+interview|training\s+program\s+guaranteed\s+hiring|offer\s+letter\s+requires\s+upfront\s+payment|refundable\s+laptop\s+deposit\s+for\s+internship)/i;

  for (const item of content.visibleTexts) {
    if (jobScamRegex.test(item.text)) {
      findings.push({
        id: `job-offer-concern-${item.id}`,
        category: 'job_internship',
        categoryName: 'Job & Training Solicitation',
        title: 'Suspicious Upfront Fee or Absolute Placement Guarantee',
        severity: 'critical',
        confidence: 90,
        evidence: `"${item.text.trim()}"`,
        whyFlagged: 'Legitimate employers do not charge applicants application or interview fees, and unconditional 100% placement guarantees often mask paid course upselling.',
        detectionMethod: 'rule',
        recommendedAction: 'Do not pay any upfront deposit or fee for a job application or internship. Verify company credentials through official corporate domains.',
        elementId: item.id
      });
      break;
    }
  }

  return findings;
}
