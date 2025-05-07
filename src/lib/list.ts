// lib/list.ts
import InsertionBarUi from './InsertionBarUI.svelte'
import type { HoverData, HoverOptions } from './drag.js'
import { SvelteReactiveComponent } from './reactive.js'
import { inView, insert, mergeOptions } from './util.js'

interface SvelteListProps<T extends Content> {
  items: SvelteListItem<T>[]
  selection: ListSelection | null
  e: HTMLElement | null
  focused: SvelteListItem<T> | null
}

interface SelectOptions {
  scrollIntoView?: boolean // defaults to true
  focus?: boolean // defaults to false
}

export class ListSelection {
  private constructor(
    public ranges: readonly SelectionRange[],
    public readonly mainIndex: number
  ) {}

  /**
  Extend this selection with an extra range.
  */
  addRange(range: SelectionRange, main: boolean = true): ListSelection {
    return ListSelection.create([range, ...this.ranges], main ? 0 : this.mainIndex + 1)
  }

  /**
  Replace a given range with another range, and then normalize the
  selection to merge and sort ranges if necessary.
  */
  replaceRange(range: SelectionRange, which: number = this.mainIndex): ListSelection {
    if (!this.ranges[which]) {
      throw new RangeError('range at specified index does not exist')
    }
    const ranges = this.ranges.slice()
    ranges[which] = range
    return ListSelection.create(ranges, this.mainIndex)
  }

  /**
   * Remove this index from the selection range, creating two ranges if the position is in the middle
   * of the range
   */
  splitRange(index: number): ListSelection | null {
    const rangeIndex = this.ranges.findIndex((range) => range.contains(index))

    const range = this.ranges[rangeIndex]

    // Remove range if empty
    if (range.single) {
      if (this.ranges.length > 1) {
        // Since there are multiple ranges, set mainIndex to the closest range
        let mainRange: SelectionRange
        const rangeBefore: SelectionRange | undefined = this.ranges[rangeIndex - 1]
        const rangeAfter: SelectionRange | undefined = this.ranges[rangeIndex + 1]
        if (rangeBefore && rangeAfter) {
          if (rangeBefore.distanceTo(range) < rangeAfter.distanceTo(range)) {
            mainRange = rangeBefore
          } else {
            mainRange = rangeAfter
          }
        } else if (rangeBefore) {
          mainRange = rangeBefore
        } else if (rangeAfter) {
          mainRange = rangeAfter
        }

        const ranges = this.ranges.slice(0, rangeIndex).concat(this.ranges.slice(rangeIndex + 1))
        const mainIndex = ranges.findIndex((r) => r === mainRange)
        return ListSelection.create(ranges, mainIndex)
      } else {
        return null
      }
    } else {
      // Split this range in two if index is in the middle of the selecton
      // or shorten the range if index is at the edge of selection
      const [i0, i1] = [range.from, range.to]

      // For range (0, 2), 0th and 1st elements are at the edge
      const atTheEdge = index === i0 || index + 1 === i1
      const ranges = [...this.ranges]

      if (!atTheEdge) {
        // Split into two separate ranges
        // EX: for range (0, 3) and index 1, create (0, 1) and (2, 3) ranges
        const range1 = ListSelection.range(i0, index)
        const range2 = ListSelection.range(index + 1, i1)

        ranges.splice(rangeIndex, 1, range1, range2)
        let mainIndex = ranges.findIndex((r) => r === this.main)
        if (mainIndex == -1) {
          // If main range was just removed
          mainIndex = rangeIndex // Set to first split range
        }

        return ListSelection.create(ranges, mainIndex)
      } else {
        // Shorten the range
        let newRange: SelectionRange
        if (range.anchor < range.head) {
          if (index === range.anchor) {
            newRange = ListSelection.range(range.anchor + 1, range.head)
          } else {
            newRange = ListSelection.range(range.anchor, range.head - 1)
          }
        } else {
          if (index === range.anchor) {
            newRange = ListSelection.range(range.anchor - 1, range.head)
          } else {
            newRange = ListSelection.range(range.anchor, range.head + 1)
          }
        }

        return this.replaceRange(newRange, rangeIndex)
      }
    }
  }

