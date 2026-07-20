import { describe, it, expect, vi } from 'vitest';

// AdminProducts imports UI deps; stub the heavy ones so we can unit-test the parser
vi.mock('@/lib/api', () => ({ productsApi: {}, filesApi: {} }));
vi.mock('@/hooks/useApi', () => ({ usePaginated: () => ({ items: [], loading: false, refetch: () => {}, setFilter: () => {} }), useMutation: () => [vi.fn(), {}] }));
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/components/admin/ImageUploadInput', () => ({ default: () => null, MultiImageUploadButton: () => null }));

import { csvToProducts, detectDelimiter } from '@/pages/admin/AdminProducts';

describe('bulk CSV import', () => {
  it('accepts capitalised Excel-style headers (the reported failure)', () => {
    const csv = 'Name,Category,Price\nSafety Helmet,PPE & Workwear,480';
    const rows = csvToProducts(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: 'Safety Helmet', category: 'PPE & Workwear', price: 480 });
  });

  it('accepts alias headers like Product Name / Selling Price', () => {
    const csv = 'Product Name,Product Category,Selling Price,Stock\nWrench,Railway Tools,1250,40';
    const rows = csvToProducts(csv);
    expect(rows[0]).toMatchObject({ name: 'Wrench', category: 'Railway Tools', price: 1250, stockQty: 40 });
  });

  it('handles a UTF-8 BOM on the first header', () => {
    const csv = '\uFEFFname,category,price\nGloves,PPE & Workwear,120';
    expect(csvToProducts(csv)[0].name).toBe('Gloves');
  });

  it('auto-detects semicolon-delimited (European Excel) files', () => {
    const csv = 'Name;Category;Price\nHelmet;PPE & Workwear;480';
    expect(detectDelimiter(csv)).toBe(';');
    expect(csvToProducts(csv)[0]).toMatchObject({ name: 'Helmet', price: 480 });
  });

  it('still parses quoted commas and multi-line cells', () => {
    const csv = 'name,category,price,description\n"Bolt, M12",Railway Tools,35,"Line1\nLine2"';
    const rows = csvToProducts(csv);
    expect(rows[0].name).toBe('Bolt, M12');
    expect(rows[0].description).toContain('Line2');
  });

  it('lists the found headers when required columns are genuinely missing', () => {
    expect(() => csvToProducts('foo,bar\n1,2')).toThrow(/missing required column/i);
    expect(() => csvToProducts('foo,bar\n1,2')).toThrow(/Found headers/i);
  });
});
