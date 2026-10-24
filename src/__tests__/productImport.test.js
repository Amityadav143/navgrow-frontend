/**
 * Bulk upload & update of products — including products sold in options
 * (Cement by Brand × Grade…), from Excel, CSV or pasted cells.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseCSV, detectDelimiter, rowsFromText, columnFor, COLUMNS, parseProductSheet, matchDrafts, draftProblems, draftNotes,
  isImportable, planUpdate, runImport, productsToRows, rowsToCsv, TEMPLATE_ROWS, templateWorkbook, exportWorkbook,
  apiErrorMessage, fetchAllProducts, resultsToCsv, readSpreadsheetFile, parseNumber, slugify,
} from '@/lib/productImport';
import { readXlsx, buildXlsx } from '@/lib/xlsx';

const fixture = (name) => readFileSync(join(process.cwd(), 'src/__tests__/fixtures', name));
const sheet = (text) => parseProductSheet(rowsFromText(text));
const csvRows = (rows) => parseCSV(rowsToCsv(rows));

/** An existing cement product with two options, as the API returns it. */
const cement = () => ({
  id: 'p-cem', slug: 'portland-cement', sku: 'NGP-CEM', name: 'Portland Cement', category: 'Civil & Construction',
  price: 410, priceMax: 450, mrp: null, gstRate: 18, hsnCode: '2523', stockQty: 500, minOrderQty: 10, unitLabel: 'bag',
  active: true, featured: false, description: 'Fresh cement.', priceTiers: '100:2%',
  option1Name: 'Brand', option2Name: 'Grade', option3Name: null,
  variants: [
    { id: 'v1', sku: 'CEM-UT-53', option1: 'UltraTech', option2: 'OPC 53', price: 450, mrp: 480, stockQty: 300, minOrderQty: null, priceTiers: '50:440', active: true },
    { id: 'v2', sku: 'CEM-ACC-PPC', option1: 'ACC', option2: 'PPC', price: 410, mrp: null, stockQty: 200, minOrderQty: null, priceTiers: '', active: true },
  ],
});
const helmet = () => ({
  id: 'p-hel', slug: 'safety-helmet', sku: 'NGP-HEL', name: 'Safety Helmet', category: 'Safety Equipment', price: 480, mrp: 650,
  gstRate: 18, hsnCode: '6506', stockQty: 120, minOrderQty: 1, active: true, featured: true, priceTiers: '10:450, 50:430', variants: [],
});

