# CI playground: To-Do Deck

A tiny to-do app with a deliberately breakable CI pipeline. Everything here is
made up and safe to wreck. Break things on purpose, watch what CI does, put
them back.

## What is in the box

| Path | What |
| --- | --- |
| `server.js`, `src/`, `public/` | The app: plain Node, no framework, data in memory |
| `tests/unit/` | Vitest unit tests |
| `cypress/e2e/` | Cypress end-to-end tests (the normal suite) |
| `cypress/flaky/` | Exercise 3's flaky test, parked outside the suite |
| `exercises/` | Files you copy in during exercises 6 and 10 |
| `.github/workflows/` | `ci.yml`, `release.yml`, `preview.yml`, `infra-drill.yml` |
| `deploy/` | Deploy scripts, router, systemd units, Plesk nginx snippet, `VPS-SETUP.md` |
| `scripts/` | Helpers for the exercises |

The app reports what it is running at `/api/version` and on its top LCD
readout: environment, commit, version and start time.

## Run it locally

```bash
cp .env.example .env
npm install
npm start
```

Open http://localhost:3000 and log in as `tester1` with the password from
`.env`. In a second terminal:

```bash
npm run test:unit
npm run e2e
```

## Set it up on GitHub

1. Use your **personal** identity, never a work one. In this folder:

   ```bash
   git config user.name "<personal name>"
   git config user.email "<personal email or GitHub noreply address>"
   gh auth switch --user <personal GitHub account>
   gh auth status            # check the active account before creating anything
   ```

2. Commit, then create a **public** repo in that account (private repos need
   GitHub Pro for required checks) and push:

   ```bash
   git add -A && git commit -m "To-Do Deck CI playground"
   gh repo create ci-playground --public --source . --push
   ```
3. *Settings > Actions > General*: under fork pull request workflows, require
   approval for all outside collaborators.
4. *Settings > General*: tick "Automatically delete head branches"
   (exercise 5 relies on it).
5. The VPS part (staging, production, previews, the runner):
   [`deploy/VPS-SETUP.md`](deploy/VPS-SETUP.md).

Until the VPS runner exists, the jobs that need it (`deploy-staging`,
`preview-*`, `deploy-production`, `infra-drill`) sit queued. That is expected:
cancel them.

| Exercise | Needs |
| --- | --- |
| 1, 3, 5, 6, 8, 10 | GitHub only (3 and 10 also run locally) |
| 2, 4, 7 | GitHub and the VPS |
| 9 | GitHub; the production half needs the VPS |

Do exercises 2 and 5 **before** exercise 9: they push straight to main, which
branch protection then stops.

---

## 1. Parallel E2E shards

`ci.yml` runs the Cypress specs in three parallel jobs, `e2e (shard 1..3)`.
`scripts/shard-specs.mjs` deals the spec files out between them. One extra job,
`e2e-summary`, passes only if every shard passed. Branch protection requires
`e2e-summary`, not the shards, so you can change the shard count without
touching the protection rules.

**Break it**

1. Make one spec fail: change `'Water plants'` to `'Water plans'` in the
   assertion in `cypress/e2e/add-todo.cy.js`. Open a PR.
2. Then, on the same PR, delete `if: always()` from `e2e-summary` in `ci.yml`.
3. Bonus: change the matrix to `shard: [1, 2, 3, 4, 5, 6, 7]`.

**What you'll see**

1. One shard red, two green, `e2e-summary` red.
2. `e2e-summary` turns grey (skipped). Once branch protection is on
   (exercise 9), GitHub treats a skipped required check as passing. So the
   merge button can go green while a shard is red. Check whether it does.
3. Shard 7 prints `runs: nothing` and skips Cypress. Without that guard, an
   empty spec list would make Cypress run *every* spec.

**What it teaches**

* A summary job gives branch protection one stable name to require.
* `if: always()` is what makes a summary honest. Without it, "skipped" quietly
  reads as "fine".