  /**
   * Returns true if index is contained in one of the selection ranges
   * @param index
   */
  contains(index: number): boolean {
    for (const range of this.ranges) {
      if (range.contains(index)) {
        return true
      }
    }

    return false
  }

  /**
   * Picks items from given array from selection's ranges
   */
  pick<T>(arr: T[]): T[] {
    if (this.max > arr.length) {
      throw new Error('Array length is out of bounds than selection')
    }
    return this.ranges
      .map((r) => arr.slice(r.from, r.to))
      .reduce((arr, next) => [...arr, ...next], [])
  }

  /**
   * Returns true if there is a single empty selection range
   */
  isSingle(): boolean {
    return this.ranges.length == 1 && this.ranges[0].single
  }

  get main(): SelectionRange {
    return this.ranges[this.mainIndex]
  }

  get min(): number {
    return this.ranges[0].from
  }

  get max(): number {
    return this.ranges.slice(-1)[0].to
  }

  /**
   * Returns true if there are multiple items in selection
   */
  isMultiple(): boolean {
    if (this.ranges.length == 1) {
      return !this.ranges[0].single
    }

    return this.ranges.length >= 2
  }

  eq(selection: ListSelection): boolean {
    return (
      this.ranges.length == selection.ranges.length &&
      this.ranges.every((r, i) => r.eq(selection.ranges[i]))
    )
  }

  /**
   * Returns the number of items in the selection
   */
  size(): number {
    return this.ranges.reduce((total, next) => next.length + total, 0)
  }

  static create(ranges: SelectionRange[], mainIndex: number = ranges.length - 1): ListSelection {
    if (!ranges.length) {
      throw new Error('Ranges are empty')
    }

    // Here see if ranges need to be normalized
    let pos = 0
    for (const range of ranges) {
      if (pos >= range.from) {
        return this.normalize(ranges, mainIndex)
      }
      pos = range.to
    }

    return new ListSelection(ranges, mainIndex)
  }

  static single(index: number): ListSelection {
    return new ListSelection([SelectionRange.create(index, index + 1)], 0)
  }

  /**
  Create a selection range.
  */
  static range(anchor: number, head: number): SelectionRange {
    const inverted = head < anchor
    return SelectionRange.create(inverted ? head : anchor, inverted ? anchor : head, inverted)
  }

  /** Build a selection from a sorted list of indices (consecutive runs merged). */
  static fromIndices(indices: number[], mainIndex = 0): ListSelection | null {
    if (!indices.length) return null
    const ranges: SelectionRange[] = []
    let start = indices[0]

    for (let i = 1; i <= indices.length; i++) {
      if (i === indices.length || indices[i] !== indices[i - 1] + 1) {
        ranges.push(ListSelection.range(start, indices[i - 1] + 1))
        start = indices[i]
      }
    }
    return ListSelection.create(ranges, mainIndex)
  }

  /** Utility: return every index covered by the selection. */
  indices(): number[] {
    return this.ranges.flatMap(r => {
      const arr: number[] = []
      for (let i = r.from; i < r.to; i++) arr.push(i)
      return arr
    })
  }

  // @internal
  static normalize(ranges: SelectionRange[], mainIndex: number = 0): ListSelection {
    // Sort ranges, then merge overlapping and touching ranges: (0, 1) and (1, 2) get merged to (0, 2)
    // Exceptions: ranges that overlap main range are removed, ranges that touch main range are merged,
    // direction of the main range is preserved
    const main = ranges[mainIndex]
    sortRanges(ranges)
    mainIndex = ranges.indexOf(main)
    for (let i = 1; i < ranges.length; i++) {
      const range = ranges[i],
        prev = ranges[i - 1],
        main = ranges[mainIndex]
      if (range.from <= prev.to) {
        // If it overlaps (<) or touches (==) previous range
        const keepMain = (range == main || prev == main) && range.from < prev.to // Overwrite with main range if overlaps
        const from = keepMain ? main.from : prev.from
        const to = keepMain ? main.to : Math.max(range.to, prev.to)
        if (i <= mainIndex) mainIndex--
        ranges.splice(
          --i,
          2,
          main.anchor > main.head ? ListSelection.range(to, from) : ListSelection.range(from, to)
        )
      }
    }
    return new ListSelection(ranges, mainIndex)
  }
}

