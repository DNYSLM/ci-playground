// Exercise 10. Unit test for a function that does not exist yet.
// Copy into tests/unit/, watch it go red, then add clearCompleted to the store.
import { describe, expect, it } from 'vitest';
import { createStore } from '../../src/todos.js';

describe('clearCompleted', () => {
  it('removes done to-dos for that user only and returns how many went', () => {
    const store = createStore();
    const a = store.add('tester1', 'Done one');
    store.add('tester1', 'Still to do');
    const other = store.add('tester2', 'Someone else’s done one');
    store.update('tester1', a.id, { done: true });
    store.update('tester2', other.id, { done: true });

    expect(store.clearCompleted('tester1')).toBe(1);
    expect(store.list('tester1').map((t) => t.title)).toEqual(['Still to do']);
    expect(store.list('tester2')).toHaveLength(1);
  });
});
