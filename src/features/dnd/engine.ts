import { autoScrollDelta } from './core/autoScroll'
import { computeDropTarget, sameTarget } from './core/collision'
import { distance, toRect } from './core/geometry'
import { keyboardTarget } from './core/keyboard'
import type { ActiveItem, Axis, DropTarget, MeasuredContainer, Point, Rect } from './core/types'
import {
  canScroll,
  getScrollableAncestors,
  measureLayoutRect,
  MOTION,
  prefersReducedMotion,
} from './dom'
import { createOverlay, type Overlay } from './overlay'

/*
 * Drag lifecycle:
 *
 *   idle ──pointerdown──▶ pending ──moved 5px (mouse/pen) or held 250ms (touch)──▶ dragging
 *    │ ▲                    │ released / scrolled                                   ▲    │
 *    │ │◀───────────────────┘                                                       │    │
 *    │ │                                                                            │    │
 *    └─┼──────────────────────────── Space on a handle (keyboard) ──────────────────┘    │
 *      │                                                                                 │
 *      └──────────────── settled ◀──────── dropping ◀──── drop / Escape / cancel ────────┘
 *
 * `pending` lives only in the engine; React sees idle, dragging and dropping.
 */

export type DragStatus = 'idle' | 'dragging' | 'dropping'
export type DragMode = 'pointer' | 'keyboard'

export interface DragSnapshot {
  readonly status: DragStatus
  readonly mode: DragMode | null
  readonly active: ActiveItem | null
  readonly target: DropTarget | null
}

export interface DropEvent {
  readonly active: ActiveItem
  readonly target: DropTarget
}

/** Lifecycle events, e.g. for screen-reader announcements. `cancel` has no target. */
export type DragEvent =
  | {
      readonly type: 'start' | 'move' | 'drop'
      readonly active: ActiveItem
      readonly target: DropTarget
    }
  | { readonly type: 'cancel'; readonly active: ActiveItem; readonly target: null }

export interface DndEngineOptions {
  onDrop: (event: DropEvent) => void
  onEvent?: ((event: DragEvent) => void) | undefined
}

interface ContainerEntry {
  id: string
  type: string
  axis: Axis
  element: HTMLElement
}

interface ItemEntry {
  id: string
  type: string
  containerId: string
  element: HTMLElement
}

interface Pending {
  itemId: string
  pointerId: number
  pointerType: string
  start: Point
  last: Point
  timer: number | undefined
}

interface PointerTracking {
  pointerId: number
  start: Point
  pointer: Point
  origin: Rect
  overlay: Overlay
  scrollables: HTMLElement[]
  frame: number
}

interface Session {
  mode: DragMode
  active: ActiveItem
  /** Where the item started; the target a cancel returns to. */
  home: DropTarget
  target: DropTarget
  containers: MeasuredContainer[]
  /** Layout changed (scroll or re-render) since the last measurement. */
  dirty: boolean
  /** Only for pointer drags. */
  pointer: PointerTracking | null
  removeListeners: () => void
}

type FinishReason = 'drop' | 'escape' | 'cancel'

const IDLE: DragSnapshot = { status: 'idle', mode: null, active: null, target: null }
const ACTIVATION_DISTANCE = 5
const TOUCH_DELAY = 250
const IGNORE_SELECTOR = 'input, textarea, select, [contenteditable], [data-dnd-ignore]'
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export type DndEngine = ReturnType<typeof createDndEngine>