* `fail-fast: false` lets every shard finish, so you see all failures at once.
  Set it to `true` to watch one failure cancel the rest.

## 2. Merged is not deployed

`deploy-staging` needs `unit`, `e2e` and `secrets-scan`. If any of them fails,
the deploy is **skipped**: no error, just grey. Staging carries on serving the
previous commit.

**Break it**

1. Push a commit straight to main that changes something visible, such as the
   `<h1>` in `public/index.html`.
2. In the same push, break an unrelated test (the version spec, say).

**What you'll see**

The run is red on a test you didn't touch. `deploy-staging` is grey. Staging
still shows the old heading. Find out what is really live:

```bash
BASE_DOMAIN=<your domain> scripts/whats-live.sh
```

Staging's commit doesn't match main. The `BUILD` readout on the staging page
shows the same.

**What it teaches**

* "It's merged" says nothing about what users get. `/api/version` (or any
  build stamp) does.
* A skipped deploy is the quietest failure in CI. Look for grey jobs, not just
  red ones.
* Ask yourself: should an unrelated E2E failure block a deploy? It's a real
  trade-off, not a bug.

## 3. A flaky test

`cypress/flaky/rename.cy.js` double-clicks a to-do, clears the field, types a
new title and presses Enter. The edit field loads its draft from app state a
moment after it appears (anywhere from 0 to 150 ms). Cypress types fast.

**Break it**

```bash
scripts/repeat-flaky.sh 20
```

Then bring it into CI: `git mv cypress/flaky/rename.cy.js cypress/e2e/`, open a
PR and press *Re-run jobs* a few times.

**What you'll see**

Roughly 4 in 10 runs fail on a laptop (13 of 30 when this was built). CI
machines are slower or faster, so expect a different rate there. A failure
reads:

```
- 'Buy milkPick up the dry cleaning on Friday'
+ 'Pick up the dry cleaning on Friday'
```

The same code passes on one run and fails on the next.

**Tell flaky from broken**

* Broken fails every time. Flaky fails sometimes, with the code unchanged.
* Run it 20 times before you believe one result in either direction.
* Read the actual value. `Buy milk` glued to the front means the field was
  cleared, then refilled, then typed into. That's a timing story.

**Fix it properly**

Try the tempting fixes first and say why each one is wrong:

* `cy.wait(200)` before typing: slower, and still a guess on a slow CI box.
* `retries: 2` in `cypress.config.js`: CI goes green while the bug stays.

