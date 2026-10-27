export type DarkPatternCategory =
  | 'urgency'
  | 'scarcity'
  | 'discounts'
  | 'hidden_charges'
  | 'forced_signup'
  | 'cancellation'
  | 'subscriptions'
  | 'confirmshaming'
  | 'sneaking'
  | 'preselected_options'
  | 'bait_switch'
  | 'obstruction'
  | 'privacy_manipulation'
  | 'disguised_ads'
  | 'visual_interference'
  | 'nagging'
  | 'interface_interference'
  | 'hidden_information'
  | 'social_proof'
  | 'ecommerce'
  | 'travel_booking'
  | 'job_internship'
  | 'other_patterns';

export type SeverityLevel = 'informational' | 'low' | 'medium' | 'high' | 'critical';

export type DetectionMethod = 'rule' | 'ai' | 'combined';

export type RiskLevel = 'LOW RISK' | 'MODERATE RISK' | 'HIGH RISK' | 'VERY HIGH RISK';

export type ScanStatus = 'ready' | 'analyzing' | 'completed' | 'partial' | 'error' | 'insufficient_evidence';

/**
 * 4 Required Central Classifications defined in Master Specification
 */
export type ClassificationType =
  | 'verified_deceptive'       // Reliable evidence satisfies verification standard (e.g. math contradiction, explicit deadline breach)
  | 'strong_evidence'          // Multiple observations support finding, some uncertainty remains
  | 'potential_dark_pattern'   // Suspicious wording/behavior observed, but verification unavailable (e.g. inventory unverified)
  | 'insufficient_evidence';   // Incomplete, unobservable, or ungrounded data

export type EvidenceStrength = 'conclusive' | 'strong' | 'limited' | 'insufficient';

export type EvidenceProvenance = 'direct_observation' | 'historical_record' | 'external_verification' | 'inferred';

export type VerificationStatus = 'observed' | 'verified' | 'unverified' | 'contradicted' | 'unsupported';

/**
 * Structured Evidence Record - Every finding is traceable to concrete observations
 */
export interface EvidenceRecord {
  id: string;
  pattern: DarkPatternCategory;
  origin: string;
  pageUrl: string;
  observedAt: number;
  evidenceType: string; // e.g. 'timer_observation', 'scarcity_claim', 'discount_arithmetic', 'checkout_fee', 'signup_requirement', 'cancellation_step'
  description: string;
  observedValue: string;
  elementSelector?: string;
  provenance: EvidenceProvenance;
  verificationStatus: VerificationStatus;
  limitations: string[];
  relatedEvidenceIds?: string[];
  isDemoData?: boolean;
}

export interface DarkPatternFinding {
  id: string;
  category: DarkPatternCategory;
  categoryName: string;
  title: string;
  severity: SeverityLevel;
  confidence: number; // 0 to 100
  evidence: string;
  whyFlagged: string;
  detectionMethod: DetectionMethod;
  recommendedAction: string;
  elementId?: string; // e.g. cc-el-42
  elementSelector?: string;
  dismissed?: boolean;
  falsePositive?: boolean;
  notes?: string;

  // Evidence-driven classification & verification properties
  classification: ClassificationType;
  evidenceStrength: EvidenceStrength;
  verificationStatus: VerificationStatus;
  evidenceRecords: EvidenceRecord[];
  supportingEvidence: string[];
  contradictoryEvidence: string[];
  missingEvidence: string[];
  limitations: string[];
}

export interface ExtractedPrice {
  id: string;
  raw: string;
  value: number;
  currency: string; // 'USD' | 'EUR' | 'GBP' | 'INR' | etc.
  isCrossedOut?: boolean;
  context?: string;
}

export interface ExtractedDiscount {
  id: string;
  text: string;
  claimedPercent?: number;
  originalPrice?: number;
  salePrice?: number;
  currency?: string;
  calculatedPercent?: number;
  discrepancy?: boolean;
}

