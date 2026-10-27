import { ExtractedContent, DarkPatternFinding } from '../types';

export function checkDisguisedAds(content: ExtractedContent): DarkPatternFinding[] {
  const findings: DarkPatternFinding[] = [];

  const disguisedAdRegex = /(?:you\s+may\s+also\s+like.*sponsored|promoted\s+story|around\s+the\s+web\s*\(ad\)|fake\s+download\s+ad|promoted\s+listing\s+without\s+clear\s+tag)/i;

  for (const item of content.visibleTexts) {
    if (disguisedAdRegex.test(item.text)) {
      findings.push({
        id: `disguised-ad-${item.id}`,
        category: 'disguised_ads',
        categoryName: 'Disguised Advertisements',
        title: 'Sponsored Content Disguised as Editorial Content',
        severity: 'medium',
        confidence: 76,
        evidence: `"${item.text.trim()}"`,
        whyFlagged: 'Disguised ads mimic genuine site articles, search results, or download links to trick visitors into clicking commercial third-party links.',
        detectionMethod: 'rule',
        recommendedAction: 'Be cautious when clicking content widgets labeled "Around the Web" or "Promoted Stories".',
        elementId: item.id
      });
      break;
    }
  }

  return findings;
}