/** Framework-agnostic drag-and-drop engine. React binds to it via subscribe/getSnapshot. */
export function createDndEngine(initialOptions: DndEngineOptions) {
  let options = initialOptions
  const containers = new Map<string, ContainerEntry>()
  const items = new Map<string, ItemEntry>()
  const listeners = new Set<() => void>()
  const flipAnimations = new WeakMap<HTMLElement, Animation>()

  let snapshot: DragSnapshot = IDLE
  let pending: Pending | null = null
  let session: Session | null = null
  /** Item positions captured just before a re-render, for FLIP. */
  let flipBefore: Map<string, Rect> | null = null
  /** A finished drag waiting for its overlay to land (or just for focus to be restored). */
  let settling: { overlay: Overlay | null; activeId: string; mode: DragMode } | null = null

  function setSnapshot(next: DragSnapshot) {
    snapshot = next
    for (const listener of listeners) listener()
  }

  function emit(event: DragEvent) {
    options.onEvent?.(event)
  }

  // ── Registry ────────────────────────────────────────────────────────────────

  function registerContainer(entry: ContainerEntry) {
    containers.set(entry.id, entry)
    return () => {
      if (containers.get(entry.id)?.element === entry.element) containers.delete(entry.id)
      if (session) session.dirty = true
    }
  }

  function registerItem(entry: ItemEntry) {
    items.set(entry.id, entry)
    return () => {
      // During a cross-container preview the item remounts; never delete the newer registration.
      if (items.get(entry.id)?.element === entry.element) items.delete(entry.id)
    }
  }

  // ── Measuring ───────────────────────────────────────────────────────────────

  function measure(type: string): MeasuredContainer[] {
    const itemsByElement = new Map<Element, ItemEntry>()
    for (const item of items.values()) {
      if (item.type === type) itemsByElement.set(item.element, item)
    }

    const result: MeasuredContainer[] = []
    for (const container of containers.values()) {
      if (container.type !== type) continue
      const rect = toRect(container.element.getBoundingClientRect())
      // DOM order is display order; skip children that aren't sortable items (e.g. "Add" buttons).
      const measured = [...container.element.children].flatMap((child) => {
        const item = itemsByElement.get(child)
        return item
          ? [{ id: item.id, rect: measureLayoutRect(item.element, container.element, rect) }]
          : []
      })
      result.push({ id: container.id, axis: container.axis, rect, items: measured })
    }
    return result
  }

  /**
   * Where items are on screen now, for FLIP. Only the containers involved in a move can change
   * layout, so only their items are measured: 3 columns instead of every card on the board.
   */
  function snapshotRects(type: string, containerIds: Iterable<string>): Map<string, Rect> {
    const involved = new Set(containerIds)
    const rects = new Map<string, Rect>()
    for (const item of items.values()) {
      if (item.type === type && involved.has(item.containerId)) {
        rects.set(item.id, toRect(item.element.getBoundingClientRect()))
      }
    }
    return rects
  }

  // ── Starting a drag ─────────────────────────────────────────────────────────

  /** Common setup for both modes. Returns null if the item can't be dragged right now. */
  function begin(itemId: string, mode: DragMode, removeListeners: () => void): Session | null {
    const item = items.get(itemId)
    if (!item) return null

    const measured = measure(item.type)
    const homeIndex =
      measured.find((c) => c.id === item.containerId)?.items.findIndex((i) => i.id === itemId) ?? -1
    if (homeIndex === -1) return null

    const home = { containerId: item.containerId, index: homeIndex }
    session = {
      mode,
      active: { id: item.id, type: item.type, containerId: item.containerId },
      home,
      target: home,
      containers: measured,
      dirty: false,
      pointer: null,
      removeListeners,
    }
    setSnapshot({ status: 'dragging', mode, active: session.active, target: home })
    emit({ type: 'start', active: session.active, target: home })
    return session
  }

  /** Moves the drop target, capturing positions first so the re-render can animate (FLIP). */
  function moveTarget(s: Session, target: DropTarget) {
    if (sameTarget(target, s.target)) return
    flipBefore = snapshotRects(s.active.type, [
      s.active.containerId,
      s.target.containerId,
      target.containerId,
    ])
    s.target = target
    setSnapshot({ status: 'dragging', mode: s.mode, active: s.active, target })
    emit({ type: 'move', active: s.active, target })
  }

  // ── Pointer: pending (click, scroll, or drag?) ──────────────────────────────

  function handlePointerDown(event: PointerEvent, itemId: string) {
    if (snapshot.status !== 'idle' || pending || session) return
    if (!event.isPrimary || event.button !== 0) return
    if (event.target instanceof Element && event.target.closest(IGNORE_SELECTOR)) return
    if (!items.has(itemId)) return

    const start = { x: event.clientX, y: event.clientY }
    pending = {
      itemId,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      start,
      last: start,
      timer: undefined,
    }
    if (event.pointerType === 'touch') {
      pending.timer = window.setTimeout(() => pending && activatePointer(pending.last), TOUCH_DELAY)
    }
    window.addEventListener('pointermove', onPendingMove)
    window.addEventListener('pointerup', clearPending)
    window.addEventListener('pointercancel', clearPending)
    window.addEventListener('contextmenu', preventDefault)
  }

  function onPendingMove(event: PointerEvent) {
    if (!pending || event.pointerId !== pending.pointerId) return
    pending.last = { x: event.clientX, y: event.clientY }
    if (distance(pending.start, pending.last) < ACTIVATION_DISTANCE) return

    // Touch: moving before the delay means the user is scrolling, not dragging.
    if (pending.pointerType === 'touch') clearPending()
    else activatePointer(pending.last)
  }

  function clearPending() {
    if (!pending) return
    window.clearTimeout(pending.timer)
    pending = null
    window.removeEventListener('pointermove', onPendingMove)
    window.removeEventListener('pointerup', clearPending)
    window.removeEventListener('pointercancel', clearPending)
    window.removeEventListener('contextmenu', preventDefault)
  }

  // ── Pointer: dragging ───────────────────────────────────────────────────────

  function activatePointer(pointer: Point) {
    if (!pending) return
    const { itemId, pointerId, start } = pending
    clearPending()

    const element = items.get(itemId)?.element
    if (!element) return
    const origin = toRect(element.getBoundingClientRect())

    const onMove = (event: PointerEvent) => {
      if (event.pointerId === pointerId && session?.pointer) {
        session.pointer.pointer = { x: event.clientX, y: event.clientY }
      }
    }
    const onUp = (event: PointerEvent) => {
      if (event.pointerId === pointerId) finish('drop')
    }
    const removeListeners = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('blur', onCancel)
      window.removeEventListener('keydown', onPointerDragKeyDown, true)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('contextmenu', preventDefault)
      window.removeEventListener('touchmove', preventDefault)
    }

    const s = begin(itemId, 'pointer', removeListeners)
    if (!s) return

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('blur', onCancel)
    window.addEventListener('keydown', onPointerDragKeyDown, true)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('contextmenu', preventDefault)
    // Stop the page from scrolling under a touch drag (needs a non-passive listener).
    window.addEventListener('touchmove', preventDefault, { passive: false })

    s.pointer = {
      pointerId,
      start,
      pointer,
      origin,
      overlay: createOverlay(element, origin),
      scrollables: [
        ...new Set(
          s.containers.flatMap((c) => {
            const container = containers.get(c.id)
            return container ? getScrollableAncestors(container.element) : []
          }),
        ),
      ],
      frame: requestAnimationFrame(tick),
    }
    document.documentElement.dataset['dndDragging'] = ''
    window.getSelection()?.removeAllRanges()
  }

  const onCancel = () => finish('cancel')

  function onScroll() {
    if (session) session.dirty = true
  }

  function onPointerDragKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    finish('escape')
  }

  /**
   * One frame. Scrolling comes first: the target (and the FLIP snapshot taken when it changes)
   * must be computed against the final scroll position, or a scroll would look like movement.
   */
  function tick() {
    const s = session
    const p = s?.pointer
    if (!s || !p) return

    for (const element of p.scrollables) {
      const delta = autoScrollDelta(p.pointer, element.getBoundingClientRect())
      const x = canScroll(element, 'horizontal') ? delta.x : 0
      const y = canScroll(element, 'vertical') ? delta.y : 0
      if (x || y) {
        element.scrollBy(x, y)
        s.dirty = true // the scroll event only arrives later
      }
    }

    if (s.dirty) {
      s.containers = measure(s.active.type)
      s.dirty = false
    }

    const target = computeDropTarget(p.pointer, s.containers, s.active.id)
    if (target) moveTarget(s, target)

    p.overlay.moveTo(
      p.origin.left + p.pointer.x - p.start.x,
      p.origin.top + p.pointer.y - p.start.y,
    )
    p.frame = requestAnimationFrame(tick)
  }

  // ── Keyboard ────────────────────────────────────────────────────────────────

  /** Space on a handle picks the item up. Enter is left alone (it opens or edits). */
  function handleKeyDown(event: KeyboardEvent, itemId: string) {
    if (event.key !== ' ' || event.repeat) return
    if (snapshot.status !== 'idle' || pending || session) return
    if (event.target instanceof Element && event.target.closest(IGNORE_SELECTOR)) return

    // Cancelling keydown also cancels the button's own Space "click" (verified in Chrome and Firefox).
    event.preventDefault()
    const removeListeners = () => {
      window.removeEventListener('keydown', onKeyboardDragKeyDown, true)
      window.removeEventListener('pointerdown', onCancel, true)
      window.removeEventListener('blur', onCancel)
    }
    if (!begin(itemId, 'keyboard', removeListeners)) return

    window.addEventListener('keydown', onKeyboardDragKeyDown, true)
    window.addEventListener('pointerdown', onCancel, true)
    window.addEventListener('blur', onCancel)
  }

  function onKeyboardDragKeyDown(event: KeyboardEvent) {
    const s = session
    if (!s || s.mode !== 'keyboard') return

    // While carrying an item, the keyboard belongs to the drag.
    event.preventDefault()
    event.stopPropagation()
    if (event.repeat && (event.key === ' ' || event.key === 'Enter')) return

    switch (event.key) {
      case ' ':
      case 'Enter':
        finish('drop')
        return
      case 'Escape':
        finish('cancel')
        return
      case 'Tab':
        return // Keep focus on the carried item.
      default:
        s.containers = measure(s.active.type)
        moveTarget(s, keyboardTarget(event.key, s.target, s.containers, s.active.id))
    }
  }

  // ── Finishing ───────────────────────────────────────────────────────────────

  /**
   * - drop: commit the target.
   * - escape: pointer drag cancelled with the button still held; the coming release must not click.
   * - cancel: Escape in keyboard mode, or the browser took the pointer away; nothing to suppress.
   */
  function finish(reason: FinishReason) {
    const s = session
    if (!s) return
    session = null
    s.removeListeners()

    const p = s.pointer
    if (p) {
      cancelAnimationFrame(p.frame)
      delete document.documentElement.dataset['dndDragging']
      // The release that ends a drag must not also "click" whatever is under the pointer.
      if (reason !== 'cancel') suppressNextClick({ untilNextPointerUp: reason === 'escape' })
    }

    flipBefore = snapshotRects(s.active.type, [s.active.containerId, s.target.containerId])
    if (reason === 'drop') {
      options.onDrop({ active: s.active, target: s.target })
      emit({ type: 'drop', active: s.active, target: s.target })
    } else {
      emit({ type: 'cancel', active: s.active, target: null })
    }
    settling = { overlay: p?.overlay ?? null, activeId: s.active.id, mode: s.mode }
    setSnapshot({ status: 'dropping', mode: s.mode, active: s.active, target: null })
  }

  // ── After React commits ─────────────────────────────────────────────────────

  /**
   * Called from a layout effect after each render. The order matters:
   * 1. Measure FLIP moves first, before anything scrolls: a scroll is not a move.
   * 2. Keep focus and scroll the item into view (no FLIP transforms are applied yet, so the
   *    browser sees real positions).
   * 3. Start the FLIP animations.
   */
  function afterCommit() {
    const moves = flipBefore ? measureFlip(flipBefore) : []
    flipBefore = null

    if (session) session.dirty = true
    if (session?.mode === 'keyboard') keepFocus(session.active.id, { scroll: true })

    let landed: Rect | undefined
    const done = snapshot.status === 'dropping' ? settling : null
    if (done) {
      settling = null
      // A moved item may have been re-created; give focus back so keyboard users don't lose their place.
      keepFocus(done.activeId, {
        scroll: done.mode === 'keyboard',
        onlyIfLost: done.mode === 'pointer',
      })
      const element = items.get(done.activeId)?.element
      landed = element && toRect(element.getBoundingClientRect())
    }

    playFlip(moves)

    if (done) {
      const settle = done.overlay ? done.overlay.settleTo(landed) : Promise.resolve()
      void settle.then(() => {
        done.overlay?.destroy()
        if (snapshot.status === 'dropping') setSnapshot(IDLE)
      })
    }
  }

  /** Puts focus back on the item's handle (or the first focusable element inside it). */
  function keepFocus(itemId: string, { scroll = false, onlyIfLost = false } = {}) {
    const element = items.get(itemId)?.element
    if (!element) return
    const focused = document.activeElement
    const lost = !focused || focused === document.body || !focused.isConnected
    if (onlyIfLost && !lost) return

    if (!element.contains(focused)) {
      const handle = element.querySelector<HTMLElement>('[data-dnd-handle]') ?? element
      const target = handle.matches(FOCUSABLE)
        ? handle
        : handle.querySelector<HTMLElement>(FOCUSABLE)
      target?.focus({ preventScroll: true })
    }
    if (scroll) element.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }

  /**
   * FLIP: First (rects before the change), Last (rects now), Invert (translate back), Play.
   * This part measures. It does all writes (cancelling running animations), then all reads,
   * so the browser lays out once instead of once per item (layout thrashing).
   */
  function measureFlip(before: Map<string, Rect>) {
    if (prefersReducedMotion()) return []
    const elements = [...before].flatMap(([id, first]) => {
      const element = items.get(id)?.element
      return element ? [{ element, first }] : []
    })
    for (const { element } of elements) flipAnimations.get(element)?.cancel()

    return elements.flatMap(({ element, first }) => {
      const last = element.getBoundingClientRect()
      const dx = first.left - last.left
      const dy = first.top - last.top
      return Math.abs(dx) < 1 && Math.abs(dy) < 1 ? [] : [{ element, dx, dy }]
    })
  }

  /** FLIP, the playing part: only writes. */
  function playFlip(moves: { element: HTMLElement; dx: number; dy: number }[]) {
    for (const { element, dx, dy } of moves) {
      flipAnimations.set(
        element,
        element.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
          MOTION,
        ),
      )
    }
  }

  /** Abort any drag in progress, e.g. when the provider unmounts. The engine stays usable. */
  function cancel() {
    clearPending()
    if (session) finish('cancel')
    settling?.overlay?.destroy()
    settling = null
    if (snapshot.status !== 'idle') setSnapshot(IDLE)
  }

  return {
    setOptions(next: DndEngineOptions) {
      options = next
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot: () => snapshot,
    registerContainer,
    registerItem,
    handlePointerDown,
    handleKeyDown,
    afterCommit,
    cancel,
  }
}

function preventDefault(event: Event) {
  event.preventDefault()
}

function suppressNextClick({ untilNextPointerUp }: { untilNextPointerUp: boolean }) {
  const stop = (event: Event) => {
    event.stopPropagation()
    event.preventDefault()
    remove()
  }
  const remove = () => window.removeEventListener('click', stop, true)
  window.addEventListener('click', stop, true)

  // The click (if any) follows the pointerup within the same task, so a timeout ends the wait.
  if (untilNextPointerUp) {
    window.addEventListener('pointerup', () => setTimeout(remove, 0), { once: true, capture: true })
  } else {
    setTimeout(remove, 0)
  }
}