export interface ExtractedTimer {
  id: string;
  text: string;
  secondsRemaining?: number;
  isTicking?: boolean;
  context?: string;
}

export interface ExtractedFormControl {
  id: string;
  type: string;
  label: string;
  checked?: boolean;
  required?: boolean;
  isPreselected?: boolean;
  isOptionalConsent?: boolean;
  isPaidAddon?: boolean;
}

export interface ExtractedElement {
  id: string;
  tag: string;
  text: string;
  ariaLabel?: string;
  role?: string;
  className?: string;
  isInteractive?: boolean;
  isModal?: boolean;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  computedContrastRatio?: number;
  boundingBox?: { top: number; left: number; width: number; height: number };
}

export interface ExtractedContent {
  url: string;
  domain: string;
  title: string;
  timestamp: number;
  visibleTexts: ExtractedElement[];
  buttons: Array<{
    id: string;
    text: string;
    ariaLabel?: string;
    isPrimary?: boolean;
    computedStyle?: { fontSize: string; color: string; backgroundColor: string; opacity: string };
  }>;
  links: Array<{ id: string; text: string; href?: string }>;
  formControls: ExtractedFormControl[];
  prices: ExtractedPrice[];
  discounts: ExtractedDiscount[];
  timers: ExtractedTimer[];
  modals: Array<{ id: string; title: string; content: string; hasCloseButton: boolean }>;
  cookiesBanner?: {
    id: string;
    acceptButtonId?: string;
    rejectButtonId?: string;
    acceptText: string;
    rejectText?: string;
    hasReject: boolean;
    hasManage: boolean;
  };
  isTruncated?: boolean;
  totalElementsQueried?: number;
  totalCharactersExtracted?: number;
  contentFingerprint?: string;
  inaccessibleIframesCount?: number;
  accessibleIframesCount?: number;
  extractionCoverage?: ExtractionCoverage;
}

export interface ExtractionCoverage {
  isTruncated: boolean;
  truncationReasons: string[];
  totalDomElementsQueried: number;
  totalCharactersExtracted: number;
  scrollPassCompleted: boolean;
  inaccessibleIframesCount: number;
  accessibleIframesCount: number;
  contentFingerprint: string;
  snapshotTimestamp: number;
  limitsApplied: {
    maxTexts: number;
    maxButtons: number;
    maxLinks: number;
    maxPrices: number;
    maxDiscounts: number;
    maxTimers: number;
    maxFormControls: number;
  };
}

export interface DetectorDiagnostic {
  name: string;
  category: DarkPatternCategory;
  ran: boolean;
  findingsCount: number;
  status: 'detected' | 'clean' | 'error';
  sampleFindings?: string[];
}

export interface BackendDiagnostic {
  status: 'connected' | 'partial_fallback' | 'disabled' | 'error' | 'timeout';
  endpoint: string;
  latencyMs?: number;
  model?: string;
  responseCount?: number;
  error?: string;
}

export interface ScanDiagnosticsData {
  scanId?: string;
  scanInitiation?: {
    scanId: string;
    pageUrl: string;
    pageDomain: string;
    timestamp: number;
    initiatedBy: 'side_panel' | 'floating_panel' | 'popup' | 'auto_scan' | 'direct';
    contentScriptAvailable: boolean;
  };
  extractedStats: {
    totalDomElementsQueried: number;
    visibleElementsExtracted: number;
    totalCharactersExtracted: number;
    pricesCount: number;
    discountsCount: number;
    timersCount: number;
    buttonsCount: number;
    formControlsCount: number;
    modalsCount: number;
  };
  sampleExtracted: {
    prices: Array<{ raw: string; value: number; isCrossedOut?: boolean }>;
    discounts: Array<{ text: string; claimedPercent?: number; originalPrice?: number; salePrice?: number }>;
    timers: Array<{ text: string }>;
    texts: string[];
  };
  detectors: DetectorDiagnostic[];
  backend: BackendDiagnostic;
  normalizationAndScoring?: {
    totalFindingsBeforeValidation: number;
    validatedCount: number;
    rejectedCount: number;
    scoredFindingsCount: number;
    formulaApplied: string;
  };
  riskEvaluation: {
    baseScore: number;
    finalScore: number;
    level: RiskLevel;
    activeFindingsCount: number;
  };
}