export class SelectionRange {
  private constructor(
    public readonly from: number,
    public readonly to: number,
    public readonly inverted: boolean = false
  ) {}

  get single(): boolean {
    return this.length == 1
  }

  get anchor(): number {
    return this.inverted ? this.to : this.from
  }

  get head(): number {
    return !this.inverted ? this.to : this.from
  }

  get length(): number {
    return Math.abs(this.anchor - this.head)
  }

  extend(to: number): SelectionRange {
    if (to < this.anchor) {
      // Extend downwards, possibly inverting the selection
      return SelectionRange.create(to, this.anchor + 1, true)
    } else {
      // Extend upwards or continue in the same direction
      const from = this.inverted ? this.anchor - 1 : this.from
      return SelectionRange.create(from, to + 1, false)
    }
  }

  shift(by: number): SelectionRange {
    return new SelectionRange(this.from + by, this.to + by, this.inverted)
  }

  eq(other: SelectionRange): boolean {
    return this.anchor === other.anchor && this.head === other.head
  }

  /**
   * Returns true if this selection range is less than other
   */
  less(other: SelectionRange): boolean {
    return this.from < other.from
  }

  /** Subtract other from this:
   * EX: If this is (10, 20) and other is (0, 15)
   * - this.subtract(other): (10, 20) - (0, 15) = (15, 20)
   * - other.subtract(this): (0, 15) - (10, 20) = (0, 10)
   *
   */
  subtract(other: SelectionRange): SelectionRange | [SelectionRange, SelectionRange] | null {
    const [thisFrom, thisTo] = this.indices()
    const [otherFrom, otherTo] = other.indices()

    // Case 1: No overlap
    if (otherTo <= thisFrom || otherFrom >= thisTo) {
      return this
    }

    // Case 2: Full containment, return null since this is fully covered
    if (otherFrom <= thisFrom && otherTo >= thisTo) {
      return null
    }

    // Case 3: Overlap on the left side (remove the left part)
    if (otherFrom <= thisFrom && otherTo < thisTo) {
      return SelectionRange.create(otherTo, thisTo)
    }

    // Case 4: Overlap on the right side (remove the right part)
    if (otherFrom > thisFrom && otherTo >= thisTo) {
      return SelectionRange.create(thisFrom, otherFrom)
    }

    // Case 5: Other is in the middle, return two disjoint ranges
    const leftRange = SelectionRange.create(thisFrom, otherFrom)
    const rightRange = SelectionRange.create(otherTo, thisTo)
    return [leftRange, rightRange]
  }

  contains(pos: number): boolean {
    return this.from <= pos && pos < this.to
  }

  /**
   * Calculate distance between ranges: touching ranges are 0 distance apart: (0, 1), (1, 2) are touching
   */
  distanceTo(range: SelectionRange): number {
    if (this.overlaps(range)) {
      return -1
    }

    const [r1, r2] = sortRanges([this, range])
    return r2.from - r1.to
  }

  /**
   * Returns true if the two ranges overlap (1, 4) (4, 5)
   */
  overlaps(range: SelectionRange): boolean {
    const [r1, r2] = sortRanges([this, range])
    return r1.from <= r2.from && r2.from < r1.to
  }

  touches(range: SelectionRange): boolean {
    return this.distanceTo(range) == 0
  }

  indices(): [number, number] {
    return [this.from, this.to]
  }

  // @internal
  static create(from: number, to: number, inverted: boolean = false): SelectionRange {
    if (from >= to) {
      throw new RangeError('from and to have to span a valid range')
    }

    return new SelectionRange(from, to, inverted)
  }
}

