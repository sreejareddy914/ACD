import { DarkPatternFinding, RiskLevel, SeverityLevel, ClassificationType } from './types';

export const SEVERITY_WEIGHTS: Record<SeverityLevel, number> = {
  informational: 5,
  low: 10,
  medium: 20,
  high: 30,
  critical: 40
};

export const SEVERITY_RANKS: Record<SeverityLevel, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  informational: 1
};

export interface ScoreExplanation {
  score: number;
  level: RiskLevel;
  majorContributors: Array<{
    title: string;
    category: string;
    contribution: number;
    classification?: ClassificationType;
  }>;
  totalFindingsEvaluated: number;
  verifiedFindingsCount: number;
  potentialFindingsCount: number;
}

/**
 * Maps a numeric risk score (0-100) to its corresponding RiskLevel.
 */
export function getRiskLevel(score: number): RiskLevel {
  if (score >= 70) return 'VERY HIGH RISK';
  if (score >= 40) return 'HIGH RISK';
  if (score >= 20) return 'MODERATE RISK';
  return 'LOW RISK';
}

export const CLASSIFICATION_MULTIPLIERS: Record<ClassificationType, number> = {
  verified_deceptive: 1.0,     // Conclusive, verified deceptive patterns (math errors, roach motel)
  strong_evidence: 1.0,        // Strong observable evidence (preselected options, hidden fees, broken promises)
  potential_dark_pattern: 1.0, // Observed potential dark patterns and commercial nudges
  insufficient_evidence: 0.0   // Clean / legitimate / insufficient evidence (zero contribution)
};

/**
 * Computes a deterministic canonical sort key for a finding.
 * Ensures finding order in the input array will NEVER change which finding
 * is chosen during deduplication or how it is scored.
 */
