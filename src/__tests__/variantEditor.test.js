/** Admin "Options & price range" editor logic — building, pasting, filling, validating, saving. */
import { describe, it, expect } from 'vitest';
import {
  cartesian, rebuildRows, applyPaste, bulkFill, validateOptions, optionsPayload, initOptionsState,
  summarizeRows, splitValues, PRESETS,
} from '@/lib/variantEditor';

const axes = [
  { name: 'Brand', values: 'UltraTech, ACC' },
  { name: 'Grade', values: 'OPC 53, PPC' },
];

describe('price table', () => {
  it('splits values and builds every combination', () => {
    expect(splitValues(' UltraTech,ACC ,, acc ')).toEqual(['UltraTech', 'ACC']);
    expect(cartesian(axes)).toEqual([['UltraTech', 'OPC 53'], ['UltraTech', 'PPC'], ['ACC', 'OPC 53'], ['ACC', 'PPC']]);
    expect(cartesian([{ name: 'Brand', values: '' }])).toEqual([]);
  });

  it('rebuilding keeps prices already typed and reports rows that no longer fit', () => {
    let { rows } = rebuildRows(axes, []);
    rows = rows.map(r => (r.option1 === 'ACC' && r.option2 === 'PPC' ? { ...r, price: '395', id: 'v-1' } : r));
    const next = rebuildRows([{ name: 'Brand', values: 'ACC, Ambuja' }, axes[1]], rows);
    expect(next.rows).toHaveLength(4);
    expect(next.rows.find(r => r.option1 === 'ACC' && r.option2 === 'PPC')).toMatchObject({ price: '395', id: 'v-1' });
    expect(next.dropped.map(r => r.option1)).toEqual(['UltraTech', 'UltraTech']);
  });

  it('the Cement preset covers brand × grade × pack size', () => {
    expect(cartesian(PRESETS.cement.axes)).toHaveLength(6 * 4 * 1);
    expect(PRESETS.cement.gstRate).toBe('18');
    expect(PRESETS.cement.hsnCode).toBe('2523');
  });
});

describe('paste from a spreadsheet', () => {
  it('updates matching rows, adds new ones (and their values), skips bad lines', () => {
    const { rows } = rebuildRows(axes, []);
    const text = 'Brand\tGrade\tPrice\nUltraTech\tOPC 53\t430\t460\t500\tUT-53\nAmbuja\tPPC\t₹4,10\t\t200\nACC\tPPC\tabc';
    const res = applyPaste(text, axes, rows);
    expect(res.updated).toBe(1);
    expect(res.added).toBe(1);
    expect(res.errors).toHaveLength(1);
    expect(res.rows.find(r => r.option1 === 'UltraTech' && r.option2 === 'OPC 53'))
      .toMatchObject({ price: '430', mrp: '460', stockQty: '500', sku: 'UT-53' });
    expect(res.rows.find(r => r.option1 === 'Ambuja')).toMatchObject({ price: '410', stockQty: '200' });
    expect(res.axes[0].values).toBe('UltraTech, ACC, Ambuja');
  });
});

describe('bulk fill', () => {
  const base = [
    { key: 'a', option1: 'UltraTech', option2: 'OPC 53', price: '420' },
    { key: 'b', option1: 'ACC', option2: 'PPC', price: '399.99' },
  ];
  it('sets a field for one brand only', () => {
    const out = bulkFill(base, { axis: 0, value: 'ultratech' }, 'stockQty', '50');
    expect(out[0].stockQty).toBe('50');
    expect(out[1].stockQty).toBeUndefined();
  });
  it('changes prices by a percentage, to the paisa', () => {
    const out = bulkFill(base, 'all', 'pricePct', '+2.5');
    expect(out.map(r => r.price)).toEqual(['430.5', '409.99']);
  });
});

describe('validation and saving', () => {
  const form = (patch = {}) => ({
    optionsEnabled: true,
    optionAxes: axes,
    optionRows: rebuildRows(axes, []).rows.map((r, i) => ({ ...r, price: String(400 + i * 10), stockQty: '10' })),
    unitLabel: 'bag',
    priceTiers: '',
    ...patch,
  });

  it('accepts a complete table', () => {
    expect(validateOptions(form())).toEqual([]);
  });

  it('explains what is missing or wrong', () => {
    const f = form();
    f.optionRows[0].price = '';
    f.optionRows[1].mrp = '100';
    f.optionRows[2].priceTiers = '50:900';
    f.optionRows[3].sku = 'bad sku!';
    const errors = validateOptions({ ...f, priceTiers: '50:395' });
    expect(errors.join('\n')).toMatch(/UltraTech · OPC 53: set a price/);
    expect(errors.join('\n')).toMatch(/MRP can't be lower/);
    expect(errors.join('\n')).toMatch(/lower than the normal price/);
    expect(errors.join('\n')).toMatch(/SKU may use only/);
    expect(errors.join('\n')).toMatch(/shared bulk discount must be a percentage/);
    expect(validateOptions({ ...form(), optionRows: [] })[0]).toMatch(/Build the price table/);
  });

  it('builds the request, and reads a saved product back into the editor', () => {
    const payload = optionsPayload(form({ priceTiers: '100:2%' }));
    expect(payload).toMatchObject({ unitLabel: 'bag', priceTiers: '100:2%', option1Name: 'Brand', option2Name: 'Grade', option3Name: null });
    expect(payload.variants).toHaveLength(4);
    expect(payload.variants[0]).toMatchObject({ option1: 'UltraTech', option2: 'OPC 53', option3: null, price: 400, stockQty: 10, minOrderQty: null, active: true });
    expect(optionsPayload({ optionsEnabled: false, unitLabel: '', priceTiers: '' })).toEqual({ unitLabel: '', priceTiers: '', variants: [] });

    const saved = {
      option1Name: 'Brand', option2Name: 'Grade', unitLabel: 'bag', priceTiers: '100:2%',
      variants: [
        { id: 'v1', option1: 'UltraTech', option2: 'OPC 53', price: 450, stockQty: 5, sku: 'UT-53', active: true },
        { id: 'v2', option1: 'ACC', option2: 'OPC 53', price: 430, mrp: 450, stockQty: 0, active: false },
      ],
    };
    const st = initOptionsState(saved);
    expect(st.optionsEnabled).toBe(true);
    // Existing options remember the stock the editor started from.
    expect(st.optionRows.map(r => r.stockQtyBase)).toEqual([5, 0]);
    const out = optionsPayload({ ...st, optionRows: st.optionRows.map(r => (r.id === 'v1' ? { ...r, stockQty: '25' } : r)) });
    expect(out.variants.find(v => v.id === 'v1')).toMatchObject({ stockQty: 25, stockQtyBase: 5 });
    expect(st.optionAxes).toEqual([{ name: 'Brand', values: 'UltraTech, ACC' }, { name: 'Grade', values: 'OPC 53' }]);
    expect(st.optionRows[1]).toMatchObject({ id: 'v2', price: '430', mrp: '450', active: false });
    expect(summarizeRows(st.optionRows)).toEqual({ count: 1, min: 450, max: 450, stock: 5 });
  });
});
