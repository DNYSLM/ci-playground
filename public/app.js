// To-Do Deck front end. Plain JS, no build step.

// The rename field loads its draft from app state, and that state arrives
// a little later than the field itself (imagine a slow store).
const DRAFT_LOAD_MAX_MS = 150;

const state = {
  build: null,
  user: null,
  todos: [],
  editingId: null,
  editDraft: '',
};

const $ = (selector) => document.querySelector(selector);
const pad = (n) => String(n).padStart(2, '0');

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error ?? `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function setStatus(text, kind = 'ok') {
  const el = $('[data-cy=lcd-status]');
  el.textContent = text.toUpperCase();
  el.dataset.kind = kind;
}

function fail(err) {
  setStatus(`ERR ${err.message}`, 'error');
}

function renderBuild() {
  const { env, commit, version, startedAt } = state.build;
  $('[data-cy=lcd-env]').textContent = env.toUpperCase();
  $('[data-cy=lcd-commit]').textContent = commit;
  $('[data-cy=lcd-version]').textContent = version;
  const started = new Date(startedAt);
  $('[data-cy=lcd-started]').textContent = `${started.toISOString().slice(0, 10)} ${pad(
    started.getHours(),
  )}:${pad(started.getMinutes())}`;
}

function renderScreens() {
  $('[data-cy=login]').hidden = Boolean(state.user);
  $('[data-cy=deck]').hidden = !state.user;
  $('[data-cy=lcd-user]').textContent = state.user?.toUpperCase() ?? '';
}

function renderTodos() {
  const list = $('[data-cy=todo-list]');
  list.replaceChildren(...state.todos.map(renderTodo));
  const done = state.todos.filter((t) => t.done).length;
  $('[data-cy=lcd-count]').textContent = `${pad(done)}/${pad(state.todos.length)}`;
  $('[data-cy=empty]').hidden = state.todos.length > 0;
}

function renderTodo(todo) {
  const li = document.createElement('li');
  li.dataset.cy = 'todo-item';
  li.classList.toggle('done', todo.done);

  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.checked = todo.done;
  toggle.dataset.cy = 'todo-toggle';
  toggle.setAttribute('aria-label', `Done: ${todo.title}`);
  toggle.addEventListener('change', () => updateTodo(todo.id, { done: toggle.checked }));
  li.append(toggle);

  if (state.editingId === todo.id) {
    li.append(renderEditInput());
  } else {
    const title = document.createElement('span');
    title.className = 'todo-title';
    title.dataset.cy = 'todo-title';
    title.textContent = todo.title;
    title.addEventListener('dblclick', () => startEdit(todo));
    li.append(title);
  }

  const del = document.createElement('button');
  del.type = 'button';
  del.textContent = 'DEL';
  del.dataset.cy = 'todo-delete';
  del.setAttribute('aria-label', `Delete ${todo.title}`);
  del.addEventListener('click', () => deleteTodo(todo.id));
  li.append(del);

  return li;
}

function renderEditInput() {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = state.editDraft;
  input.dataset.cy = 'edit-input';
  input.setAttribute('aria-label', 'New title');

  input.addEventListener('input', (event) => {
    state.editDraft = event.target.value;
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveEdit(state.editDraft);
    } else if (event.key === 'Escape') {
      stopEdit();
    }
  });

  return input;
}

function startEdit(todo) {
  state.editingId = todo.id;
  state.editDraft = '';
  renderTodos();
  const input = $('[data-cy=edit-input]');
  input.focus();

  // Load the draft into the field once the store answers.
  setTimeout(() => {
    if (state.editingId !== todo.id) return;
    state.editDraft = todo.title;
    input.value = state.editDraft;
  }, Math.random() * DRAFT_LOAD_MAX_MS);
}

function stopEdit() {
  state.editingId = null;
  state.editDraft = '';
  renderTodos();
}

async function saveEdit(title) {
  const id = state.editingId;
  try {
    await updateTodo(id, { title });
    stopEdit();
  } catch {
    // updateTodo already showed the error; keep the field open.
  }
}

async function loadTodos() {
  state.todos = await api('GET', 'api/todos');
  renderTodos();
}

async function addTodo(title) {
  const todo = await api('POST', 'api/todos', { title });
  state.todos.push(todo);
  renderTodos();
  setStatus('Added');
}

async function updateTodo(id, changes) {
  try {
    const updated = await api('PATCH', `api/todos/${id}`, changes);
    state.todos = state.todos.map((t) => (t.id === id ? updated : t));
    if (state.editingId !== id) renderTodos();
    setStatus('Saved');
  } catch (err) {
    fail(err);
    throw err;
  }
}

async function deleteTodo(id) {
  try {
    await api('DELETE', `api/todos/${id}`);
    state.todos = state.todos.filter((t) => t.id !== id);
    renderTodos();
    setStatus('Deleted');
  } catch (err) {
    fail(err);
  }
}

$('[data-cy=login-form]').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const { username } = await api('POST', 'api/login', {
      username: $('[data-cy=login-username]').value,
      password: $('[data-cy=login-password]').value,
    });
    state.user = username;
    $('[data-cy=login-password]').value = '';
    renderScreens();
    await loadTodos();
    setStatus('Ready');
  } catch (err) {
    setStatus(err.status === 401 ? 'Login failed' : `ERR ${err.message}`, 'error');
  }
});

$('[data-cy=add-form]').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = $('[data-cy=new-title]');
  try {
    await addTodo(input.value);
    input.value = '';
  } catch (err) {
    fail(err);
  }
});

$('[data-cy=logout]').addEventListener('click', async () => {
  await api('POST', 'api/logout').catch(() => {});
  state.user = null;
  state.todos = [];
  renderScreens();
  renderTodos();
  setStatus('Ejected');
});

async function boot() {
  try {
    state.build = await api('GET', 'api/version');
    renderBuild();
    const me = await api('GET', 'api/me').catch(() => null);
    state.user = me?.username ?? null;
    renderScreens();
    if (state.user) await loadTodos();
    setStatus('Ready');
  } catch (err) {
    fail(err);
  }
}

boot();
