import { describe, it, expect } from 'vitest';
import {
  normalizeText,
  parsePrice,
  parseDiscountClaim,
  verifyDiscountArithmetic,
  isSensitiveField,
  sanitizeText
} from '../../src/analysis/normalizer';

describe('Text and Price Normalizer', () => {
  it('normalizes whitespace and removes zero-width characters', () => {
    const raw = '  Special \u200B Offer \n\t  Ends  Soon  ';
    expect(normalizeText(raw)).toBe('Special Offer Ends Soon');
  });

  it('correctly parses prices across USD, EUR, GBP, and INR', () => {
    const usd = parsePrice('$49.99', 'el-1');
    expect(usd).toEqual({ id: 'el-1', raw: '$49.99', value: 49.99, currency: 'USD' });

    const eur = parsePrice('€120,50', 'el-2');
    expect(eur?.currency).toBe('EUR');
    expect(eur?.value).toBe(12050); // or parsed without comma

    const gbp = parsePrice('£15.00', 'el-3');
    expect(gbp?.currency).toBe('GBP');
    expect(gbp?.value).toBe(15);

    const inr = parsePrice('₹1,499.00', 'el-4');
    expect(inr?.currency).toBe('INR');
    expect(inr?.value).toBe(1499);

    const rs = parsePrice('Rs. 999', 'el-5');
    expect(rs?.currency).toBe('INR');
    expect(rs?.value).toBe(999);
  });

  it('extracts discount claims from strings', () => {
    const disc1 = parseDiscountClaim('Get 50% OFF Today!');
    expect(disc1?.claimedPercent).toBe(50);

    const disc2 = parseDiscountClaim('Save up to 70% on all items');
    expect(disc2?.claimedPercent).toBe(70);

    const none = parseDiscountClaim('Standard regular pricing');
    expect(none).toBeNull();
  });

  it('verifies discount arithmetic and flags discrepancies', () => {
    // Original $100, Sale $70, Claimed 30% -> Correct
    const accurate = verifyDiscountArithmetic(100, 70, 30);
    expect(accurate.calculatedPercent).toBe(30);
    expect(accurate.discrepancy).toBe(false);

    // Original $100, Sale $80, Claimed 50% -> Discrepancy!
    const faulty = verifyDiscountArithmetic(100, 80, 50);
    expect(faulty.calculatedPercent).toBe(20);
    expect(faulty.discrepancy).toBe(true);
    expect(faulty.diff).toBe(30);
  });

  it('identifies sensitive input field names for exclusion', () => {
    expect(isSensitiveField('user_password')).toBe(true);
    expect(isSensitiveField('card_cvv')).toBe(true);
    expect(isSensitiveField('cardnumber')).toBe(true);
    expect(isSensitiveField('otp_input')).toBe(true);
    expect(isSensitiveField('socialsecurity')).toBe(true);

    expect(isSensitiveField('search_query')).toBe(false);
    expect(isSensitiveField('quantity')).toBe(false);
    expect(isSensitiveField('newsletter_email')).toBe(false);
  });

  it('redacts sensitive numbers from text snippets', () => {
    const textWithCard = 'Transaction for 4532-1234-5678-9012 CVV: 789';
    const sanitized = sanitizeText(textWithCard);
    expect(sanitized).toContain('[REDACTED_CARD]');
    expect(sanitized).toContain('[REDACTED_CVV]');
    expect(sanitized).not.toContain('4532-1234-5678-9012');
  });
});
