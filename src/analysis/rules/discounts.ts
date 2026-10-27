import { ExtractedContent, DarkPatternFinding, EvidenceRecord } from '../types';
import { verifyDiscountArithmetic } from '../normalizer';
import { evaluateFindingClassification } from '../classification-service';

export function checkDiscounts(content: ExtractedContent): DarkPatternFinding[] {
  const findings: DarkPatternFinding[] = [];

  // Check if page has ONLY a single product (e.g. PDP details page with exactly 1 crossed & 1 regular price)
  const crossedPrices = content.prices.filter(p => p.isCrossedOut && p.value > 0);
  const regularPrices = content.prices.filter(p => !p.isCrossedOut && p.value > 0);
  const isSingleProductPage = content.discounts.length <= 1 && crossedPrices.length === 1 && regularPrices.length === 1;

  const crossedFallback = isSingleProductPage ? crossedPrices[0] : undefined;
  const regularFallback = isSingleProductPage ? regularPrices[0] : undefined;

  // 1. Math check on discount claims with visible original & sale prices
  let mathDiscrepancyCount = 0;
  const MAX_MATH_DISCREPANCY_FINDINGS = 2; // Prevent flooding on multi-deal catalogs

  for (const disc of content.discounts) {
    if (mathDiscrepancyCount >= MAX_MATH_DISCREPANCY_FINDINGS) break;

    if (disc.claimedPercent !== undefined) {
      // ONLY check math if original & sale price were paired from the same card/container,
      // OR strictly on a single-product page. NEVER mix prices across different catalog items!
      const orig = disc.originalPrice || (crossedFallback ? crossedFallback.value : undefined);
      const sale = disc.salePrice || (regularFallback ? regularFallback.value : undefined);

      if (orig && sale && orig > 0 && sale > 0) {
        const check = verifyDiscountArithmetic(orig, sale, disc.claimedPercent);

        // Only flag if there is an actual arithmetic discrepancy
        if (check.discrepancy) {
          mathDiscrepancyCount++;
          const evRecord: EvidenceRecord = {
            id: `ev-discount-math-${disc.id}`,
            pattern: 'discounts',
            origin: content.domain,
            pageUrl: content.url,
            observedAt: content.timestamp,
            evidenceType: 'discount_arithmetic_mismatch',
            description: `Advertised discount claimed ${disc.claimedPercent}% off, but arithmetic calculation from original (${orig}) and sale (${sale}) yields ${check.calculatedPercent}% off.`,
            observedValue: `Claimed: ${disc.claimedPercent}%, Calculated: ${check.calculatedPercent}%`,
            elementSelector: `#${disc.id}`,
            provenance: 'direct_observation',
            verificationStatus: 'verified',
            limitations: [
              'The authenticity of the merchant’s reference price itself remains unverified without historical retail tracking.',
              'Discrepancy may stem from faulty rounding logic or intentional percentage inflation.'
            ],
            isDemoData: false
          };

          const evalResult = evaluateFindingClassification({
            category: 'discounts',
            evidenceRecords: [evRecord],
            isMathDiscrepancy: true
          });

          findings.push({
            id: `discount-discrepancy-${disc.id}`,
            category: 'discounts',
            categoryName: 'Misleading Discounts',
            title: 'Incorrect Discount Arithmetic',
            severity: 'high',
            confidence: 95,
            evidence: `Claimed: ${disc.claimedPercent}% off, but calculated: ${check.calculatedPercent}% off (Original: ${orig}, Sale: ${sale})`,
            whyFlagged: 'The displayed discount percentage exaggerates the actual price reduction calculated from the reference and sale prices.',
            detectionMethod: 'rule',
            recommendedAction: 'Calculate the actual percentage yourself: (Original - Sale) / Original. Verify final cart total before checking out.',
            elementId: disc.id,
            elementSelector: `#${disc.id}`,
            classification: evalResult.classification,
            evidenceStrength: evalResult.evidenceStrength,
            verificationStatus: evalResult.verificationStatus,
            evidenceRecords: [evRecord],
            supportingEvidence: evalResult.supportingEvidence,
            contradictoryEvidence: evalResult.contradictoryEvidence,
            missingEvidence: evalResult.missingEvidence,
            limitations: evalResult.limitations
          });
        }
      }
    }
  }

  // 2. Crossed-out price inversion check (crossed-out price <= regular current price ON THE SAME PRODUCT)
  // Check within discount objects that have paired original and sale prices
  let foundInversion = false;
  for (const disc of content.discounts) {
    if (disc.originalPrice && disc.salePrice && disc.originalPrice > 0 && disc.salePrice > 0 && disc.originalPrice <= disc.salePrice) {
      foundInversion = true;
      const evRecord: EvidenceRecord = {
        id: `ev-discount-inversion-${disc.id}`,
        pattern: 'discounts',
        origin: content.domain,
        pageUrl: content.url,
        observedAt: content.timestamp,
        evidenceType: 'reference_price_inversion',
        description: `Crossed-out reference price (${disc.originalPrice}) is less than or equal to current asking price (${disc.salePrice}).`,
        observedValue: `Crossed: ${disc.originalPrice}, Current: ${disc.salePrice}`,
        elementSelector: `#${disc.id}`,
        provenance: 'direct_observation',
        verificationStatus: 'verified',
        limitations: ['May represent a system glitch or inverted pricing display.'],
        isDemoData: false
      };

      const evalResult = evaluateFindingClassification({
        category: 'discounts',
        evidenceRecords: [evRecord],
        isMathDiscrepancy: true
      });

      findings.push({
        id: `discount-inversion-${disc.id}`,
        category: 'discounts',
        categoryName: 'Misleading Discounts',
        title: 'Contradictory Crossed-Out Reference Price',
        severity: 'high',
        confidence: 90,
        evidence: `Crossed-out price (${disc.originalPrice}) is less than or equal to current price (${disc.salePrice})`,
        whyFlagged: 'The crossed-out price suggests a discount, but is actually lower than or equal to the current asking price.',
        detectionMethod: 'rule',
        recommendedAction: 'Carefully check the final price; this may be a deceptive pricing trick or system glitch.',
        elementId: disc.id,
        elementSelector: `#${disc.id}`,
        classification: evalResult.classification,
        evidenceStrength: evalResult.evidenceStrength,
        verificationStatus: evalResult.verificationStatus,
        evidenceRecords: [evRecord],
        supportingEvidence: evalResult.supportingEvidence,
        contradictoryEvidence: evalResult.contradictoryEvidence,
        missingEvidence: evalResult.missingEvidence,
        limitations: evalResult.limitations
      });
      break;
    }
  }

  // Fallback inversion check ONLY on strictly single-product pages
  if (!foundInversion && isSingleProductPage && crossedFallback && regularFallback) {
    if (crossedFallback.value <= regularFallback.value && crossedFallback.currency === regularFallback.currency) {
      const evRecord: EvidenceRecord = {
        id: `ev-discount-inversion-${crossedFallback.id}`,
        pattern: 'discounts',
        origin: content.domain,
        pageUrl: content.url,
        observedAt: content.timestamp,
        evidenceType: 'reference_price_inversion',
        description: `Crossed-out reference price (${crossedFallback.raw}) is less than or equal to current asking price (${regularFallback.raw}).`,
        observedValue: `Crossed: ${crossedFallback.raw}, Current: ${regularFallback.raw}`,
        elementSelector: `#${crossedFallback.id}`,
        provenance: 'direct_observation',
        verificationStatus: 'verified',
        limitations: ['May represent a system glitch or inverted pricing display.'],
        isDemoData: false
      };

      const evalResult = evaluateFindingClassification({
        category: 'discounts',
        evidenceRecords: [evRecord],
        isMathDiscrepancy: true
      });

      findings.push({
        id: `discount-inversion-${crossedFallback.id}`,
        category: 'discounts',
        categoryName: 'Misleading Discounts',
        title: 'Contradictory Crossed-Out Reference Price',
        severity: 'high',
        confidence: 90,
        evidence: `Crossed-out price (${crossedFallback.raw}) is less than or equal to current price (${regularFallback.raw})`,
        whyFlagged: 'The crossed-out price suggests a discount, but is actually lower than or equal to the current asking price.',
        detectionMethod: 'rule',
        recommendedAction: 'Carefully check the final price; this may be a deceptive pricing trick or system glitch.',
        elementId: crossedFallback.id,
        elementSelector: `#${crossedFallback.id}`,
        classification: evalResult.classification,
        evidenceStrength: evalResult.evidenceStrength,
        verificationStatus: evalResult.verificationStatus,
        evidenceRecords: [evRecord],
        supportingEvidence: evalResult.supportingEvidence,
        contradictoryEvidence: evalResult.contradictoryEvidence,
        missingEvidence: evalResult.missingEvidence,
        limitations: evalResult.limitations
      });
    }
  }

  // 3. Vague reference price claims without verifiable breakdown
  const vagueDiscountRegex = /(?:save\s+(?:up\s+to\s+)?(?:[5-9]\d|100)%\s*(?:off|without\s+conditions)?|(?:up\s+to|flat)\s+(?:[5-9]\d)%\s+off|lowest\s+price\s+(?:guaranteed|in\s+\d+\s+days)|inflated\s+reference\s+price|fake\s+msrp)/i;
  let anchorDiscountCount = 0;
  for (const item of content.visibleTexts) {
    if (anchorDiscountCount >= 2) break;
    if (vagueDiscountRegex.test(item.text) && item.text.length < 120) {
      anchorDiscountCount++;
      const evRecord: EvidenceRecord = {
        id: `ev-discount-vague-${item.id}`,
        pattern: 'discounts',
        origin: content.domain,
        pageUrl: content.url,
        observedAt: content.timestamp,
        evidenceType: 'unverified_msrp_claim',
        description: `Unverified reference price claim: "${item.text.trim()}"`,
        observedValue: item.text.trim(),
        elementSelector: `#${item.id}`,
        provenance: 'direct_observation',
        verificationStatus: 'unverified',
        limitations: [
          'The extension does not possess historical price records prior to installation for this specific merchant SKU.',
          'Manufacturers may publish genuine MSRP figures that differ from typical retail selling prices.'
        ],
        isDemoData: false
      };

      const evalResult = evaluateFindingClassification({
        category: 'discounts',
        evidenceRecords: [evRecord],
        isMathDiscrepancy: false
      });

      findings.push({
        id: `discount-vague-${item.id}`,
        category: 'discounts',
        categoryName: 'Misleading Discounts',
        title: 'Unverified Reference / MSRP Price',
        severity: 'medium',
        confidence: 70,
        evidence: `"${item.text.trim()}"`,
        whyFlagged: 'Websites sometimes fabricate an inflated "original" price to make normal prices appear like massive bargains.',
        detectionMethod: 'rule',
        recommendedAction: 'Compare prices on third-party price history trackers to ensure the original price was authentic.',
        elementId: item.id,
        elementSelector: `#${item.id}`,
        classification: evalResult.classification,
        evidenceStrength: evalResult.evidenceStrength,
        verificationStatus: evalResult.verificationStatus,
        evidenceRecords: [evRecord],
        supportingEvidence: evalResult.supportingEvidence,
        contradictoryEvidence: evalResult.contradictoryEvidence,
        missingEvidence: evalResult.missingEvidence,
        limitations: evalResult.limitations
      });
      break;
    }
  }

  return findings;
}
