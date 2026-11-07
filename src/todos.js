// Pure to-do logic, no HTTP. The unit tests cover this file.

export class ValidationError extends Error {}

export const MAX_TITLE_LENGTH = 80;

export function validateTitle(raw) {
  const title = String(raw ?? '').trim();
  if (!title) return { ok: false, error: 'Title is empty' };
  if (title.length > MAX_TITLE_LENGTH) {
    return { ok: false, error: `Title is longer than ${MAX_TITLE_LENGTH} characters` };
  }
  return { ok: true, title };
}

export function createStore() {
  let nextId = 1;
  const byUser = new Map();

  const itemsFor = (user) => {
    if (!byUser.has(user)) byUser.set(user, []);
    return byUser.get(user);
  };
  const find = (user, id) => itemsFor(user).find((t) => t.id === id);
  const checkedTitle = (raw) => {
    const result = validateTitle(raw);
    if (!result.ok) throw new ValidationError(result.error);
    return result.title;
  };

  return {
    list(user) {
      return itemsFor(user).map((t) => ({ ...t }));
    },

    add(user, rawTitle) {
      const todo = { id: nextId++, title: checkedTitle(rawTitle), done: false };
      itemsFor(user).push(todo);
      return { ...todo };
    },

    update(user, id, changes) {
      const todo = find(user, id);
      if (!todo) return null;
      if ('title' in changes) todo.title = checkedTitle(changes.title);
      if ('done' in changes) todo.done = Boolean(changes.done);
      return { ...todo };
    },

    remove(user, id) {
      const items = itemsFor(user);
      const index = items.findIndex((t) => t.id === id);
      if (index === -1) return false;
      items.splice(index, 1);
      return true;
    },

    reset() {
      byUser.clear();
      nextId = 1;
    },
  };
}
