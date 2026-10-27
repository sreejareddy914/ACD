import { ExtractedContent, DarkPatternFinding } from '../types';

export function checkDisguisedAds(content: ExtractedContent): DarkPatternFinding[] {
  const findings: DarkPatternFinding[] = [];

  const sponsoredRegex = /(?:you\s+may\s+also\s+like.*sponsored|promoted\s+story|promoted\s+listing|around\s+the\s+web\s*\(ad\)|fake\s+download\s+ad|sponsored\s+(?:content|post|link|by)|recommended\s+by\s+(?:taboola|outbrain|revcontent))/i;
  const deceptiveDownloadRegex = /(?:(?:fast|direct|instant|high\s+speed|magnet|torrent|full\s+hd)\s+download|download\s+(?:now|here|full\s+movie|in\s+hd|free\s+now)|stream\s+in\s+hd|watch\s+online\s+free|watch\s+now\s+in\s+hd|click\s+here\s+to\s+download)/i;

  // 1. Check visible texts for sponsored widgets or deceptive download prompts
  for (const item of content.visibleTexts) {
    if (sponsoredRegex.test(item.text)) {
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

  // 2. Check buttons and links for deceptive fast/instant download or stream buttons commonly used as ad traps
  const interactiveCandidates = [
    ...content.buttons.map(b => ({ id: b.id, text: b.text, type: 'button' })),
    ...content.links.map(l => ({ id: l.id, text: l.text, type: 'link' }))
  ];

  let downloadButtonCount = 0;
  for (const item of interactiveCandidates) {
    if (downloadButtonCount >= 2) break;
    if (deceptiveDownloadRegex.test(item.text)) {
      downloadButtonCount++;
      findings.push({
        id: `deceptive-download-${item.id}`,
        category: 'disguised_ads',
        categoryName: 'Disguised Advertisements',
        title: 'Deceptive Download / Streaming Ad Bait',
        severity: 'high',
        confidence: 82,
        evidence: `${item.type === 'button' ? 'Button' : 'Link'} text: "${item.text.trim()}"`,
        whyFlagged: 'Buttons promising "Fast Download" or "Stream in HD" on media or portal sites frequently trigger popunder ads, redirects, or third-party software downloads.',
        detectionMethod: 'rule',
        recommendedAction: 'Avoid clicking prominent third-party download/streaming buttons. Look for verified official sources or direct links.',
        elementId: item.id
      });
    }
  }

  return findings;
}