<details>
<summary>The proper fix (open once you've tried)</summary>

The bug is in the app: the field accepts typing before its draft has loaded,
then overwrites it. A fast typist, a paste or autofill would hit it too. Fix it
in `public/app.js`: set `input.disabled = true` when the field appears, and
`input.disabled = false` plus `input.focus()` once the draft has loaded.
Cypress already waits for a field to be enabled before typing, so the test
needs no change. With that fix, 30 out of 30 runs passed.

</details>

**What it teaches**

A flaky test is often an honest test of a racy app. Fix the race, not the test.
Make "ready" visible (disabled, a spinner, a data attribute) and let the test
wait for it.

## 4. Infrastructure failure or test failure?

`infra-drill.yml` runs on the VPS runner. Start it from *Actions > infra-drill
> Run workflow* and pick a mode.

**Break it**

1. Mode `infra-failure`. While it says "You have 2 minutes", SSH to the VPS as
   `devplay` and run `systemctl --user stop github-runner`. Wait for the job to
   die, then `systemctl --user start github-runner`.
2. Mode `test-failure`. Let it run.
3. On each one, press *Re-run failed jobs*.

**What you'll see**

1. The job dies mid-step with a message about the runner shutting down or
   losing contact, and no test output at all. The rerun passes (it waits the
   2 minutes again; leave the runner alone this time).
2. A normal assertion failure: `DRILL_MODE=test-failure was set`. The rerun
   fails in exactly the same way.

A third infrastructure signature: start any VPS job while the runner is
stopped. It sits at "Waiting for a runner" and never starts.

**What it teaches**

* First question on any red job: did the tests run? No test output plus a
  runner or connection message means infrastructure.
* A rerun is the right first move for an infrastructure failure, and the wrong
  one for a real failure. If a rerun "fixes" a test failure, you have exercise
  3, not a fix.

## 5. Stacked PRs that drift

**Break it**

```bash
scripts/make-stack.sh     # PRs: main <- stack-a <- stack-b <- stack-c
scripts/drift-main.sh     # pushes 201 commits to main, one of them conflicting
```

**What you'll see**

`stack-a` is 201 commits behind main (the branch list shows the count), and
its PR has a conflict on `stack/notes.md`.

**Work it out**

1. Rebase `stack-a` on main, fix the conflict, then
   `git push --force-with-lease`.
2. Squash-merge `stack-a`. GitHub deletes the branch and retargets `stack-b`
   to main.
3. `stack-b` still carries `stack-a`'s original commit, which main now has in
   squashed form. Replay only `stack-b`'s own commit onto main:
   `git fetch && git rebase --onto origin/main stack-b~1 stack-b`, then
   `git push --force-with-lease`. Here the old base is `stack-b~1` because
   `stack-b` has one commit of its own. In real stacks, note the base SHA
   before you rebase the lower branch, or find it in `git reflog`.
4. Decide that `stack-c` is superseded. Open a fresh PR from main with its
   change, then close `stack-c` with a comment: "Superseded by #<new>".

**What it teaches**

* "N commits behind" isn't scary. Conflicts are, and they come from a few
  files, not from the count.
* Squash merges break stacks. `rebase --onto` is the repair.
* Closing a PR with a pointer to its replacement keeps the history readable.
  Leaving it open leaves a trap.

## 6. A manual workflow with no Run button

**Break it**

On a new branch:

```bash
git switch -c add-smoke
cp exercises/06-manual-workflow/smoke.yml .github/workflows/smoke.yml
git add . && git commit -m "Add smoke workflow" && git push -u origin add-smoke
```

Look for `smoke` under *Actions*. Then try
`gh workflow run smoke.yml --ref add-smoke` and read what it says.

**What you'll see**

No `smoke` workflow in the list and no Run button, and the CLI won't start it
either. Merge the PR and the button appears. From then on you can run it against
*any* branch with the "Use workflow from" picker, using that branch's copy of
the file.

**What it teaches**

GitHub only lists `workflow_dispatch` workflows that exist on the default
branch. To iterate on one from a branch, land a stub on main first, then run
your branch's version with the picker or `--ref`.

## 7. A preview environment per PR

`preview.yml` builds every PR on the VPS. The preview runs at
`https://preview.<BASE_DOMAIN>/pr-<n>/` with the seeded accounts `tester1` and
`tester2`, whose password is the `PREVIEW_SEED_PASSWORD` secret. The test API
is on, so E2E can reset its data. Closing the PR tears it all down.

**Break it**

1. Open a PR. Wait for the bot comment and open the link.
2. Push again. The preview updates, and no second comment appears.
3. Stop the runner, then close the PR. Start the runner again.

**What you'll see**

1. and 2.: a live copy of your branch, `ENV PREVIEW` on the LCD.
3. The teardown job waits for the runner. Once the runner is back, the job
   runs and the preview goes. If a teardown ever fails outright, the preview
   keeps running. Find leftovers as `devplay` with
   `systemctl --user list-units 'todo@pr-*'`.

**What it teaches**

* Every PR gets its own disposable environment, with known test accounts and
  no shared data to fight over.
* Teardown is the part that rots. Check for leftovers now and then.
* Previews run your branch's code on your server. That's why they never run
  for forks, and why the runner is a user that owns nothing else.
* All previews share one host, `preview.`, because `slotboom.ninja` sends HSTS
  for every subdomain (so previews must be HTTPS) and a wildcard certificate
  needs DNS access Plesk doesn't have here. Real teams solve this with a
  wildcard certificate; the router's path prefix is the cheap version.

## 8. Secrets stay out of the repo

Passwords live only in GitHub secrets (`STAGING_SEED_PASSWORD`,
`PROD_SEED_PASSWORD`, `PREVIEW_SEED_PASSWORD`) and in your local `.env`, which
is gitignored. CI's E2E jobs need no secret at all: each run makes a throwaway
password and masks it. `secrets-scan` runs gitleaks over the **whole history**
and fails if a `.env` file is tracked.

**Break it**

1. `scripts/fake-secret.sh` prints a fake `pgk_` key. Paste it into any file,
   commit, push a PR.
2. Remove it in a second commit and push again.
3. `git add -f .env` and push.

**What you'll see**

1. `secrets-scan` red, naming the file, line and rule `playground-key` (the
   value is redacted).
2. **Still red.** The key is in history, and history is what was pushed.
3. Red again: "These .env files are tracked by git".

To get green, rewrite the branch so the key never existed (for example
`git rebase -i` and drop the commit, then force-push), and treat the key as
leaked: rotate it.

**What it teaches**

* Deleting a secret doesn't un-leak it. Rotate first, clean history second.
* Throwaway environments can generate throwaway credentials. Only long-lived
  ones need stored secrets.
* Cypress 16 reads secrets with `cy.env()` and plain values with
  `Cypress.expose()`, so a secret never ends up in the browser bundle.

## 9. Branch protection and releases

**Break it**

```bash
scripts/protect-main.sh        # undo: scripts/protect-main.sh off
```

1. `git push origin main` with any commit.
2. Open a draft PR with green checks.
3. Open a PR, let main move on, then try to merge.
4. Merge something, then tag it: `git tag v0.1.0 && git push origin v0.1.0`.
5. Tag a commit that isn't on main:
   `git tag v0.1.1 <some-branch-commit> && git push origin v0.1.1`.

**What you'll see**

1. Push rejected: changes must go through a PR, even yours.
2. No merge button until you mark it ready for review.
3. "This branch is out-of-date": `strict: true` requires an update first.
4. Main has already deployed to staging. The tag runs `release.yml`, which
   deploys that exact commit to `prod.` and shows `VER v0.1.0` on the LCD.
5. `release` fails at "Refuse tags that are not on main". Production is
   untouched.

`enforce_admins` is on, so even you, the owner, can't bypass the rules. Set it
to `false` in the script and push again: GitHub lets you through and says
which rules you bypassed. That is the gap admins fall through.

**What it teaches**

* Required checks are only as good as their names. Exercise 1 is why the rule
  requires `e2e-summary`.
* main deploys to staging, tags deploy to production. You choose when
  production changes, and the tag records what went.
* Put a required reviewer on the `production` environment for a manual gate.

## 10. Test first

The feature: a "Clear completed" button. Its tests are already written and
waiting in `exercises/10-test-first/`.

**Break it**

```bash
cp exercises/10-test-first/clear-completed.test.js tests/unit/
cp exercises/10-test-first/clear-completed.cy.js cypress/e2e/
npm run test:unit
npm start   # second terminal: npm run e2e
```

**What you'll see**

Red, for the right reasons:

* unit: `TypeError: store.clearCompleted is not a function`
* E2E: `Expected to find element: [data-cy=clear-completed], but never found it`

Now build it in small steps and rerun after each one. Watch the failures
change, then go green:

1. `clearCompleted(user)` in `src/todos.js`. Unit test goes green.
2. An API route in `server.js`, such as `POST /api/todos/clear-completed`.
3. A `CLEAR` button with `data-cy="clear-completed"` in `public/index.html`.
   Disable it while nothing is done, and wire it up in `public/app.js`.

Then do one on your own. Write the tests first for "a to-do can't be added
twice with the same title", watch them fail, then build it.

**What it teaches**

* A test you've seen fail is a test you can trust.
* The red messages are a to-do list. Each step should change the failure, not
  just the code.
* Writing the acceptance test first makes you decide what "done" means before
  anyone argues about it.