export function getFindingSortKey(f: DarkPatternFinding): string {
  const baseWeight = SEVERITY_WEIGHTS[f.severity] || 15;
  const conf = Math.max(0.1, Math.min(1.0, (f.confidence ?? 70) / 100));
  const classMultiplier = f.classification ? (CLASSIFICATION_MULTIPLIERS[f.classification] ?? 1.0) : 1.0;
  const rawScore = baseWeight * conf * classMultiplier;
  const sevRank = SEVERITY_RANKS[f.severity] || 1;

  // Zero-padded descending numbers so alphabetical sort orders highest severity first
  const paddedScore = String(1000 - Math.round(rawScore * 10)).padStart(4, '0');
  const paddedRank = String(10 - sevRank).padStart(2, '0');
  const paddedConf = String(1000 - Math.round(conf * 100)).padStart(4, '0');
  const cat = (f.categoryName || f.category || '').toLowerCase();
  const title = (f.title || '').toLowerCase();
  const evid = (f.evidence || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
  const id = f.id || '';

  return `${paddedScore}:${paddedRank}:${paddedConf}:${cat}:${title}:${evid}:${id}`;
}

/**
 * Calculates risk score using bounded aggregation with diminishing returns.
 * 
 * Deterministic Rules:
 * 1. Canonical pre-sorting of all findings by (contribution, severity, confidence, category, title, id).
 * 2. Strict deduplication of findings sharing the same target DOM element (elementId).
 * 3. Cross-source deduplication (rules vs AI) for identical category and evidence excerpt.
 * 4. Zero contribution for insufficient, ungrounded, or contradicted evidence.
 * 5. Deterministic diminishing returns decay factors: 1.0 (1st), 0.75 (2nd), 0.55 (3rd), 0.35 (4th), 0.15 (subsequent).
 * 6. Hard clamping strictly within [0, 100].
 * 7. Clean pages evaluate to 0/100 (LOW RISK).
 */
export function calculateRiskScore(findings: DarkPatternFinding[]): ScoreExplanation {
  // 1. Filter active, non-dismissed findings
  const activeFindings = findings.filter(f => !f.dismissed && !f.falsePositive);

  if (activeFindings.length === 0) {
    return {
      score: 0,
      level: 'LOW RISK',
      majorContributors: [],
      totalFindingsEvaluated: 0,
      verifiedFindingsCount: 0,
      potentialFindingsCount: 0
    };
  }

  // 2. Canonical sort BEFORE deduplication guarantees identical scores regardless of input order
  const sortedFindings = [...activeFindings].sort((a, b) => {
    const keyA = getFindingSortKey(a);
    const keyB = getFindingSortKey(b);
    return keyA.localeCompare(keyB);
  });

  // 3. Deduplicate by finding ID, target element, or selector to avoid double-counting
  const seenFindingIds = new Set<string>();
  const seenElements = new Set<string>();
  const deduplicatedFindings: DarkPatternFinding[] = [];

  for (const f of sortedFindings) {
    // Deduplicate identical finding instances
    if (f.id) {
      if (seenFindingIds.has(f.id)) {
        continue;
      }
      seenFindingIds.add(f.id);
    }

    // If elementId is present and was already counted by a higher-priority finding, skip
    if (f.elementId) {
      if (seenElements.has(f.elementId)) {
        continue;
      }
      seenElements.add(f.elementId);
    } else if (f.elementSelector) {
      if (seenElements.has(f.elementSelector)) {
        continue;
      }
      seenElements.add(f.elementSelector);
    }

    deduplicatedFindings.push(f);
  }

  let verifiedCount = 0;
  let potentialCount = 0;

  // 4. Calculate individual weighted contributions
  const contributions = deduplicatedFindings.map(f => {
    if (f.classification === 'verified_deceptive') verifiedCount++;
    if (f.classification === 'potential_dark_pattern') potentialCount++;

    // Zero contribution for insufficient or contradicted evidence
    if (f.classification === 'insufficient_evidence' || f.verificationStatus === 'contradicted') {
      return {
        finding: f,
        contribution: 0,
        sortKey: getFindingSortKey(f)
      };
    }

    const baseWeight = SEVERITY_WEIGHTS[f.severity] || 15;
    const confidenceFactor = Math.max(0.1, Math.min(1.0, (f.confidence ?? 70) / 100));
    const classMultiplier = f.classification ? (CLASSIFICATION_MULTIPLIERS[f.classification] ?? 1.0) : 1.0;
    const contribution = baseWeight * confidenceFactor * classMultiplier;

    return {
      finding: f,
      contribution: Math.round(contribution * 10) / 10,
      sortKey: getFindingSortKey(f)
    };
  });

  // 5. Filter out zero-contribution findings and stably sort descending
  const validContributions = contributions
    .filter(c => c.contribution > 0)
    .sort((a, b) => {
      if (b.contribution !== a.contribution) {
        return b.contribution - a.contribution;
      }
      return a.sortKey.localeCompare(b.sortKey);
    });

  if (validContributions.length === 0) {
    return {
      score: 0,
      level: 'LOW RISK',
      majorContributors: [],
      totalFindingsEvaluated: activeFindings.length,
      verifiedFindingsCount: 0,
      potentialFindingsCount: 0
    };
  }

  // 6. Diminishing returns: 1st finding 100%, 2nd 75%, 3rd 55%, 4th 35%, subsequent 15%
  const decayFactors = [1.0, 0.75, 0.55, 0.35];
  let accumulated = 0;

  validContributions.forEach((item, index) => {
    const factor = index < decayFactors.length ? decayFactors[index] : 0.15;
    accumulated += item.contribution * factor;
  });

  // 7. Scale and clamp strictly between 0 and 100
  const finalScore = Math.min(100, Math.max(0, Math.round(accumulated)));

  const majorContributors = validContributions.slice(0, 3).map(c => ({
    title: c.finding.title,
    category: c.finding.categoryName,
    contribution: c.contribution,
    classification: c.finding.classification
  }));

  return {
    score: finalScore,
    level: getRiskLevel(finalScore),
    majorContributors,
    totalFindingsEvaluated: activeFindings.length,
    verifiedFindingsCount: verifiedCount,
    potentialFindingsCount: potentialCount
  };
}
