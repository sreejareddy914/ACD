import { ExtractedContent, DarkPatternFinding } from '../types';

export function checkPrivacyManipulation(content: ExtractedContent): DarkPatternFinding[] {
  const findings: DarkPatternFinding[] = [];

  // Check cookie banner if extracted
  if (content.cookiesBanner) {
    const banner = content.cookiesBanner;
    if (!banner.hasReject && banner.hasManage) {
      findings.push({
        id: `privacy-asymmetry-${banner.id}`,
        category: 'privacy_manipulation',
        categoryName: 'Privacy Manipulation',
        title: 'Asymmetric Cookie Consent (Missing Direct Reject All)',
        severity: 'high',
        confidence: 90,
        evidence: `Banner has primary "${banner.acceptText}" button, but rejecting requires clicking into settings/preferences without an equal "Reject All" button.`,
        whyFlagged: 'Privacy regulations and UX ethics require that refusing optional cookies be just as easy as accepting them (equal prominence).',
        detectionMethod: 'rule',
        recommendedAction: 'Click "Manage Preferences" or "Cookie Settings" to explicitly disable tracking and third-party advertising cookies.',
        elementId: banner.id
      });
    } else if (!banner.hasReject && !banner.hasManage) {
      findings.push({
        id: `privacy-forced-${banner.id}`,
        category: 'privacy_manipulation',
        categoryName: 'Privacy Manipulation',
        title: 'Forced Cookie Consent (No Rejection or Preference Controls)',
        severity: 'critical',
        confidence: 92,
        evidence: `Cookie notice offers only "${banner.acceptText}" with no refusal or preference options.`,
        whyFlagged: 'Offering only an "Accept" button denies users genuine consent choices regarding their personal data and cross-site tracking.',
        detectionMethod: 'rule',
        recommendedAction: 'Consider using browser tracking protection or an ad-blocker to block non-essential trackers.',
        elementId: banner.id
      });
    }
  }

  // Also check text-based cookie notices
  const privacyNotice = content.visibleTexts.find(
    t => /(?:by\s+using\s+this\s+site,\s+you\s+agree\s+to\s+our\s+cookies\s+without\s+choice|accept\s+all\s+cookies\s+to\s+proceed)/i.test(t.text)
  );

  if (privacyNotice && findings.length === 0) {
    findings.push({
      id: `privacy-text-${privacyNotice.id}`,
      category: 'privacy_manipulation',
      categoryName: 'Privacy Manipulation',
      title: 'Consent-by-Browsing Without Explicit Opt-In',
      severity: 'medium',
      confidence: 82,
      evidence: `"${privacyNotice.text.trim()}"`,
      whyFlagged: 'Treating passive browsing as automatic consent undermines privacy transparency.',
      detectionMethod: 'rule',
      recommendedAction: 'Review the site\'s privacy settings or configure your browser to block third-party cookies.',
      elementId: privacyNotice.id
    });
  }

  return findings;
}
