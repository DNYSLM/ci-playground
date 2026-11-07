import { describe, expect, it } from 'vitest';
import { createStore, MAX_TITLE_LENGTH, validateTitle, ValidationError } from '../../src/todos.js';

describe('validateTitle', () => {
  it('trims whitespace', () => {
    expect(validateTitle('  Water plants  ')).toEqual({ ok: true, title: 'Water plants' });
  });

  it('rejects an empty title', () => {
    expect(validateTitle('   ').ok).toBe(false);
  });

  it(`rejects titles over ${MAX_TITLE_LENGTH} characters`, () => {
    expect(validateTitle('x'.repeat(MAX_TITLE_LENGTH)).ok).toBe(true);
    expect(validateTitle('x'.repeat(MAX_TITLE_LENGTH + 1)).ok).toBe(false);
  });
});

describe('createStore', () => {
  it('adds to-dos as not done, with increasing ids', () => {
    const store = createStore();
    const a = store.add('tester1', 'Water plants');
    const b = store.add('tester1', 'Post letter');
    expect(a).toEqual({ id: 1, title: 'Water plants', done: false });
    expect(b.id).toBe(2);
  });

  it('keeps each user’s to-dos separate', () => {
    const store = createStore();
    store.add('tester1', 'Mine');
    expect(store.list('tester2')).toEqual([]);
  });

  it('updates title and done', () => {
    const store = createStore();
    const { id } = store.add('tester1', 'Old');
    expect(store.update('tester1', id, { title: 'New', done: true })).toEqual({
      id,
      title: 'New',
      done: true,
    });
  });

  it('will not update another user’s to-do', () => {
    const store = createStore();
    const { id } = store.add('tester1', 'Mine');
    expect(store.update('tester2', id, { done: true })).toBeNull();
  });

  it('throws a ValidationError for a bad title', () => {
    const store = createStore();
    expect(() => store.add('tester1', '')).toThrow(ValidationError);
  });

  it('removes a to-do', () => {
    const store = createStore();
    const { id } = store.add('tester1', 'Gone soon');
    expect(store.remove('tester1', id)).toBe(true);
    expect(store.list('tester1')).toEqual([]);
    expect(store.remove('tester1', id)).toBe(false);
  });

  it('returns copies, so callers cannot change stored items', () => {
    const store = createStore();
    store.add('tester1', 'Original');
    store.list('tester1')[0].title = 'Hacked';
    expect(store.list('tester1')[0].title).toBe('Original');
  });
});
