# Kanban Board: Implementation Plan

A Trello-style Kanban board built from scratch to learn advanced frontend skills:
drag and drop, normalized state, undo/redo, optimistic persistence, accessibility, and performance.

**Stack:** Vite · React 19 · TypeScript (strict) · CSS Modules + CSS custom properties · Vitest + React Testing Library · Playwright

**Ground rules**

- No UI or drag-and-drop libraries. We build the hard parts ourselves. Once ours works, we compare it with `dnd-kit` (Phase 8).
- The domain logic (`model/`, `dnd/core/`) is plain TypeScript with no React. It's pure and tested before any UI uses it.
- Each phase ends with something that works, passing tests, and a commit.
- Workflow: Claude explains the design, then writes the code, then you review it. Styling is written by Claude.

---

## Key design decisions

| Concern          | Decision                                                                                                                                     | Why                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| State shape      | **Normalized**: `cards: Record<Id, Card>`, `columns: Record<Id, Column>` (each column holds an ordered `cardIds: Id[]`), `columnOrder: Id[]` | O(1) lookups. A move only touches two arrays. Easy to select narrowly.             |
| State updates    | **Pure reducer** with typed, discriminated-union actions                                                                                     | Testable without React. Makes undo/redo and persistence easy to add.               |
| React wiring     | Start with Context + `useReducer`. In Phase 7, move to an external store with `useSyncExternalStore` and selectors                           | You _feel_ the re-render problem first, then fix it.                               |
| Undo/redo        | A **higher-order reducer** (`withHistory(reducer)`) with `past / present / future` snapshots                                                 | Immutable state makes snapshots cheap through structural sharing.                  |
| Drag and drop    | **Pointer Events** + `setPointerCapture`, a drag overlay rendered in a portal, rects measured once at drag start, FLIP animations            | One code path for mouse, touch and pen. No layout thrashing.                       |
| Keyboard DnD     | Space picks up, arrows move, Space drops, Esc cancels, announced through an `aria-live` region                                               | WCAG 2.1.1 requires a keyboard alternative to dragging.                            |
| Persistence      | A `BoardRepository` interface with two adapters (localStorage, fake async API), a versioned schema validated with `zod`, and migrations      | Components don't know where data lives. Corrupt or old data never crashes the app. |
| Server sync      | Optimistic updates with rollback and a toast on failure                                                                                      | Real-world pattern. The fake API injects latency and random failures.              |
| Styling          | CSS Modules + design tokens (`--color-*`, `--space-*`, `--radius-*`), light/dark themes, `prefers-reduced-motion` support                    | Scoped styles, zero runtime cost, themable.                                        |
| Folder structure | **Feature-based**, with a public `index.ts` per feature                                                                                      | Features stay self-contained. The DnD engine stays independent of the board.       |

---

## Folder structure

```
complex Ui/
├─ index.html
├─ package.json
├─ vite.config.ts
├─ tsconfig.json / tsconfig.app.json / tsconfig.node.json
├─ .oxlintrc.json             # oxlint: react-hooks, jsx-a11y, import boundaries
├─ .prettierrc
├─ playwright.config.ts
├─ e2e/
│  └─ board.spec.ts            # real drag-and-drop in a real browser
└─ src/
   ├─ main.tsx
   ├─ app/
   │  ├─ App.tsx
   │  └─ providers.tsx          # composes BoardProvider, DndProvider, ToastProvider
   ├─ styles/
   │  ├─ tokens.css             # design tokens, light + dark
   │  ├─ reset.css
   │  └─ global.css
   ├─ shared/                   # generic, feature-agnostic
   │  ├─ ui/                    # Button, IconButton, Dialog, Toast, VisuallyHidden, InlineEdit
   │  ├─ hooks/                 # useEventListener, useLatest, useHotkeys, useMediaQuery
   │  └─ lib/                   # id.ts, invariant.ts, geometry.ts, arrayMove.ts
   ├─ features/
   │  ├─ board/
   │  │  ├─ model/              # PURE TS, no React
   │  │  │  ├─ types.ts         # Card, Column, BoardState, Id
   │  │  │  ├─ actions.ts       # discriminated-union actions + creators
   │  │  │  ├─ reducer.ts / reducer.test.ts
   │  │  │  ├─ history.ts / history.test.ts   # withHistory() undo/redo
   │  │  │  └─ selectors.ts
   │  │  ├─ store/
   │  │  │  ├─ BoardProvider.tsx
   │  │  │  └─ hooks.ts         # useBoardSelector, useBoardActions
   │  │  ├─ persistence/
   │  │  │  ├─ repository.ts    # BoardRepository interface
   │  │  │  ├─ localStorageRepository.ts
   │  │  │  ├─ fakeApiRepository.ts   # latency + random failures
   │  │  │  ├─ schema.ts        # zod schema, versioned
   │  │  │  └─ migrations.ts
   │  │  ├─ components/
   │  │  │  ├─ Board/           # Board.tsx, Board.module.css, Board.test.tsx
   │  │  │  ├─ Column/
   │  │  │  ├─ Card/
   │  │  │  ├─ AddCardForm/
   │  │  │  ├─ AddColumnForm/
   │  │  │  └─ CardDetailsDialog/
   │  │  └─ index.ts            # public API of the feature
   │  ├─ dnd/                   # generic DnD engine that knows nothing about boards
   │  │  ├─ core/               # PURE TS
   │  │  │  ├─ types.ts
   │  │  │  ├─ collision.ts / collision.test.ts
   │  │  │  └─ autoScroll.ts
   │  │  ├─ DndProvider.tsx
   │  │  ├─ useDraggable.ts
   │  │  ├─ useDroppable.ts
   │  │  ├─ DragOverlay.tsx
   │  │  ├─ useKeyboardDnd.ts
   │  │  ├─ announcements.ts
   │  │  └─ index.ts
   │  └─ command-palette/       # stretch (Phase 9)
   └─ test/
      ├─ setup.ts
      ├─ factories.ts           # makeCard(), makeBoard()
      └─ renderWithProviders.tsx
```