export interface List<Y extends ID, T extends Content> extends SvelteListProps<T> {
  /** Adds item to the end of the list */
  add(item: Y): void
  /** Inserts item at the given index */
  insert(item: Y, i: number): void
  /** Move one item (or a whole selection) so that its first element ends up at `to` */
  move(from: number | ListSelection, to: number): void
  /** Removes items from the list */
  remove(contentId: string): void
  /** Removes items at the given index */
  removeFrom(index: number): void
  /** Removes items from given ListSelection */
  removeFrom(selection: ListSelection): void
  /** Removes items from specified range: from (inclusive), to (exclusive) */
  removeFrom(from: number, to: number): void
  /** Select item or clear selection */
  select(selection: ListSelection, options?: SelectOptions): void
  /** Move selection up */
  up(): void
  /** Move selection down */
  down(): void
  /** Gets item by element id */
  getItem(id: string): SvelteListItem<T> | null
  /** Gets item by content id */
  getByContentId(id: string): SvelteListItem<T> | null
}

export interface SvelteListItemProps<T extends Content> {
  id: string
  content: T
  component: any
}

interface ListItemData<T extends Content> {
  content: T
  options?: ListItemOptions
}

const buildItems = <Y extends ID, T extends Content>(
  data: Y[],
  builder: ListItemBuilder<Y, T>,
  listId: string,
  cache: Map<string, SvelteListItem<T>>,
  useCache: boolean
) => {
  return data.map((d) => {
    const id = `${listId}-${d.id}`
    let item: SvelteListItem<T>
    if (useCache) {
      let item = cache.get(id)
      if (item) {
        return item
      }
    }
    const { content, options = {} } = builder(d)
    item = new SvelteListItem(id, content, options)
    useCache && cache.set(id, item)
    return item
  })
}

type ListItemBuilder<Y, T> = (item: Y) => ListItemData<T>

interface ListOptions {
  id: string // optional list id
  cache: boolean 
  focusOn: 'click' | 'mousedown' // default focus on click (although might be more web-native if focus on 'mousedown' is default)
  selection: 'multi' | 'single'
  dragHandle: any // TODO:type svelte component
  insertionBar: any // TODO: type svelte component
  handlers?: {
    click?: Handler<MouseEvent>
    keydown?: Handler<KeyboardEvent>
  }
}

interface HandlerProps {
  item: SvelteListItem<any>
  index: number
}

/**
 * Interface for DOM handlers: click, keydown.
 *
 * To prevent the default behavior of list selection handler should return true.
 */
export type Handler<E extends Event> = (
  this: SvelteList<any, any>,
  event: E,
  props: HandlerProps
) => boolean | void

function defaultOptions(): ListOptions {
  return {
    id: `list-${Math.round(Math.random() * 100000)}`,
    focusOn: 'click', // todo: implement
    selection: 'multi', // todo: implemente
    dragHandle: null,
    insertionBar: null,
    cache: true
  }
}

