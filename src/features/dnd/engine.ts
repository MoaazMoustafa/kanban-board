import { autoScrollDelta } from './core/autoScroll'
import { computeDropTarget, sameTarget } from './core/collision'
import { distance, toRect } from './core/geometry'
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
 *     ▲                     │ released / scrolled                                     │
 *     │◀────────────────────┘                                   drop / Escape / cancel │
 *     └──────────────── animation done ◀──────── dropping ◀────────────────────────────┘
 *
 * `pending` lives only in the engine; React sees idle, dragging and dropping.
 */

export type DragStatus = 'idle' | 'dragging' | 'dropping'

export interface DragSnapshot {
  readonly status: DragStatus
  readonly active: ActiveItem | null
  readonly target: DropTarget | null
}

export interface DropEvent {
  readonly active: ActiveItem
  readonly target: DropTarget
}

export interface DndEngineOptions {
  onDrop: (event: DropEvent) => void
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

interface Session {
  active: ActiveItem
  pointerId: number
  start: Point
  pointer: Point
  origin: Rect
  overlay: Overlay
  containers: MeasuredContainer[]
  scrollables: HTMLElement[]
  target: DropTarget | null
  /** Layout changed (scroll or re-render) since the last measurement. */
  dirty: boolean
  frame: number
  removeListeners: () => void
}

const IDLE: DragSnapshot = { status: 'idle', active: null, target: null }
const ACTIVATION_DISTANCE = 5
const TOUCH_DELAY = 250
const IGNORE_SELECTOR = 'input, textarea, select, [contenteditable], [data-dnd-ignore]'

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
  let settling: { overlay: Overlay; activeId: string } | null = null

  function setSnapshot(next: DragSnapshot) {
    snapshot = next
    for (const listener of listeners) listener()
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
    for (const item of items.values())
      if (item.type === type) itemsByElement.set(item.element, item)

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

  function snapshotRects(type: string): Map<string, Rect> {
    const rects = new Map<string, Rect>()
    for (const item of items.values()) {
      if (item.type === type) rects.set(item.id, toRect(item.element.getBoundingClientRect()))
    }
    return rects
  }

  // ── Pending: deciding whether a press is a click, a scroll, or a drag ────────

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
      pending.timer = window.setTimeout(() => pending && activate(pending.last), TOUCH_DELAY)
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
    else activate(pending.last)
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

  // ── Dragging ────────────────────────────────────────────────────────────────

  function activate(pointer: Point) {
    if (!pending) return
    const { itemId, pointerId, start } = pending
    clearPending()

    const item = items.get(itemId)
    if (!item) return

    const origin = toRect(item.element.getBoundingClientRect())
    const measured = measure(item.type)
    const home = measured.find((c) => c.id === item.containerId)
    const homeIndex = home?.items.findIndex((i) => i.id === itemId) ?? -1
    const scrollables = [
      ...new Set(measured.flatMap((c) => getScrollableAncestors(containers.get(c.id)!.element))),
    ]

    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId || !session) return
      session.pointer = { x: event.clientX, y: event.clientY }
    }
    const onUp = (event: PointerEvent) => {
      if (event.pointerId === pointerId) finish('drop')
    }
    const onScroll = () => {
      if (session) session.dirty = true
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('blur', onCancel)
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('contextmenu', preventDefault)
    // Stop the page from scrolling under a touch drag (needs a non-passive listener).
    window.addEventListener('touchmove', preventDefault, { passive: false })

    session = {
      active: { id: item.id, type: item.type, containerId: item.containerId },
      pointerId,
      start,
      pointer,
      origin,
      overlay: createOverlay(item.element, origin),
      containers: measured,
      scrollables,
      target: homeIndex === -1 ? null : { containerId: item.containerId, index: homeIndex },
      dirty: false,
      frame: 0,
      removeListeners() {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onCancel)
        window.removeEventListener('blur', onCancel)
        window.removeEventListener('keydown', onKeyDown, true)
        window.removeEventListener('scroll', onScroll, true)
        window.removeEventListener('contextmenu', preventDefault)
        window.removeEventListener('touchmove', preventDefault)
      },
    }

    document.documentElement.dataset['dndDragging'] = ''
    window.getSelection()?.removeAllRanges()
    setSnapshot({ status: 'dragging', active: session.active, target: session.target })
    session.frame = requestAnimationFrame(tick)
  }

  const onCancel = () => finish('cancel')

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    finish('escape')
  }

  /** One frame: read layout, compute the target, then write (overlay position, scrolling). */
  function tick() {
    const s = session
    if (!s) return

    if (s.dirty) {
      s.containers = measure(s.active.type)
      s.dirty = false
    }

    const target = computeDropTarget(s.pointer, s.containers, s.active.id)
    if (target && !sameTarget(target, s.target)) {
      s.target = target
      flipBefore = snapshotRects(s.active.type)
      setSnapshot({ status: 'dragging', active: s.active, target })
    }

    s.overlay.moveTo(
      s.origin.left + s.pointer.x - s.start.x,
      s.origin.top + s.pointer.y - s.start.y,
    )

    for (const element of s.scrollables) {
      const delta = autoScrollDelta(s.pointer, element.getBoundingClientRect())
      const x = canScroll(element, 'horizontal') ? delta.x : 0
      const y = canScroll(element, 'vertical') ? delta.y : 0
      if (x || y) element.scrollBy(x, y)
    }

    s.frame = requestAnimationFrame(tick)
  }

  /**
   * - drop: released normally; commit the target.
   * - escape: cancelled with the button still held, so the coming release must not click.
   * - cancel: the browser took the pointer away (pointercancel, window blur); nothing to suppress.
   */
  function finish(reason: 'drop' | 'escape' | 'cancel') {
    const s = session
    if (!s) return
    session = null
    cancelAnimationFrame(s.frame)
    s.removeListeners()
    delete document.documentElement.dataset['dndDragging']
    // The release that ends a drag must not also "click" whatever is under the pointer.
    if (reason !== 'cancel') suppressNextClick({ untilNextPointerUp: reason === 'escape' })

    flipBefore = snapshotRects(s.active.type)
    if (reason === 'drop' && s.target) options.onDrop({ active: s.active, target: s.target })
    settling = { overlay: s.overlay, activeId: s.active.id }
    setSnapshot({ status: 'dropping', active: s.active, target: null })
  }

  // ── After React commits ─────────────────────────────────────────────────────

  /** Called from a layout effect after each snapshot render: animate moves, then settle a drop. */
  function afterCommit() {
    if (flipBefore) {
      runFlip(flipBefore)
      flipBefore = null
    }
    if (session) session.dirty = true

    if (settling && snapshot.status === 'dropping') {
      const { overlay, activeId } = settling
      settling = null
      const landed = items.get(activeId)?.element.getBoundingClientRect()
      void overlay.settleTo(landed && toRect(landed)).then(() => {
        overlay.destroy()
        if (snapshot.status === 'dropping') setSnapshot(IDLE)
      })
    }
  }

  /** FLIP: First (rects before), Last (rects now), Invert (translate back), Play (animate to 0). */
  function runFlip(before: Map<string, Rect>) {
    if (prefersReducedMotion()) return
    for (const [id, first] of before) {
      const element = items.get(id)?.element
      if (!element) continue
      flipAnimations.get(element)?.cancel()
      const last = element.getBoundingClientRect()
      const dx = first.left - last.left
      const dy = first.top - last.top
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
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
    settling?.overlay.destroy()
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
