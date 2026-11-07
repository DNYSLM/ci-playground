import { describe, expect, it } from 'vitest';
import { parseSeedUsers } from '../../src/seed.js';

describe('parseSeedUsers', () => {
  it('splits, trims, lower-cases and de-duplicates', () => {
    expect(parseSeedUsers(' Tester1, tester2 ,tester1,')).toEqual(['tester1', 'tester2']);
  });

  it('rejects usernames with odd characters', () => {
    expect(() => parseSeedUsers('tester1,bad name')).toThrow(/bad name/);
  });

  it('returns an empty list for nothing', () => {
    expect(parseSeedUsers(undefined)).toEqual([]);
  });
});