export interface AnalysisResult {
  scanId?: string;
  scanStatus: ScanStatus;
  stage?: string;
  stageProgress?: number;
  analysisMode: DetectionMethod;
  pageUrl: string;
  pageDomain: string;
  pageTitle: string;
  timestamp: number;
  riskScore: number;
  riskLevel: RiskLevel;
  summary: string;
  detailedExplanation?: string;
  findings: DarkPatternFinding[];
  categoriesDetected: string[];
  verifiedCount: number;
  strongCount: number;
  potentialCount: number;
  insufficientCount: number;
  recommendations: string[];
  limitations: string[];
  aiAvailable: boolean;
  errorMessage?: string;
  diagnostics?: ScanDiagnosticsData;
  isCached?: boolean;
  cacheTimestamp?: number;
  extractionCoverage?: ExtractionCoverage;
}

export const CLASSIFICATION_LABELS: Record<ClassificationType, string> = {
  verified_deceptive: 'Verified Deceptive Behaviour',
  strong_evidence: 'Strong Evidence of Dark Pattern',
  potential_dark_pattern: 'Potential Dark Pattern',
  insufficient_evidence: 'Insufficient Evidence'
};

export const CLASSIFICATION_DESCRIPTIONS: Record<ClassificationType, string> = {
  verified_deceptive: 'Reliable, grounded evidence directly confirms deceptive design or contradictory terms.',
  strong_evidence: 'Multiple observations strongly support deceptive manipulation, with minor uncertainty remaining.',
  potential_dark_pattern: 'Suspicious wording or nudges observed, but independent verification is not possible with available data.',
  insufficient_evidence: 'Available information is insufficient or contradictory; no conclusive dark pattern can be verified.'
};

export interface ScanHistoryItem {
  id: string;
  domain: string;
  url: string;
  pageTitle: string;
  timestamp: number;
  score: number;
  riskLevel: RiskLevel;
  findingsCount: number;
  categoriesSummary: string[];
}

export interface UserSettings {
  autoScan: boolean;
  aiAssisted: boolean;
  ruleBased: boolean;
  highlightingEnabled: boolean;
  historyEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  apiEndpoint: string;
  allowlist: string[];
  notificationsEnabled: boolean;
}

export const CATEGORY_NAMES: Record<DarkPatternCategory, string> = {
  urgency: 'Fake Urgency',
  scarcity: 'Fake Scarcity',
  discounts: 'Misleading Discounts',
  hidden_charges: 'Hidden Charges & Drip Pricing',
  forced_signup: 'Forced Sign-Up',
  cancellation: 'Difficult Cancellation (Roach Motel)',
  subscriptions: 'Subscription Traps & Continuity',
  confirmshaming: 'Confirmshaming',
  sneaking: 'Sneaking & Hidden Add-Ons',
  preselected_options: 'Preselected Options',
  bait_switch: 'Bait & Switch',
  obstruction: 'Obstruction',
  privacy_manipulation: 'Privacy Manipulation',
  disguised_ads: 'Disguised Advertisements',
  visual_interference: 'Visual Interference',
  nagging: 'Nagging',
  interface_interference: 'Interface Interference',
  hidden_information: 'Hidden Information',
  social_proof: 'Social Proof Manipulation',
  ecommerce: 'Ecommerce Manipulation',
  travel_booking: 'Travel & Booking Pressure',
  job_internship: 'Job & Training Solicitation',
  other_patterns: 'Other Pattern (Needs Review)'
};
