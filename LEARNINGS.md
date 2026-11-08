# What this project taught

A draft retrospective of building the Kanban board, written from what actually happened: the
decisions that paid off, the bugs the tests caught, and the numbers. Edit it into your own words.

## 1. Architecture

**Keep the domain pure, and everything else gets easier.** The board reducer (Phase 1) is plain
TypeScript with no React. That one decision was reused four times:

- **Drag preview (Phase 3):** `boardReducer(state, moveCard(...))` shows the board _as if_
  dropped, without dispatching. Escape just discards it.
- **Undo (Phase 5):** a higher-order reducer wraps it. Because unchanged data is shared,
  snapshots are cheap, and undoing a column delete restores its cards with no inverse logic.
- **Sync (Phase 6):** rollback is "replace with the last confirmed state".
- **Filtering (Phase 8):** the same action, with its index translated from the visible list
  to the full one.

**Returning the same object for no-op actions** looked like a detail in Phase 1. It paid off
later:

- React skips re-renders.
- History skips recording with one `===` check.
- The sync manager can tell "undone back to what's saved" without a deep compare.

**Separate UI state from data.** The open dialog, the drag preview and the filter never
touch the reducer, so they can't pollute undo history or get saved by accident.

**Feature boundaries enforced by lint.** The DnD engine knows nothing about boards: it emits
events, and the board turns them into actions and sentences. When a test reached into
`features/board/persistence/...`, lint stopped it, and the fix was a better public API.

## 2. Drag and drop is mostly about edge cases

- **Click or drag?** A 5px threshold for mouse and a 250ms long-press for touch. The click that
  follows a drop must be suppressed, but _not_ after a cancel caused by the browser
  (`pointercancel`), or the user's next real click is swallowed.
- **Flicker-free targets.** Computing the drop index as if the dragged item were removed from
  its list makes the result independent of where the preview currently shows it.
- **Elements get re-created.** A card moved to another column is a new DOM node, which loses
  pointer capture (hence window listeners) and focus (hence focus restoration after every
  commit).
- **Order of DOM work matters.** Focus and scroll first, then FLIP. Measure before scrolling.
  All reads, then all writes.
- **Keyboard and screen readers aren't an add-on.** Because the engine separates "where would
  it drop" from "where is the pointer", keyboard drags reused the whole pipeline. The engine
  emits events, and the app writes the sentences.

## 3. Tests found real bugs

| Bug                                                                                                                                   | Found by                      |
| ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Enter in "rename column" re-opened the editor (the keypress "clicked" the refocused button)                                           | RTL test, confirmed in Chrome |
| Hidden text gave cards the name "Title , has description" (absolute positioning adds a space)                                         | Playwright, not jsdom         |
| The page scrolled sideways instead of the board (grid items default to `min-width: auto`)                                             | Auto-scroll e2e test          |
| A card moved off-screen by keyboard wasn't scrolled into view (FLIP ran before `scrollIntoView`)                                      | Playwright                    |
| Undo pressed right after a drop was ignored (status was `dropping`, not `idle`)                                                       | Playwright, both browsers     |
| The loading skeleton made the page scroll sideways on phones                                                                          | An _existing_ regression test |
| A StrictMode-discarded load promise was reported as an unhandled rejection                                                            | Reading the dev server's log  |
| A keyboard move across columns took **~10 seconds** with 5,000 cards (FLIP animated everything after a scroll, with layout thrashing) | The benchmark                 |
| Swiping on a card couldn't scroll the board on phones (`overscroll-behavior` contained both axes)                                     | A real-touch test via CDP     |
| The column count badge was just under 4.5:1 contrast                                                                                  | axe                           |

Lessons about the tests themselves:

- **Prove a test can fail.** Several times, deleting the guarded code (or injecting a
  violation) showed whether a test protected anything. One `keyup` workaround turned out
  to be unnecessary in _both_ browsers, so it was deleted rather than kept "just in case".
- **jsdom isn't a browser.** It has no `<dialog>`, no layout, no `scrollTo`, and quirks in
  accessible names. Use it for logic and flows; use Playwright for geometry, focus and real
  input.
- **Write the test you meant.** Two early persistence tests didn't test what their names
  claimed (a `route()` that intercepted nothing). Reading your own tests critically matters.

## 4. Performance: measure first

- **The first "slow load" (2.4s) was the benchmark's own generator.** It replayed 5,000
  actions, which is O(n²). Virtualizing lists would have "fixed" a problem in the test harness.
- **Context re-renders every consumer.** An external store with `useSyncExternalStore`
  selectors, per-item drag subscriptions and `memo` took most updates from about 30ms to one
  frame.
- **Some costs belong to the browser, not React.** A bare `showModal()` costs 13ms on a small
  page and 56ms with 5,000 cards. Only fewer DOM nodes would fix that.
  `content-visibility: auto` helped with no trade-offs. Full windowing was skipped on
  purpose, because the numbers didn't justify its accessibility costs.

## 5. Persistence

- **Classify failures.** Retry network errors and keep the user's work. Roll back definite
  rejections. Resolve conflicts in one place.
- **One request in flight**, with later changes merged into the next save, removes a whole
  class of out-of-order bugs.
- **Never overwrite data you can't read.** Back it up, and refuse data from a newer version.
- **Validate integrity, not just shape.** A board whose column points at a missing card is
  well-formed JSON and still crashes the UI.

## 6. Accessibility

- **Native elements first.** `<dialog>` with `showModal()`, `<fieldset>`, checkboxes,
  `type="search"`.
- **The name is the label; extra facts are the description.** Card names stay their titles,
  and "Has description" and labels go in `aria-describedby`.
- **Use `aria-disabled`, not `disabled`, on buttons that can become unavailable while
  focused**, so focus isn't dropped.
- **Colour is never the only cue.** Every label chip shows its name.
- **Focus must survive DOM changes:** drag across columns, undo of the focused item, dialogs
  closing.

## 7. If I started again

- **Decide the sync model before the data model.** Document sync with revisions fit arrays.
  Operation sync would want fractional-index ordering from day one.
- **Set up the benchmark harness early.** The FLIP bug existed from Phase 3 and was only
  visible at scale.
- **Run tests in two browsers from the start.** Several "Chrome does X" assumptions were only
  settled by trying Firefox.
