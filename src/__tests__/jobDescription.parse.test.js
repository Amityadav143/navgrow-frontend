import { describe, it, expect } from 'vitest';
import { parseJobDescription } from '@/components/JobDetailModal';

describe('parseJobDescription', () => {
  it('splits a typical admin-written description into sections', () => {
    const desc = [
      'We are hiring a Site Safety Officer for our Siliguri railway projects.',
      '',
      'Responsibilities:',
      '- Conduct daily site safety audits',
      '- Deliver toolbox talks to site crews',
      '',
      'Requirements:',
      '• Diploma in Industrial Safety',
      '• 3+ years on railway or construction sites',
      '',
      'Benefits:',
      '- Provident fund and ESI',
    ].join('\n');

    const r = parseJobDescription(desc);
    expect(r.about).toContain('Site Safety Officer');
    expect(r.responsibilities).toEqual([
      'Conduct daily site safety audits',
      'Deliver toolbox talks to site crews',
    ]);
    expect(r.requirements).toEqual([
      'Diploma in Industrial Safety',
      '3+ years on railway or construction sites',
    ]);
    expect(r.benefits).toEqual(['Provident fund and ESI']);
  });

  it('recognises alternate heading wording', () => {
    const desc = [
      'What you\'ll do',
      '1. Prepare tender documents',
      'What we\'re looking for',
      '2. Strong Excel skills',
    ].join('\n');
    const r = parseJobDescription(desc);
    expect(r.responsibilities).toEqual(['Prepare tender documents']);
    expect(r.requirements).toEqual(['Strong Excel skills']);
  });

  it('treats leading bullets with no heading as duties', () => {
    const r = parseJobDescription('Role summary line\n- First duty\n- Second duty');
    expect(r.about).toBe('Role summary line');
    expect(r.responsibilities).toEqual(['First duty', 'Second duty']);
  });

  it('leaves unstructured prose untouched rather than mangling it', () => {
    const plain = 'A single paragraph with no headings or bullets at all.';
    const r = parseJobDescription(plain);
    expect(r.about).toBe(plain);
    expect(r.responsibilities).toEqual([]);
    expect(r.requirements).toEqual([]);
  });

  it('handles empty and missing input safely', () => {
    expect(parseJobDescription('').about).toBe('');
    expect(parseJobDescription(undefined).responsibilities).toEqual([]);
    expect(parseJobDescription(null).benefits).toEqual([]);
  });
});
