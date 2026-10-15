/**
 * Limited-delivery-area rules (client mirror of com.navgrow.util.PincodeRules).
 * The same cases are asserted in the backend's PincodeRulesTest so the admin
 * form's live preview can never disagree with what checkout enforces.
 */
import { describe, it, expect } from 'vitest';
import {
  canonical, parseRules, matchesPincode, productDeliversTo, areaLabel,
} from '@/lib/pincodeRules';
import { INDIAN_STATES, normalizeState } from '@/lib/indianStates';

const RULES = '734001, 7340*, 735 ; 736101-736105\n700001';

describe('pincode rules — parsing', () => {
  it('normalises every entry type and counts them', () => {
    const r = parseRules(RULES);
    expect(r.normalized).toBe('734001, 7340*, 735*, 736101-736105, 700001');
    expect(r.invalid).toEqual([]);
    expect([r.exact, r.prefixes, r.ranges]).toEqual([2, 2, 1]);
  });

  it('reports invalid entries instead of silently dropping them', () => {
    const r = parseRules('734001, abc, 0734, 7340011');
    expect(r.invalid).toEqual(['abc', '0734', '7340011']);
    expect(r.valid).toEqual(['734001']);
  });

  it('canonicalises reversed ranges, dashes and "exact*"', () => {
    expect(canonical('736105-736101')).toBe('736101-736105');
    expect(canonical('734001–734009')).toBe('734001-734009');
    expect(canonical('734001*')).toBe('734001');
    expect(canonical('734')).toBe('734*');
  });

  it('de-duplicates', () => {
    expect(parseRules('734001,734001, 734001').normalized).toBe('734001');
  });
});

describe('pincode rules — matching', () => {
  it.each([
    ['734001', true],   // exact
    ['734005', true],   // prefix 7340*
    ['734105', false],  // outside the prefix
    ['735222', true],   // prefix written without *
    ['736103', true],   // inside range
    ['736106', false],  // outside range
    ['700001', true],
    ['73600', false],   // too short
    ['034001', false],  // leading zero is never a real pincode
  ])('%s → %s', (pin, ok) => {
    expect(matchesPincode(RULES, pin)).toBe(ok);
  });

  it('an empty rule list matches nothing', () => {
    expect(matchesPincode('', '734001')).toBe(false);
    expect(matchesPincode(null, '734001')).toBe(false);
  });

  it('unrestricted products deliver everywhere', () => {
    expect(productDeliversTo({ deliveryRestricted: false }, '110001')).toBe(true);
    expect(productDeliversTo({ deliveryRestricted: true, allowedPincodes: '734*' }, '110001')).toBe(false);
    expect(productDeliversTo({ deliveryRestricted: true, allowedPincodes: '734*' }, '734001')).toBe(true);
  });

  it('labels the area with the admin note, else a short pincode list', () => {
    expect(areaLabel({ deliveryAreaNote: 'Siliguri only', allowedPincodes: '734*' })).toBe('Siliguri only');
    expect(areaLabel({ allowedPincodes: '734001, 7340*, 735*, 736*, 737*' })).toBe('pincodes 734001, 7340*, 735*, 736* (+1 more)');
  });
});

describe('indian states', () => {
  it('covers all 28 states and 8 union territories', () => {
    expect(INDIAN_STATES).toHaveLength(36);
    ['Jammu and Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry', 'Lakshadweep'].forEach(s =>
      expect(INDIAN_STATES).toContain(s));
  });

  it.each([
    ['Orissa', 'Odisha'],
    ['Jammu & Kashmir', 'Jammu and Kashmir'],
    ['Pondicherry', 'Puducherry'],
    ['Daman and Diu', 'Dadra and Nagar Haveli and Daman and Diu'],
    ['west bengal', 'West Bengal'],
    ['NCT of Delhi', 'Delhi'],
    ['Atlantis', ''],
  ])('normalises %s → %s', (raw, expected) => {
    expect(normalizeState(raw)).toBe(expected);
  });
});