export class SvelteList<Y extends ID, T extends Content>
  extends SvelteReactiveComponent<SvelteListProps<T>>
  implements List<Y, T>
{
  public listId: string

  private _ids = new Set<string>()
  private _cache: Map<string, SvelteListItem<T>>
  private _useCache: boolean

  public readonly options: ListOptions

  constructor(
    data: Y[],
    public readonly builder: ListItemBuilder<Y, T>,
    options: Partial<ListOptions> = {}
  ) {
    const mergedOptions = mergeOptions(defaultOptions(), options)
    const cache = new Map<string, SvelteListItem<T>>()
    const items = buildItems(data, builder, mergedOptions.id, cache, mergedOptions.cache)
    super({ selection: null, items, focused: null, e: null })
    this._useCache = mergedOptions.cache
    this._cache = cache
    this.options = mergedOptions
    this.listId = this.options.id
  }

  setData(data: Y[]): void {
    this._ids.clear()
    const items = buildItems(data, this.builder, this.listId, this._cache, this._useCache)
    this._addId(...items)
    // Reset selection when reseting the list
    this.update({ items, selection: null })
  }

  add(item: Y): void {
    const newItem = buildItems([item], this.builder, this.listId, this._cache, this._useCache)[0]
    this._addId(newItem)
    this.set('items', [...this.items, newItem])
  }

  insert(item: Y, i: number): void {
    if (i < 0 || i > this.items.length) {
      throw new Error('Index out of bounds')
    }

    const newItem = buildItems([item], this.builder, this.listId, this._cache, this._useCache)[0]
    this._addId(newItem)
    const items = insert(this.items, newItem, i)

    let newSelection = this.selection
    if (this.selection) {
      // Case when the insertion is in the middle of one range (2, 4), if 3, then split into (2, 3) and (4, 5)
      const rangeIndex = this.selection.ranges.findIndex((r) => r.from < i && i < r.to)
      if (rangeIndex != -1) {
        const inMiddle = this.selection.ranges[rangeIndex]
        const newRange = ListSelection.range(inMiddle.from, i)
        const leftover = ListSelection.range(i + 1, inMiddle.to + 1)
        // Replace range and add the split range
        newSelection = this.selection.replaceRange(newRange, rangeIndex).addRange(leftover, false)
      } else {
        // Shift all ranges after the insertion
        newSelection = ListSelection.create(
          this.selection.ranges.map((r) => (r.from >= i ? r.shift(1) : r)),
          this.selection.mainIndex
        )
      }
    }

    this.update({ items, selection: newSelection })
  }

  move(from: number | ListSelection, to: number): void {
    /* 1. Bounds */
    const n = this.items.length;
    if (to < 0 || to > n) throw new RangeError('`to` is out of bounds');
    if (typeof from == 'number') {
      if (from < 0 || from > n) throw new RangeError('`from` is out of bounds');
    }
    const sel = typeof from === 'number' ? ListSelection.single(from) : from;


    /* 2. Lift */
    const picked = sel.pick(this.items);
    const base   = this.items.filter((_, i) => !sel.contains(i));

    /* 3. Compute splice index in `base` (visual‑slot semantics) */
    const removedBefore = sel.indices().filter(i => i < to).length;
    let   idxInBase     = to - removedBefore;
    idxInBase = Math.min(Math.max(idxInBase, 0), base.length);

    const items = [
      ...base.slice(0, idxInBase),
      ...picked,
      ...base.slice(idxInBase)
    ];

    /* 4. Remap existing selection (if any) */
    let newSelection: ListSelection | null = null;
    if (this.selection) {
      const prevIds  = new Set(this.selection.pick(this.items).map(it => it.id));
      const newIdx   = items.flatMap((it, i) => prevIds.has(it.id) ? [i] : []);
      newSelection   = ListSelection.fromIndices(newIdx);
    }

    this.update({ items, selection: newSelection });
  }

  remove(contentId: string): void {
    const index = this.items.findIndex((i) => i.content.id == contentId)
    if (index === -1) {
      throw new Error('Item not found')
    }
    this.removeFrom(index)
  }

  removeFrom(selection: ListSelection): void
  removeFrom(index: number): void
  removeFrom(from: number, to: number): void
  removeFrom(from: number | ListSelection, to?: number): void {
    let selection: ListSelection
    if (typeof from == 'number') {
      if (to == undefined) {
        to = from + 1
      }
      selection = ListSelection.create([ListSelection.range(from, to!)])
    } else {
      selection = from
    }

    const [newItems, removedItems] = removeRanges(
      this.items,
      selection.ranges.map((r) => r.indices())
    )

    this._removeId(...removedItems)

    let newSelection: ListSelection | null = this.selection
    if (newSelection) {
      if (selection.eq(this.selection!)) {
        // If the new selection equals this selection simply clear it, except
        // the option is set to single selection, which has the following UX:
        // when removing from the end shift selection down, otherwise keep selection
        if (this.options.selection == 'single' && newItems.length) {
          if (this.items.length == selection.max) {
            newSelection = ListSelection.create([selection.main.shift(-1)])
          } else {
            newSelection = selection
          }
        } else {
          newSelection = null
        }
      } else {
        // Otherwise update selection — subtracting this.selection - selection, range by range
        for (const range of selection.ranges) {
          if (newSelection == null) {
            break
          }

          for (const existingRange of this.selection!.ranges) {
            // Check if ranges overlaps existing range
            if (range.overlaps(existingRange)) {
              // Remove or update existing ranges
              const result = existingRange.subtract(range)
              const rangeIndex: number = newSelection.ranges.findIndex((r) => existingRange.eq(r))
              if (result) {
                if (result instanceof SelectionRange) {
                  newSelection = newSelection.replaceRange(result, rangeIndex)
                } else {
                  // Two ranges got produced by subtraction: replace the first and add the second
                  newSelection = newSelection
                    .replaceRange(result[0], rangeIndex)
                    .addRange(result[1], false)
                }
              } else {
                // Range was removed - filter out the range and move main index
                const ranges = [...newSelection.ranges]
                ranges.splice(rangeIndex, 1)
                if (ranges.length) {
                  const mainIndex =
                    newSelection.mainIndex >= rangeIndex
                      ? Math.max(0, newSelection.mainIndex - 1)
                      : newSelection.mainIndex
                  newSelection = ListSelection.create(ranges, mainIndex)
                } else {
                  // Entire selection was deleted
                  newSelection = null
                  break
                }
              }
            }
          }
        }

        // Now shift selections left
        if (newSelection) {
          newSelection = ListSelection.create(
            newSelection.ranges.map((range) => {
              const cumulativeBefore = selection.ranges.reduce(
                (total, r) => (r.less(range) ? r.length + total : 0),
                0
              )
              if (cumulativeBefore) {
                return range.shift(-cumulativeBefore)
              }
              return range
            }),
            newSelection.mainIndex
          ) // Keep mainIndex
        }
      }
    }

    // Move focus to the next list item if focused item was removed (relevant only for 'single' selection option)
    if (
      this.options.selection == 'single' &&
      newSelection &&
      this.focused &&
      newItems.indexOf(this.focused) == -1
    ) {
      newItems[newSelection.min]?.focus()
    }

    this.update({
      items: newItems,
      selection: newSelection
    })
  }

  select(selection: ListSelection | null, options?: SelectOptions | undefined): void {
    if (selection == null) {
      this.set('selection', selection)
    } else {
      // Check that selection is valid
      checkSelection(selection, this.items, this.options)
      this.set('selection', selection)

      if (options) {
        if (selection.main) {
          const item = this.items[selection.main.head - 1]

          const eItem = document.getElementById(item.id)
          const e = this.getProp('e')
          if (options?.scrollIntoView != false && e && eItem && !inView(e, eItem)) {
            eItem.scrollIntoView({ behavior: 'instant', block: 'nearest' })
          }

          if (options?.focus && !item.focused()) {
            item.focus()
          }
        }
      }
    }
  }

  up() {
    if (this.focused && this.selection) {
      const i = this.selection.main.head - 1
      if (i > 0) {
        this.select(ListSelection.single(i - 1), { focus: true })
      }
    }
  }

  down() {
    if (this.focused && this.selection) {
      const i = this.selection.main.head - 1
      if (i < this.items.length - 1) {
        this.select(ListSelection.single(i + 1), { focus: true })
      }
    }
  }

  getItem(id: string): SvelteListItem<T> | null {
    return this.items.find((i) => i.id === id) || null
  }

  getByContentId(id: string): SvelteListItem<T> | null {
    return this.items.find((i) => i.content.id === id) || null
  }

  setElement(e: HTMLElement): void {
    this.set('e', e)
  }

  destroy(): void {}

  get e(): HTMLElement | null {
    return this.getProp('e')
  }

  get selection(): ListSelection | null {
    return this.getProp('selection')
  }

  get items(): SvelteListItem<T>[] {
    return this.getProp('items')
  }

  get focused(): SvelteListItem<T> | null {
    return this.getProp('focused')
  }

  get selected(): SvelteListItem<T>[] {
    if (this.selection) {
      return this.selection.pick(this.items)
    }

    return []
  }

  /* ------------------------------------------------------------------ */
  /*  Private helpers                                                    */
  /* ------------------------------------------------------------------ */

  #coerceSel(sel: number | ListSelection): ListSelection {
    return typeof sel === 'number' ? ListSelection.single(sel) : sel
  }

  private _addId(...items: SvelteListItem<T>[]) {
    items.forEach((item) => {
      if (this._ids.has(item.id)) {
        throw new Error(
          `Duplicate identifier detected: '${item.id}'. Each item must have a unique ID.`
        )
      }
    })
    items.forEach((item) => this._ids.add(item.id))
  }

  private _removeId(...items: SvelteListItem<T>[]) {
    items.forEach((item) => {
      this._ids.delete(item.id)
    })
  }
}