**Import rules:** `features/*` may import from `shared/`. A feature may import another feature only through its `index.ts`. `shared/` never imports from `features/`. oxlint enforces these rules (`no-restricted-imports`).

---

## Phases and tasks

### Phase 0: Tooling and setup

- [x] 0.1 Node 24 via nvm, pinned in `.nvmrc`
- [x] 0.2 `git init`, and add `.gitignore`
- [x] 0.3 Scaffold Vite `react-ts`. Turn on strict TS, plus `noUncheckedIndexedAccess`.
- [x] 0.4 oxlint (react, react-hooks, jsx-a11y, import, vitest, import boundaries) and Prettier. Uses oxlint instead of ESLint because the current Vite template ships it, it's much faster, and it covers every rule we planned.
- [x] 0.5 Vitest + jsdom + React Testing Library + user-event, and `src/test/setup.ts`
- [x] 0.6 Playwright with one smoke test
- [x] 0.7 Scripts: `dev`, `build`, `test`, `test:e2e`, `lint`, `typecheck`
- [x] 0.8 Path alias `@/` → `src/`. Folders are created with their first real file (git doesn't track empty folders).

**Done when:** `npm run check` (typecheck, lint, format, unit tests) and `npm run test:e2e` pass. ✅

### Phase 1: Domain model (pure TS, test-first)

- [x] 1.1 `types.ts`: branded `CardId` / `ColumnId`, `Card`, `Column`, `BoardState`
- [x] 1.2 `actions.ts`: `addCard`, `updateCard`, `deleteCard`, `moveCard`, `addColumn`, `renameColumn`, `deleteColumn`, `moveColumn`
- [x] 1.3 `reducer.ts`, with exhaustive `switch` checking (`assertNever`)
- [x] 1.4 `reducer.test.ts`: cover every action, edge cases (same-column move, out-of-range index, deleting a column cascades to its cards) and immutability
- [x] 1.5 `selectors.ts`, `seed.ts` (demo board), and `test/factories.ts` (`makeBoard`, `layoutOf`, `deepFreeze`)

**Decisions made:** IDs and timestamps are generated in action creators, never in the reducer. Invalid or no-op actions return the same state object instead of throwing. Cards do not store their `columnId`.

**Done when:** every action is covered, tests run against frozen state, `npm run check` passes. ✅

**Learn:** normalization, discriminated unions, immutable updates, exhaustiveness checks.

### Phase 2: Static UI and styling

- [x] 2.1 Design tokens (light/dark), reset, global styles
- [x] 2.2 `Board` → `Column` → `Card` rendered from seed state with Context + `useReducer`
- [x] 2.3 Horizontal scrolling board, vertically scrolling columns, sticky column headers
- [x] 2.4 Add/edit/delete for cards and columns (inline edit, `AddCardForm`)
- [x] 2.5 `CardDetailsDialog` built on native `<dialog>`, with focus trapping and returning focus on close
- [x] 2.6 Component tests with RTL (queries by role and name only)

**Decisions made:** state and dispatch live in separate contexts, and components read state through `useBoardSelector`, so Phase 7 can swap in a store without changing them. The dialog uses native `showModal()`: the page behind becomes inert, and Tab may go to the browser's own UI, which is expected. Card hints use `aria-describedby`, not hidden text in the name. jsdom lacks `<dialog>` and `scrollTo`, so `src/test/setup.ts` stubs them and Playwright covers the real behaviour.

**Done when:** `npm run check` and `npm run test:e2e` pass. Checked visually in light, dark, and at phone width. ✅

**Learn:** semantic HTML, CSS Modules, design tokens, accessible dialogs.

### Phase 3: Drag-and-drop engine (pointer)

- [x] 3.1 `dnd/core/types.ts` and `collision.ts` (closest center / pointer-within), unit-tested
- [x] 3.2 `DndProvider`: drag lifecycle state machine (`idle → pending → dragging → dropping`)
- [x] 3.3 `useDraggable`: pointer down, an activation threshold (about 5px, so clicks still work), `setPointerCapture`
- [x] 3.4 `useDroppable`: register containers and measure rects at drag start
- [x] 3.5 `DragOverlay` in a portal, moved with `transform` inside `requestAnimationFrame`
- [x] 3.6 Placeholder / drop indicator, and siblings shifting out of the way
- [x] 3.7 Auto-scroll near the edges of the board and columns
- [x] 3.8 Wire it to the board: reorder cards within and across columns, and reorder columns
- [x] 3.9 FLIP animation on drop, disabled under `prefers-reduced-motion`
- [x] 3.10 Playwright e2e test for dragging a card across columns

**Departures from the plan:**

- **Window listeners instead of `setPointerCapture`.** A card that moves to another column remounts as a new element, which would lose pointer capture.
- **Live preview instead of shifting items with transforms.** The board renders `boardReducer(state, dragToAction(drag))`, so the dragged item's own element is the placeholder. A drop dispatches the same action. Drop targets are computed from a layout where the dragged item is removed, so they can't flicker back and forth.
- **The overlay is a DOM clone managed outside React, not a React portal.** Moving it never re-renders anything.
- **Positions are re-measured after every commit and scroll, not only at drag start.** Measuring uses `offsetTop`/`offsetLeft`, which ignore in-flight FLIP transforms.
- **Found and fixed a Phase 2 layout bug.** The page scrolled sideways instead of the board (`grid-template-columns: minmax(0, 1fr)`).

**Done when:** `npm run check` and `npm run test:e2e` pass, and the drag tests pass 5× in a row. ✅

**Learn:** pointer events, coordinate math, state machines, rAF, avoiding layout thrashing, FLIP.

### Phase 4: Keyboard and screen-reader DnD

- [ ] 4.1 `useKeyboardDnd`: Space/Enter picks up, arrows move, Space drops, Esc cancels
- [ ] 4.2 An `aria-live` announcer ("Picked up card X. Position 2 of 5 in To Do.")
- [ ] 4.3 Roving tabindex / focus management that keeps focus on the moved card
- [ ] 4.4 Tests for the keyboard flow, and a manual screen-reader pass (Orca on Linux)

**Learn:** WAI-ARIA patterns, live regions, focus management.

### Phase 5: Undo/redo

- [ ] 5.1 The `withHistory(reducer)` higher-order reducer, with a history limit (for example 100)
- [ ] 5.2 Decide which actions are undoable (not UI-only state)
- [ ] 5.3 Shortcuts: `Ctrl+Z` / `Ctrl+Shift+Z`, skipped while typing in inputs
- [ ] 5.4 Undo/redo buttons, plus tests

**Learn:** higher-order reducers, structural sharing, the command pattern compared with snapshots.

### Phase 6: Persistence and optimistic updates

- [ ] 6.1 The `BoardRepository` interface
- [ ] 6.2 `localStorageRepository` with a debounced save, a versioned `zod` schema, migrations, and a safe fallback for corrupt data
- [ ] 6.3 `fakeApiRepository` with configurable latency and failure rate
- [ ] 6.4 Optimistic updates: apply locally, sync, roll back and show a toast on failure
- [ ] 6.5 Loading, error and empty states
- [ ] 6.6 Sync across tabs with the `storage` event or `BroadcastChannel`
- [ ] 6.7 (Advanced) Fractional indexing for order keys. Discuss why servers prefer it to arrays.

**Learn:** the repository pattern, schema validation, optimistic UI, race conditions.

### Phase 7: Performance

- [ ] 7.1 A seed generator for 50 columns × 5,000 cards. Profile with the React DevTools Profiler.
- [ ] 7.2 Move to an external store + `useSyncExternalStore` + narrow selectors
- [ ] 7.3 Use `React.memo` / stable callbacks where profiling shows they help
- [ ] 7.4 Virtualize long columns (hand-written windowing, then compare with `@tanstack/react-virtual`)
- [ ] 7.5 Make DnD work with virtualized lists (measuring rows that aren't rendered)
- [ ] 7.6 Record before/after numbers in this file

**Learn:** render profiling, subscription granularity, virtualization trade-offs.

### Phase 8: Polish and retrospective

- [ ] 8.1 Filtering/search and labels on cards
- [ ] 8.2 Responsive/touch pass (long-press to drag on mobile)
- [ ] 8.3 Swap in `dnd-kit` on a branch and compare its API and design with ours
- [ ] 8.4 Final a11y audit (axe in Playwright) and Lighthouse
- [ ] 8.5 Write up what you learned

### Phase 9 (stretch)

- ⌘K command palette with fuzzy search
- Real-time collaboration with Yjs (CRDT)

---

## Quality bar (every phase)

- `lint`, `typecheck`, `test` are green before each commit
- Each pure module has unit tests. Each interactive flow has an RTL or Playwright test.
- No `any`. No `// @ts-ignore` without a comment explaining why.
- Every interactive element is reachable and usable by keyboard.