describe('reading sheets', () => {
  it('parses quoted commas, line breaks, "" escapes and keeps a mid-field inch mark', () => {
    const rows = parseCSV('﻿name,desc\n"Bolt, M12","Line 1\nLine ""2"""\nPipe 12" long,x\n');
    expect(rows).toEqual([['name', 'desc'], ['Bolt, M12', 'Line 1\nLine "2"'], ['Pipe 12" long', 'x']]);
  });

  it('keeps blank rows so row numbers match the sheet', () => {
    expect(parseCSV('a,b\n\n1,2\n\n')).toEqual([['a', 'b'], [''], ['1', '2']]);
  });

  it('detects tab, semicolon and comma separated text', () => {
    expect(detectDelimiter('Name\tPrice\nA\t1')).toBe('\t');
    expect(detectDelimiter('Name;Category;Price\nHelmet;PPE & Workwear;480')).toBe(';');
    expect(detectDelimiter('Name,Price\n"A; B",1')).toBe(',');
  });

  it('reads an Excel file written by openpyxl (shared strings, numbers, booleans, gaps)', async () => {
    const rows = await readXlsx(fixture('openpyxl-products.xlsx'));
    expect(rows[0].slice(0, 3)).toEqual(['Handle', 'Name', 'Category']);
    expect(rows[1]).toEqual(['portland-cement', 'Portland Cement', 'Civil & Construction', 'bag', '0.18', '2523', 'Brand', 'UltraTech',
      'Grade', 'OPC 53', 'CEM-UT-53', '450', '480', '500', '50:440, 200:430', 'TRUE']);
    expect(rows[2][7]).toBe('ACC');
    expect(rows[2][11]).toBe('410.5');
    expect(rows[3]).toEqual([]);                      // the blank row 4 is kept
    expect(rows[4][1]).toBe('Safety Helmet & Visor <ISI>');
    expect(rows[4][10]).toBe('00123');
    expect(rows[4][16]).toBe('Line 1\nLine 2 — ₹');
  });

  it('reads an Excel file written by LibreOffice', async () => {
    const rows = await readXlsx(fixture('libreoffice-price-list.xlsx'));
    expect(rows).toEqual([
      ['Name', 'Category', 'Brand', 'Grade', 'Price', 'Stock'],
      ['Portland Cement', 'Civil & Construction', 'UltraTech', 'OPC 53', '450', '500'],
      ['Portland Cement', 'Civil & Construction', 'ACC', 'PPC', '410', '0'],
      ['Safety Helmet', 'Safety Equipment', 'Karam', '', '480', '120'],
    ]);
  });

  it('writes workbooks it (and Excel) can read back — text, numbers, symbols, line breaks', async () => {
    const bytes = buildXlsx([{ name: 'Products', header: true, cols: [{ width: 10, text: true }, { width: 10 }],
      rows: [['SKU', 'Price'], ['00123', 450.5], ['A&B <C> "D" ₹ 🚚', null], ['Line 1\nLine 2', 0]] }]);
    expect(await readXlsx(bytes)).toEqual([['SKU', 'Price'], ['00123', '450.5'], ['A&B <C> "D" ₹ 🚚'], ['Line 1\nLine 2', '0']]);
  });

  it('reads files by type and refuses old .xls', async () => {
    const csv = { name: 'p.csv', size: 20, text: async () => 'Name;Price\nA;1' };
    expect(await readSpreadsheetFile(csv)).toEqual([['Name', 'Price'], ['A', '1']]);
    const xlsx = { name: 'p.xlsx', size: 10, arrayBuffer: async () => templateWorkbook() };
    expect((await readSpreadsheetFile(xlsx))[0][0]).toBe('Handle');
    await expect(readSpreadsheetFile({ name: 'old.xls', size: 5 })).rejects.toThrow(/\.xlsx/);
    await expect(readSpreadsheetFile({ name: 'big.csv', size: 11 * 1024 * 1024 })).rejects.toThrow(/10 MB/);
  });
});

describe('columns', () => {
  it('maps every template column back to itself', () => {
    for (const c of COLUMNS) expect(columnFor(c.label)).toBe(c.key);
  });

  it('understands everyday and Shopify headers', () => {
    expect(columnFor('Product Name')).toBe('name');
    expect(columnFor('Selling Price')).toBe('price');
    expect(columnFor('Variant Compare At Price')).toBe('mrp');
    expect(columnFor('Variant Inventory Qty')).toBe('stockQty');
    expect(columnFor('Body (HTML)')).toBe('description');
    expect(columnFor('Option 2 Value')).toBe('option2Value');
    expect(columnFor('MOQ')).toBe('minOrderQty');
    expect(columnFor('HSN/SAC')).toBe('hsnCode');
  });

  it('reads Indian money and number formats', () => {
    expect(parseNumber('₹1,00,000')).toBe(100000);
    expect(parseNumber('Rs. 420/-')).toBe(420);
    expect(parseNumber('')).toBeUndefined();
    expect(parseNumber('12 bags')).toBeNaN();
  });

  it('makes handles the way the server makes web addresses', () => {
    expect(slugify('Cement — OPC & PPC (50 kg bag)')).toBe('cement-opc-ppc-50-kg-bag');
    expect(slugify('Ciménto_Pro')).toBe('cimentopro');
  });
});

