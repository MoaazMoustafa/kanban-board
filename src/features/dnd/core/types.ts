export interface Point {
  readonly x: number
  readonly y: number
}

export interface Rect {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

/** The direction a sortable container lays out its items. */
export type Axis = 'vertical' | 'horizontal'

export interface MeasuredItem {
  readonly id: string
  readonly rect: Rect
}

/** A container and its items (in display order), measured in viewport coordinates. */
export interface MeasuredContainer {
  readonly id: string
  readonly axis: Axis
  readonly rect: Rect
  readonly items: readonly MeasuredItem[]
}

/** Where the active item would land: its final index among the container's *other* items. */
export interface DropTarget {
  readonly containerId: string
  readonly index: number
}

export interface ActiveItem {
  readonly id: string
  readonly type: string
  /** The container the item started in. */
  readonly containerId: string
}