interface ListItemOptions {
  component: object | null
  hover: HoverOptions
}

interface ID {
  id: string
}

export interface Content extends ID {
  mount?: () => void
  destroy?: () => void
}


interface InsertionBarProps {
  visible: boolean
  e: HTMLElement | null
  translateY: number
}

interface InsertionBarOptions {
  component: any
}

export class InsertionBar extends SvelteReactiveComponent<InsertionBarProps> {

  public options: InsertionBarOptions

  constructor(options: Partial<InsertionBarOptions> = {}) {
    const merged: InsertionBarOptions = mergeOptions(
      {
        component: InsertionBarUi,
      },
      options || {}
    )

    super({
        visible: false,
        e: null,
        translateY: -9999
    })

    this.options = merged
  }

  mount(e: HTMLElement) {
    this.set('e', e)
  }

  show(item: HTMLElement, e: DragEvent, container: HTMLElement, data: HoverData) {
    const rect  = item.getBoundingClientRect();
    const midY  = rect.top + rect.height / 2;

    // 2. compute target position *between* items
    const above = e.clientY < midY;
    const offset = above ? rect.top : rect.bottom;

    if (data.pos == 0) {
      this.set('visible', false)
    } else {
      /* converts clientY to an offset within e */
      const { top } = container.getBoundingClientRect();
      const yRelative = offset - top + container.scrollTop
      this.update({visible: true, translateY: yRelative})
    }
  }

