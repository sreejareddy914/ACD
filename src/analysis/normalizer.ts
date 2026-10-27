import { ExtractedPrice, ExtractedDiscount } from './types';

/**
 * Normalizes text by removing excessive whitespace, carriage returns, and control characters.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Regex patterns for supported currencies: USD ($), EUR (€), GBP (£), INR (₹, Rs, Rs.), JPY/CNY (¥), CAD, AUD
 */
const CURRENCY_REGEX = /(?:(\$|€|£|₹|Rs\.?|¥|USD|EUR|GBP|INR|JPY|CNY|CAD|AUD)\s*([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*(\$|€|£|₹|Rs\.?|¥|USD|EUR|GBP|INR|JPY|CNY|CAD|AUD))/i;

export function parsePrice(raw: string, id: string = ''): ExtractedPrice | null {
  if (!raw) return null;
  const cleaned = normalizeText(raw);
  const match = cleaned.match(CURRENCY_REGEX);
  if (!match) return null;

  const symbolOrCode = (match[1] || match[4] || '').toUpperCase();
  const numStr = (match[2] || match[3] || '').replace(/,/g, '');
  const val = parseFloat(numStr);
  if (isNaN(val) || val <= 0) return null;

  let currency = 'USD';
  if (symbolOrCode.includes('$') || symbolOrCode === 'USD') currency = 'USD';
  else if (symbolOrCode.includes('€') || symbolOrCode === 'EUR') currency = 'EUR';
  else if (symbolOrCode.includes('£') || symbolOrCode === 'GBP') currency = 'GBP';
  else if (symbolOrCode.includes('₹') || symbolOrCode.includes('RS') || symbolOrCode === 'INR') currency = 'INR';
  else if (symbolOrCode.includes('¥') || symbolOrCode === 'JPY' || symbolOrCode === 'CNY') currency = 'JPY';
  else if (symbolOrCode === 'CAD') currency = 'CAD';
  else if (symbolOrCode === 'AUD') currency = 'AUD';

  return {
    id,
    raw: cleaned,
    value: val,
    currency
  };
}

/**
 * Parses discount strings like "50% OFF", "-40%", "Save 30%", "Save up to 70%", "(25% off)"
 */
export function parseDiscountClaim(text: string, id: string = ''): ExtractedDiscount | null {
  if (!text) return null;
  const cleaned = normalizeText(text);

  // Match: "-40%", "50% off", "50% discount", "Save 25%", "Save up to 70%", "(30% off)"
  const match = cleaned.match(/(?:-(\s*\d{1,3})%|(\d{1,3})\s*%\s*(?:off|discount|savings?|less)?|save\s*(?:up\s*to\s*)?(\d{1,3})\s*%)/i);
  if (!match) return null;

  const rawNum = match[1] || match[2] || match[3];
  if (!rawNum) return null;
  const percent = parseInt(rawNum.replace(/\s+/g, ''), 10);
  if (isNaN(percent) || percent <= 0 || percent > 100) return null;

  return {
    id,
    text: cleaned,
    claimedPercent: percent
  };
}

/**
 * Checks for mathematical discrepancy between original price, sale price, and claimed discount.
 * Returns true if discrepancy is greater than 3 percentage points.
 */
export function verifyDiscountArithmetic(
  originalPrice: number,
  salePrice: number,
  claimedPercent: number
): { calculatedPercent: number; discrepancy: boolean; diff: number } {
  if (originalPrice <= 0 || salePrice <= 0 || salePrice >= originalPrice) {
    return { calculatedPercent: 0, discrepancy: true, diff: claimedPercent };
  }
  const actualPercent = Math.round(((originalPrice - salePrice) / originalPrice) * 100);
  const diff = Math.abs(actualPercent - claimedPercent);
  return {
    calculatedPercent: actualPercent,
    discrepancy: diff > 3, // allow 3% tolerance for rounding
    diff
  };
}

/**
 * Sanitizes input and strictly checks for sensitive data fields to exclude them.
 */
const SENSITIVE_FIELD_NAMES = [
  'password',
  'passwd',
  'pwd',
  'secret',
  'cvv',
  'cvc',
  'creditcard',
  'cardnumber',
  'ccnum',
  'cc-number',
  'ssn',
  'socialsecurity',
  'otp',
  'token',
  'auth',
  'pin'
];

export function isSensitiveField(nameOrIdOrType: string): boolean {
  if (!nameOrIdOrType) return false;
  const lower = nameOrIdOrType.toLowerCase();
  return SENSITIVE_FIELD_NAMES.some(term => lower.includes(term));
}

/**
 * Strips out sensitive information from any text before analysis.
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    // Replace 13-19 digit card numbers with [REDACTED_CARD]
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, '[REDACTED_CARD]')
    // Replace 3-4 digit CVV patterns
    .replace(/\b(?:cvv|cvc)[:\s]*\d{3,4}\b/gi, '[REDACTED_CVV]')
    // Replace OTP patterns
    .replace(/\b(?:otp|one-time password)[:\s]*\d{4,8}\b/gi, '[REDACTED_OTP]');
}
