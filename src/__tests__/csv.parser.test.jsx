/**
 * Regressions from the first CSV bulk upload, kept against the new importer
 * (src/lib/productImport.js, which replaced the CSV-only parser in AdminProducts).
 */
import { describe, it, expect } from 'vitest';
import { rowsFromText, detectDelimiter, parseProductSheet, matchDrafts } from '@/lib/productImport';

const read = (csv) => {
  const { drafts } = parseProductSheet(rowsFromText(csv));
  matchDrafts(drafts, []);
  return drafts.map(d => d.plan.request);
};

describe('bulk CSV import', () => {
  it('accepts capitalised Excel-style headers (the reported failure)', () => {
    const rows = read('Name,Category,Price\nSafety Helmet,PPE & Workwear,480');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: 'Safety Helmet', category: 'PPE & Workwear', price: 480 });
  });

  it('accepts alias headers like Product Name / Selling Price', () => {
    const rows = read('Product Name,Product Category,Selling Price,Stock\nWrench,Railway Tools,1250,40');
    expect(rows[0]).toMatchObject({ name: 'Wrench', category: 'Railway Tools', price: 1250, stockQty: 40 });
  });

  it('handles a UTF-8 BOM on the first header', () => {
    expect(read('﻿name,category,price\nGloves,PPE & Workwear,120')[0].name).toBe('Gloves');
  });

  it('auto-detects semicolon-delimited (European Excel) files', () => {
    const csv = 'Name;Category;Price\nHelmet;PPE & Workwear;480';
    expect(detectDelimiter(csv)).toBe(';');
    expect(read(csv)[0]).toMatchObject({ name: 'Helmet', price: 480 });
  });

  it('still parses quoted commas and multi-line cells', () => {
    const rows = read('name,category,price,description\n"Bolt, M12",Railway Tools,35,"Line1\nLine2"');
    expect(rows[0].name).toBe('Bolt, M12');
    expect(rows[0].description).toContain('Line2');
  });

  it('lists the found headers when the Name column is genuinely missing', () => {
    expect(() => read('foo,bar\n1,2')).toThrow(/No “Name” or “SKU” column/);
    expect(() => read('foo,bar\n1,2')).toThrow(/“foo”, “bar”/);
  });

  it('keeps 0% GST (exempt goods) instead of turning it into 18%', () => {
    expect(read('Name,Category,Price,GST\nBooks,Other,100,0')[0].gstRate).toBe(0);
  });

  it('a pincode list alone switches on limited delivery', () => {
    expect(read('Name,Category,Price,Allowed Pincodes\nSand,Civil,50,"734001; 7340*"')[0])
      .toMatchObject({ deliveryRestricted: true, allowedPincodes: '734001, 7340*' });
  });
});