  hide() {
    this.update({visible: false, translateY: -9999})
  }

  get visible() {
    return this.getProp('visible')
  }

  get e() {
    return this.getProp('e')
  }
}


export class SvelteListItem<T extends Content> extends SvelteReactiveComponent<
  SvelteListItemProps<T>
> {
  private _mounted: boolean = false

  public readonly options: ListItemOptions

  constructor(id: string, content: T, options: Partial<ListItemOptions>) {
    const merged: ListItemOptions = mergeOptions(
      {
        component: null,
        hover: { threshold: 0.2 }
      },
      options || {}
    )

    super({
      id: id,
      content,
      component: merged.component
    })

    this.options = merged
  }

  get id(): string {
    return this.getProp('id')
  }

  get component(): any {
    return this.getProp('component')
  }

  get content(): T {
    return this.getProp('content')
  }

  focus() {
    if (document.activeElement?.id !== this.id) {
      const e = document.getElementById(this.id)
      if (!e) {
        return console.warn('failed to focus SvelteListItem: element not found')
      }
      e.focus()
    }
  }

  focused(): boolean {
    return document.activeElement?.id === this.id
  }

  mount(): void {
    if (!this._mounted) {
      this.content.mount?.()
      this._mounted = true
    }
  }

  destroy(): void {
    if (this._mounted) {
      this.content.destroy?.()
      this._mounted = false
    }
  }
}

const sortRanges = (ranges: SelectionRange[]) => ranges.sort((a, b) => (a.less(b) ? -1 : 1))

/**
 * Removes given ranges from the array and returns the new array
 *
 * Ranges should be sorted and non-overlapping: (0, 1), (3, 5), etc.
 * The elements in a tuple (from, to) are inclusive, exclusive respectively: (0, 1) will remove 0th element
 * in an array, while (0, 0) will remove only the 0th element.
 * @param array
 * @param ranges - Sorted ranges
 * @returns
 */
function removeRanges<T>(array: T[], ranges: [number, number][]): [T[], T[]] {
  let result: T[] = []
  let removedItems: T[] = []
  let start = 0

  ranges.forEach(([begin, end]) => {
    result = result.concat(array.slice(start, begin))
    removedItems = removedItems.concat(array.slice(begin, end))
    start = end
  })

  // Add remainder
  result = result.concat(array.slice(start))

  return [result, removedItems]
}

function checkSelection(
  selection: ListSelection,
  items: SvelteListItem<any>[],
  options: ListOptions
) {
  if (selection.max > items.length) {
    throw new RangeError('Selection points outside of array')
  }

  if (options.selection == 'single' && selection.size() > 1) {
    throw new RangeError(
      "Selection must be a single item or null when the selection option is configured as 'single'."
    )
  }
}