describe('sheet → products', () => {
  it('turns the template into one product per Handle, with its options', () => {
    const { drafts, warnings } = parseProductSheet(csvRows(TEMPLATE_ROWS));
    expect(warnings).toEqual([]);
    expect(drafts.map(d => [d.name, d.options.length])).toEqual([
      ['Cement — OPC & PPC (50 kg bag)', 4], ['TMT Steel Bars Fe 500D', 3], ['Industrial Safety Helmet (ISI)', 0],
    ]);
    const [cem, tmt, hel] = drafts;
    expect(cem.optionNames).toEqual(['Brand', 'Grade', 'Pack size']);
    expect(cem.options[0]).toMatchObject({ rowNumber: 2, values: ['UltraTech', 'OPC 53', '50 kg bag'], sku: 'CEM-UT-OPC53', price: 450, mrp: 480, stockQty: 500, minOrderQty: 10, bulkPrices: '50:440, 200:430', active: true });
    expect(cem.options[3]).toMatchObject({ values: ['ACC', 'PPC', '50 kg bag'], stockQty: 0, bulkPrices: undefined });
    expect(cem.fields).toMatchObject({ category: 'Civil & Construction', gstRate: '18', hsnCode: '2523', unitLabel: 'bag', active: true, featured: true });
    expect(cem.fields.description).toContain('\n');
    expect(tmt.optionNames).toEqual(['Diameter']);
    expect(hel.simple).toMatchObject({ sku: 'NGP-SAF-HELMET', price: 480, mrp: 650, stockQty: 120 });
    expect(drafts.every(d => draftProblems(d).length === 0)).toBe(true);
  });

  it('finds the header under a title row and reports real row numbers', () => {
    const { drafts } = sheet('Navgrow price list — Oct 2026\n\nName,Category,Price\nHelmet,Safety,0\n');
    expect(drafts[0].errors).toEqual(['Row 4: Price must be more than ₹0.']);
  });

  it('explains a sheet without a Name column', () => {
    expect(() => sheet('foo,bar\n1,2')).toThrow(/No “Name” or “SKU” column.*“foo”, “bar”/);
  });

  it('groups rows by Name, and blank-name rows continue the product above (Shopify style)', () => {
    const { drafts } = sheet([
      'Name,Category,Option1 Name,Option1 Value,Price,Stock',
      'Paint,Civil,Pack,1 L,250,10',
      ',,,4 L,900,5',
      'Paint,,,10 L,2100,2',
    ].join('\n'));
    expect(drafts).toHaveLength(1);
    expect(drafts[0].options.map(o => o.values[0])).toEqual(['1 L', '4 L', '10 L']);
  });

  it('reads plain Brand / Grade columns as options (a supplier price list)', async () => {
    const rows = await readXlsx(fixture('libreoffice-price-list.xlsx'));
    const { drafts, notices } = parseProductSheet(rows);
    expect(notices[0]).toMatch(/“Brand” and “Grade” are read as options/);
    const [cem, hel] = drafts;
    expect(cem.optionNames).toEqual(['Brand', 'Grade']);
    expect(cem.options.map(o => o.values)).toEqual([['UltraTech', 'OPC 53'], ['ACC', 'PPC']]);
    expect(hel.simple.price).toBe(480);
    expect(hel.attrs).toEqual([{ name: 'Brand', value: 'Karam' }]);
  });

  it('flags mistakes with the row they are on', () => {
    const { drafts } = sheet([
      'Name,Category,GST Rate,Option1 Name,Option1 Value,SKU,Price,MRP,Bulk Prices,Allowed Pincodes',
      'Cement,Civil,12,Brand,UltraTech,CEM-1,450,400,50:460,7340O1',
      'Cement,,,,UltraTech,CEM-2,440,,,',
      'Cement,,,,,CEM-1,430,,,',
      'Helmet,Safety,28%,,,CEM-2,480,,,',
    ].join('\n'));
    const [cem, hel] = drafts;
    const problems = draftProblems(cem).join('\n');
    expect(problems).toMatch(/Row 2: MRP \(₹400\) can't be lower than the price \(₹450\)/);
    expect(problems).toMatch(/Row 3: UltraTech is already on row 2/);
    expect(problems).toMatch(/Allowed Pincodes: “7340O1” isn't valid/);
    expect(cem.warnings.join('\n')).toMatch(/Row 4: price\/stock ignored/);
    expect(cem.warnings.join('\n')).toMatch(/12% was a GST slab before 22 Sep 2025/);
    expect(draftProblems(hel).join('\n')).toMatch(/Row 5: SKU CEM-2 is also on row 3/);
    // Bulk prices are checked against the price when the save is planned.
    matchDrafts(drafts, []);
    expect(draftProblems(cem).join('\n')).toMatch(/Row 2: Bulk Prices — The bulk price for 50\+ units \(₹460\) must be lower than the normal price \(₹450\)/);
  });

  it('two rows for the same single product is an error, not a silent overwrite', () => {
    const { drafts } = sheet('Name,Category,Price\nHelmet,Safety,480\nHelmet,Safety,500');
    expect(drafts[0].errors[0]).toMatch(/Rows 2, 3 all describe “Helmet”/);
  });

  it('reads a Shopify export as it is', () => {
    const { drafts } = sheet([
      'Handle,Title,Body (HTML),Vendor,Type,Published,Option1 Name,Option1 Value,Variant SKU,Variant Price,Variant Compare At Price,Variant Inventory Qty,Image Src,Status',
      'paint,Wall Paint,<p>Smooth finish</p>,Asian,Civil & Construction,TRUE,Size,1 L,PNT-1,250,300,10,https://cdn.example.com/a.jpg,active',
      'paint,,,,,,,4 L,PNT-4,900,,5,https://cdn.example.com/b.jpg,',
      'gloves,Cotton Gloves,,,Safety Equipment,FALSE,Title,Default Title,GLV-1,40,,500,,draft',
    ].join('\n'));
    const [paint, gloves] = drafts;
    expect(paint.options.map(o => [o.values[0], o.sku, o.price, o.stockQty])).toEqual([['1 L', 'PNT-1', 250, 10], ['4 L', 'PNT-4', 900, 5]]);
    expect(paint.fields).toMatchObject({ category: 'Civil & Construction', active: true, description: 'Smooth finish',
      imageUrl: 'https://cdn.example.com/a.jpg', imageUrls: 'https://cdn.example.com/b.jpg' });
    expect(gloves.options).toEqual([]);
    expect(gloves.simple).toMatchObject({ sku: 'GLV-1', price: 40, stockQty: 500 });
    expect(gloves.fields.active).toBe(false);
    expect(gloves.warnings).toEqual([]);
  });

  it('accepts Excel percent cells and "Nil" for GST', () => {
    const { drafts } = sheet('Name,Category,GST Rate,Price\nA,X,0.18,10\nB,X,Nil,10\nC,X,0.05,10');
    expect(drafts.map(d => d.fields.gstRate)).toEqual(['18', '0', '5']);
  });
});

describe('new products', () => {
  it('plans a product sold in options, with the handle as its web address', () => {
    const { drafts } = parseProductSheet(csvRows(TEMPLATE_ROWS));
    matchDrafts(drafts, []);
    const req = drafts[0].plan.request;
    expect(drafts[0].action).toBe('create');
    expect(req).toMatchObject({
      name: 'Cement — OPC & PPC (50 kg bag)', slug: 'opc-ppc-cement', category: 'Civil & Construction', unitLabel: 'bag',
      gstRate: 18, hsnCode: '2523', option1Name: 'Brand', option2Name: 'Grade', option3Name: 'Pack size', price: 410, active: true, featured: true,
    });
    expect(req.variants).toHaveLength(4);
    expect(req.variants[2]).toMatchObject({ sku: 'CEM-ACC-OPC53', option1: 'ACC', option2: 'OPC 53', option3: '50 kg bag', price: 440, mrp: 470, stockQty: 200, minOrderQty: 10, priceTiers: '50:2%, 200:4%', active: true });
    expect(drafts[2].plan.request).toMatchObject({ sku: 'NGP-SAF-HELMET', price: 480, priceTiers: '10:450, 50:430' });
    expect(drafts.every(isImportable)).toBe(true);
  });

  it('needs a category and a price', () => {
    const { drafts } = sheet('Name,Price\nHelmet,');
    matchDrafts(drafts, []);
    expect(draftProblems(drafts[0])).toEqual(['Row 2: Category is required for a new product.', 'Row 2: Price is required for a new product.']);
  });

  it('a single row with a Brand column becomes a product with that brand in its specifications', async () => {
    const { drafts } = parseProductSheet(await readXlsx(fixture('libreoffice-price-list.xlsx')));
    matchDrafts(drafts, []);
    expect(drafts[1].plan.request.specifications).toBe('Brand: Karam');
    expect(draftNotes(drafts[1])).toContain('Brand: Karam added to Specifications.');
  });
});

describe('updating existing products', () => {
  it('updates the options in the sheet, adds new ones and keeps the rest as they are', () => {
    const { drafts } = sheet([
      'Name,Option1 Value,Option2 Value,Price,Stock',      // no option names — taken from the product
      'Portland Cement,UltraTech,OPC 53,460,',
      'Portland Cement,Ambuja,PPC,415,80',
    ].join('\n'));
    matchDrafts(drafts, [cement(), helmet()]);
    const d = drafts[0];
    expect(d).toMatchObject({ action: 'update', matchedBy: 'Name' });
    expect(draftProblems(d)).toEqual([]);
    const { variants, option1Name, option2Name, price, priceTiers } = d.plan.request;
    expect([option1Name, option2Name]).toEqual(['Brand', 'Grade']);
    expect(variants).toHaveLength(3);
    expect(variants[0]).toMatchObject({ id: 'v1', price: 460, stockQty: 300, stockQtyBase: 300, priceTiers: '50:440', mrp: 480 });
    expect(variants[1]).toMatchObject({ id: 'v2', price: 410, stockQty: 200 });          // not in the sheet: unchanged
    expect(variants[2]).toMatchObject({ option1: 'Ambuja', option2: 'PPC', price: 415, stockQty: 80 });
    expect(variants[2].id).toBeUndefined();
    expect(price).toBe(410);
    expect(priceTiers).toBe('100:2%');
    expect(d.plan.changes).toEqual(['UltraTech · OPC 53: ₹450 → ₹460', '1 new option']);
  });

  it('matches options by SKU, and drops bulk prices a new price makes impossible', () => {
    const { drafts } = sheet('Name,Option1 Value,Option2 Value,SKU,Price\nPortland Cement,UltraTech,OPC 53,CEM-UT-53,430');
    matchDrafts(drafts, [cement()]);
    expect(drafts[0].plan.request.variants[0]).toMatchObject({ id: 'v1', price: 430, priceTiers: '' });
    expect(draftNotes(drafts[0]).join(' ')).toMatch(/bulk prices 50:440 removed/);
  });

  it('a stock list by SKU only updates products and options (rows of one product combined)', () => {
    const { drafts } = sheet('SKU,Price,Stock\nCEM-UT-53,,280\nNGP-HEL,470,\nCEM-ACC-PPC,405,190\nNOPE-1,10,1');
    const out = matchDrafts(drafts, [cement(), helmet()]);
    expect(out).toBe(drafts);
    expect(drafts.map(d => [d.existing?.id, d.rowNumbers])).toEqual([['p-cem', [2, 4]], ['p-hel', [3]], [undefined, [5]]]);
    expect(drafts[0].plan.request.variants.map(v => [v.id, v.price, v.stockQty])).toEqual([['v1', 450, 280], ['v2', 405, 190]]);
    expect(drafts[0].plan.changes).toEqual(['UltraTech · OPC 53: stock 300 → 280', 'ACC · PPC: ₹410 → ₹405, stock 200 → 190']);
    expect(drafts[1].plan.changes).toEqual(['Price ₹480 → ₹470']);
    expect(draftProblems(drafts[2])).toEqual(['Row 5: no product or option has SKU NOPE-1. To add it as a new product, add Name and Category columns.']);
  });

  it('says so when the option names do not match the product', () => {
    const { drafts } = sheet('Name,Option1 Name,Option1 Value,Price\nPortland Cement,Size,Large,500');
    matchDrafts(drafts, [cement()]);
    expect(draftProblems(drafts[0])[0]).toMatch(/“Portland Cement” is sold by Brand and Grade — fill all 2 options on each row/);
  });

  it('a price on a product sold in options needs the option', () => {
    const { drafts } = sheet('Name,Price\nPortland Cement,400');
    matchDrafts(drafts, [cement()]);
    expect(draftProblems(drafts[0])[0]).toMatch(/is sold in options — put prices and stock on one row per option/);
  });

  it('details-only updates leave the options alone', () => {
    const { drafts } = sheet('Name,Badge,Published\nPortland Cement,Bestseller,no');
    matchDrafts(drafts, [cement()]);
    expect(drafts[0].plan.request.variants).toBeUndefined();
    expect(drafts[0].plan.changes).toEqual(['Unpublished (draft)', 'Badge → Bestseller']);
  });

  it('a simple product: blank keeps, none clears, and stock is sent with the figure it was read at', () => {
    const { drafts } = sheet('SKU,Name,Price,MRP,Stock,Bulk Prices\nNGP-HEL,Safety Helmet,470,none,,');
    matchDrafts(drafts, [helmet()]);
    const { request, changes } = drafts[0].plan;
    expect(request).toMatchObject({ price: 470, mrp: null, stockQty: 120, stockQtyBase: 120, priceTiers: '10:450, 50:430', featured: true });
    expect(changes).toEqual(['Price ₹480 → ₹470', 'MRP removed']);
  });

  it('reports "no changes" when the sheet matches the shop', () => {
    const { drafts } = sheet('Name,Price,Stock\nSafety Helmet,480,120');
    matchDrafts(drafts, [helmet()]);
    expect(drafts[0].plan.changes).toEqual([]);
  });

  it('export → re-import changes nothing', () => {
    const products = [cement(), helmet()];
    const { drafts } = parseProductSheet(csvRows(productsToRows(products)));
    matchDrafts(drafts, products);
    expect(drafts.map(d => [d.action, d.matchedBy, draftProblems(d), d.plan.changes])).toEqual([
      ['update', 'Product SKU', [], []],
      ['update', 'SKU', [], []],
    ]);
  });

  it('a single price-list row updates that option of a product sold in options', () => {
    const { drafts } = sheet('Name,Grade,Brand,Price\nPortland Cement,PPC,ACC,399');
    matchDrafts(drafts, [cement()]);
    expect(draftProblems(drafts[0])).toEqual([]);
    expect(drafts[0].plan.request.variants[1]).toMatchObject({ id: 'v2', price: 399 });
  });

  it('refuses ambiguous names, the same product twice, and SKUs of other products', () => {
    const twin = { ...helmet(), id: 'p-hel2', slug: 'safety-helmet-2', sku: 'NGP-HEL2' };
    let { drafts } = sheet('Name,Price\nSafety Helmet,470');
    matchDrafts(drafts, [helmet(), twin]);
    expect(draftProblems(drafts[0])[0]).toMatch(/2 products are called “Safety Helmet” — add the Handle or SKU column/);

    ({ drafts } = sheet('Handle,SKU,Price\nsafety-helmet,,470\nother,NGP-HEL,460'));
    matchDrafts(drafts, [helmet()]);
    expect(draftProblems(drafts[1]).join(' ')).toMatch(/both update “Safety Helmet”/);

    ({ drafts } = sheet('Name,Category,SKU,Price\nNew Gloves,Safety,CEM-UT-53,40'));
    matchDrafts(drafts, [cement()]);
    expect(draftProblems(drafts[0]).join(' ')).toMatch(/SKU CEM-UT-53 is already used by an option of “Portland Cement”/);
  });

  it('a Handle no product has means a new product — a clashing option SKU is reported plainly', () => {
    const { drafts } = sheet('Handle,Name,Category,Option1 Name,Option1 Value,SKU,Price\nopc-cement,Portland Cement,Civil,Brand,ACC,CEM-ACC-PPC,400');
    matchDrafts(drafts, [cement()]);
    expect(drafts[0].action).toBe('create');
    expect(draftProblems(drafts[0])).toEqual(['Row 2: SKU CEM-ACC-PPC is already used by an option of “Portland Cement”.']);
  });

  it('a SKU and a Handle that point at different products is an error', () => {
    const { drafts } = sheet('Handle,SKU,Price\nhelmet-new,NGP-HEL,470');
    matchDrafts(drafts, [helmet()]);
    expect(draftProblems(drafts[0])[0]).toMatch(/the SKU belongs to “Safety Helmet”, whose Handle is safety-helmet — not helmet-new/);
  });

  it('only-new and only-updates modes skip the rest', () => {
    const text = 'Name,Category,Price\nSafety Helmet,Safety,470\nNew Gloves,Safety,40';
    let { drafts } = sheet(text);
    matchDrafts(drafts, [helmet()], { mode: 'create' });
    expect(drafts.map(d => d.action)).toEqual(['skip', 'create']);
    ({ drafts } = sheet(text));
    matchDrafts(drafts, [helmet()], { mode: 'update' });
    expect(drafts.map(d => d.action)).toEqual(['update', 'skip']);
    expect(drafts.filter(isImportable)).toHaveLength(1);
  });

  it('turns a single product into one sold in options', () => {
    const { drafts } = sheet('Name,Option1 Name,Option1 Value,SKU,Price,Stock\nSafety Helmet,Colour,Yellow,HEL-Y,480,50\nSafety Helmet,,White,HEL-W,490,20');
    matchDrafts(drafts, [helmet()]);
    const { request, changes, notes } = drafts[0].plan;
    expect(request.variants.map(v => v.option1)).toEqual(['Yellow', 'White']);
    expect(request.priceTiers).toBe('');
    expect(notes.join(' ')).toMatch(/will be sold in options: Colour/);
    expect(changes).toContain('Now sold in options: Colour');
  });
});

describe('running the import', () => {
  it('creates, updates, skips unchanged products and reports failures', async () => {
    const { drafts } = sheet('Name,Category,Price,Stock\nSafety Helmet,Safety Equipment,470,\nNew Gloves,Safety Equipment,40,500\nBad Boots,Safety Equipment,900,1\nPortland Cement,Civil & Construction,,');
    matchDrafts(drafts, [helmet(), cement()]);
    const api = {
      create: vi.fn(async (req) => {
        if (req.name === 'Bad Boots') throw { response: { status: 400, data: { message: 'Validation failed', fieldErrors: { sku: 'size must be between 0 and 64' } } } };
        return { data: { id: 'new', ...req } };
      }),
      get: vi.fn(async (slug) => ({ data: slug === 'safety-helmet' ? helmet() : cement() })),
      update: vi.fn(async (id, req) => ({ data: { id, ...req } })),
    };
    const progress = [];
    const results = await runImport(drafts, { api, onProgress: (p) => progress.push(p.done) });
    expect(results.map(r => r.status)).toEqual(['updated', 'created', 'failed', 'unchanged']);
    expect(results[2].message).toBe('sku: size must be between 0 and 64');
    expect(api.update).toHaveBeenCalledTimes(1);
    expect(api.update.mock.calls[0][1]).toMatchObject({ price: 470, stockQtyBase: 120 });
    expect(progress).toEqual([0, 1, 2, 3, 4]);
    expect(resultsToCsv(results)).toMatch(/^﻿Rows,Product,Result,Details\r\n2,Safety Helmet,Updated,Price ₹480 → ₹470\r\n/);
  });

  it('re-reads a product before updating it, so stock merges against the live figure', async () => {
    const { drafts } = sheet('Name,Option1 Value,Option2 Value,Stock\nPortland Cement,UltraTech,OPC 53,350');
    matchDrafts(drafts, [cement()]);
    const live = cement();
    live.variants[0].stockQty = 290;              // 10 bags sold since the preview
    const api = { get: async () => ({ data: live }), update: vi.fn(async () => ({ data: live })), create: vi.fn() };
    await runImport(drafts, { api });
    expect(api.update.mock.calls[0][1].variants[0]).toMatchObject({ id: 'v1', stockQty: 350, stockQtyBase: 290 });
  });

  it('stops after three connection failures in a row', async () => {
    const { drafts } = sheet('Name,Category,Price\nA,X,1\nB,X,1\nC,X,1\nD,X,1');
    matchDrafts(drafts, []);
    const api = { create: vi.fn(async () => { throw { request: {}, code: 'ERR_NETWORK' }; }) };
    const results = await runImport(drafts, { api });
    expect(results.map(r => r.status)).toEqual(['failed', 'failed', 'failed', 'skipped']);
    expect(api.create).toHaveBeenCalledTimes(3);
  });

  it('a missing product fails cleanly', async () => {
    const { drafts } = sheet('Name,Price\nSafety Helmet,470');
    matchDrafts(drafts, [helmet()]);
    const results = await runImport(drafts, { api: { get: async () => { throw { response: { status: 404 } }; } } });
    expect(results[0]).toMatchObject({ status: 'failed', message: 'This product no longer exists.' });
  });

  it('formats server errors', () => {
    expect(apiErrorMessage({ response: { status: 400, data: { message: 'SKU X is already used by "Y".' } } })).toBe('SKU X is already used by "Y".');
    expect(apiErrorMessage({ response: { status: 403, data: {} } })).toMatch(/permission/);
  });

  it('loads every page of the catalogue', async () => {
    const manage = vi.fn(async ({ page }) => ({ data: { content: [{ id: `p${page}` }], totalPages: 3 } }));
    expect((await fetchAllProducts(manage)).map(p => p.id)).toEqual(['p0', 'p1', 'p2']);
    expect(manage).toHaveBeenCalledWith({ page: 0, size: 200 });
  });
});

describe('template & export workbooks', () => {
  it('the Excel template reads back to the same products as the CSV one', async () => {
    const rows = await readXlsx(templateWorkbook());
    const a = parseProductSheet(rows).drafts;
    const b = parseProductSheet(csvRows(TEMPLATE_ROWS)).drafts;
    expect(a.map(d => [d.name, d.optionNames, d.options.map(o => [o.values, o.price, o.stockQty, o.bulkPrices]), d.simple?.price]))
      .toEqual(b.map(d => [d.name, d.optionNames, d.options.map(o => [o.values, o.price, o.stockQty, o.bulkPrices]), d.simple?.price]));
  });

  it('exports one row per option, and the export imports with no changes', async () => {
    const products = [cement(), helmet()];
    const rows = await readXlsx(exportWorkbook(products));
    expect(rows).toHaveLength(4);                     // header + 2 cement options + helmet
    const { drafts } = parseProductSheet(rows);
    matchDrafts(drafts, products);
    expect(drafts.flatMap(d => [...draftProblems(d), ...d.plan.changes])).toEqual([]);
  });
});
