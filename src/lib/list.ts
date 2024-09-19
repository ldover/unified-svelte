import { SvelteReactiveComponent } from './reactive.js'
import { inView, insert, mergeOptions, remove } from './util.js'

interface ListItemProps<T extends Content> {
  id: string
  selectable: boolean
  content: T
}

interface ListProps<N extends ListItem<T>, T extends Content> {
  items: N[]
  selection: ListSelection | null
}

interface SvelteListProps<T extends Content> extends ListProps<SvelteListItem<T>, T> {
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
      let [i0, i1] = [range.from, range.to]

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
   * Returns true if there is a single empty selection range
   */
  isSingle(): boolean {
    return this.ranges.length == 1 && this.ranges[0].single
  }

  get main(): SelectionRange {
    return this.ranges[this.mainIndex]
  }

  get max(): number {
    return this.ranges.slice(-1)[0].to
  }

  /**
   * Returns true if there are multiple selection ranges in the current selection
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
      if (pos > range.from) {
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

  // @internal
  static normalize(ranges: SelectionRange[], mainIndex: number = 0): ListSelection {
    // Sort ranges, then merge overlapping and touching ranges: (0, 1) and (1, 2) get merged to (0, 2)
    // Exceptions: ranges that overlap main range are removed, ranges that touch main range are merged,
    // direction of the main range is preserved
    let main = ranges[mainIndex]
    sortRanges(ranges)
    mainIndex = ranges.indexOf(main)
    for (let i = 1; i < ranges.length; i++) {
      let range = ranges[i],
        prev = ranges[i - 1],
        main = ranges[mainIndex]
      if (range.from <= prev.to) {
        // If it overlaps (<) or touches (==) previous range
        const keepMain = (range == main || prev == main) && range.from < prev.to // Overwrite with main range if overlaps
        let from = keepMain ? main.from : prev.from
        let to = keepMain ? main.to : Math.max(range.to, prev.to)
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

  // extend(to: number): SelectionRange {
  //   if (to < this.anchor) {
  //     // When extending to a position before the anchor
  //     return SelectionRange.create(to, this.to, true);
  //   } else {
  //     // When extending to a position after or at the anchor
  //     return SelectionRange.create(this.from, to + 1, false);
  //   }
  // }

  // extend(to: number): SelectionRange {
  //   if (to < this.anchor) {
  //     // Extend towards the anchor (possibly inverting)
  //     return SelectionRange.create(to, this.to, true);
  //   } else {
  //     // Extend away from the anchor
  //     const from = this.inverted ? this.anchor - 1 : this.from;
  //     return SelectionRange.create(from, to + 1, false);
  //   }
  // }

  extend(to: number): SelectionRange {
    // todo: check this... — might have to shift from, to when the selection range inverts
    if (!this.inverted && to < this.anchor) {
      // Invert down (5, 6), extend down to 4 -> (4, 6)
      return SelectionRange.create(to, this.anchor + 1, true)
    } else if (this.inverted && to >= this.anchor) {
      // Invert up (5, 6)*, extend up to 7 -> (5, 8)
      return SelectionRange.create(this.anchor - 1, to + 1, false)
    } else if (this.inverted) {
      // Same direction down (5, 6)*, extend down to 2 -> (2, 6)
      return SelectionRange.create(to, this.to, true)
    } else if (!this.inverted) {
      // Same direction up (5, 6), extend up to 7 -> (5, 8)
      return SelectionRange.create(this.from, to + 1, false)
    }
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

  contains(pos: number): boolean {
    const [i0, i1] = [this.from, this.to]
    return i0 <= pos && pos < i1
  }

  /**
   * Calculate distance between ranges: touching ranges are 0 distance apart: (0, 1), (1, 2) are touching
   */
  distanceTo(range: SelectionRange): number {
    if (this.overlaps(range)) {
      return -1
    }

    const [r1, r2] = sortRanges([this, range])
    const [i0, i1] = r1.indices()
    const [j0, j1] = r2.indices()
    return j0 - i1
  }

  /**
   * Returns true if the two ranges overlap (1, 4) (4, 5)
   */
  overlaps(range: SelectionRange): boolean {
    const [r1, r2] = sortRanges([this, range])
    const [i0, i1] = r1.indices()
    const [j0, _] = r2.indices()

    return i0 <= j0 && j0 < i1
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

export interface List<N extends ListItem<T>, T extends Content> extends ListProps<N, T> {
  setItems(items: N[]): void
  // todo: change these methods to support multiple items: `...items`
  /** Adds item to the end of the list */
  add(item: N): void
  /** Inserts item at the given index */
  insert(item: N, i: number): void
  /** Removes items from the list */
  remove(item: N): void
  /** Removes items from given ListSelection */
  removeFrom(selection: ListSelection): void
  /** Removes items from specified range: from (inclusive), to (exclusive) */
  removeFrom(from: number, to: number): void
  /** Select item or clear selection */
  setSelection(selection: ListSelection, options?: SelectOptions): void
  /** Move selection up */
  up(): void
  /** Move selection down */
  down(): void
  /** Gets item by id */
  getItem(id: string): N | null
  /** Returns the position of the item in the list */
  getIndex(item: N): number
  /** Gets item by content id */
  getByContentId(id: string): N | null
}

export interface ListItem<T extends Content> extends ListItemProps<T> {}

export interface SvelteListItemProps<T extends Content> extends ListItemProps<T> {
  component: any
}

export class SvelteList<T extends Content>
  extends SvelteReactiveComponent<SvelteListProps<T>>
  implements List<SvelteListItem<T>, T>
{
  private focusListener?: (event: FocusEvent) => void
  private blurListener?: (event: FocusEvent) => void

  private _ids = new Set<string>()

  constructor(items: SvelteListItem<T>[]) {
    super({ selection: null, items, focused: null, e: null })
  }

  setItems(items: SvelteListItem<T>[]): void {
    this._addId(...items)
    this.items.forEach((item) => item.destroy())
    this._ids.clear()
    this.set('selection', null) // Reset selection when reseting the list
    this.set('items', items)
  }

  add(item: SvelteListItem<T>): void {
    this._addId(item)
    const newItems = [...this.items, item]
    this.set('items', newItems)
    // todo: update selection, for now reset
    this.setSelection(null)
  }

  insert(item: SvelteListItem<T>, i: number): void {
    this._addId(item)
    if (i < 0 || i > this.items.length) {
      throw new Error('Index out of bounds')
    }
    // todo: update selection, for now reset
    this.setSelection(null)
    const items = insert(this.items, item, i)
    this.set('items', items)
  }

  remove(item: SvelteListItem<T>): void {
    const index = this.items.indexOf(item)
    if (index === -1) {
      throw new Error('Item not found')
    }
    this._removeId(item)
    this.items[index].destroy()
    const items = remove(this.items, index)
    this.set('items', items)

    // todo: update selection, for now reset
    this.setSelection(null)
  }

  removeFrom(selection: ListSelection): void
  removeFrom(from: number, to: number): void
  removeFrom(from: number | ListSelection, to?: number): void {
    let selection: ListSelection
    if (typeof from == 'number') {
      selection = ListSelection.create([ListSelection.range(from, to!)])
    } else {
      selection = from
    }

    const [items, removed] = removeRanges(
      this.items,
      selection.ranges.map((r) => r.indices())
    )

    this._removeId(...removed)
    removed.forEach((item) => item.destroy())
    this.set('selection', null)
    this.set('items', items)
  }

  setSelection(selection: ListSelection | null, options?: SelectOptions | undefined): void {
    if (selection == null) {
      this.set('selection', selection)
    } else {
      // Check that selection is valid
      checkSelection(selection, this.items)
      this.set('selection', selection)

      if (options) {
        if (selection.main) {
          const item = this.items[selection.main.head]

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
    if (this.focused) {
      const i = this.items.findIndex((item) => item.id == this.focused!.id)
      if (i > 0) {
        this.setSelection(ListSelection.single(i - 1), { focus: true })
      }
    }
  }

  down() {
    if (this.focused) {
      const i = this.items.findIndex((item) => item.id === this.focused!.id)
      if (i < this.items.length - 1) {
        this.setSelection(ListSelection.single(i + 1), { focus: true })
      }
    }
  }

  getItem(id: string): SvelteListItem<T> | null {
    return this.items.find((i) => i.id === id) || null
  }

  getIndex(item: SvelteListItem<T>): number {
    return this.items.findIndex((listItem) => listItem === item)
  }

  getByContentId(id: string): SvelteListItem<T> | null {
    return this.items.find((i) => i.content.id === id) || null
  }

  setElement(e: HTMLElement): void {
    this.set('e', e)
    this.focusListener = (event: FocusEvent) => {
      const id = (event.target as HTMLElement).id
      if (id) {
        const item = this.getItem(id)
        if (item) {
          this.set('focused', item)
        } else {
          console.error(
            `Failed to find the HTMLElement corresponding to the focused list item with ID: '${id}'. Ensure each list item element has a unique 'id' attribute matching its data representation.`
          )
        }
      }
    }

    this.blurListener = () => {
      this.set('focused', null)
    }

    e.addEventListener('focus', this.focusListener, true)
    e.addEventListener('blur', this.blurListener, true)
  }

  destroy(): void {
    const e = this.e
    if (e) {
      this.focusListener && e.removeEventListener('focus', this.focusListener, true)
      this.blurListener && e.removeEventListener('blur', this.blurListener, true)
    }
  }

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

  private _addId(...items: SvelteListItem<T>[]) {
    items.forEach((item) => {
      if (this._ids.has(item.id)) {
        throw new Error(
          `Duplicate identifier detected: '${item.id}'. Each item must have a unique ID.`
        )
      }
    })
  }

  private _removeId(...items: SvelteListItem<T>[]) {
    items.forEach((item) => {
      this._ids.delete(item.id)
    })
  }
}

interface ListItemOptions {
  component: object | null
  selectable: boolean
}

interface ID {
  id: string
}

export interface Content extends ID {
  destroy(): void
}

export class SvelteListItem<T extends Content>
  extends SvelteReactiveComponent<SvelteListItemProps<T>>
  implements ListItem<T>
{
  constructor(id: string, content: T, options: Partial<ListItemOptions>) {
    const merged: ListItemOptions = mergeOptions(
      {
        component: null,
        selectable: true
      },
      options || {}
    )

    super({
      id,
      content,
      component: merged.component,
      selectable: merged.selectable
    })
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

  get selectable(): boolean {
    return this.getProp('selectable')
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

  destroy(): void {
    this.content.destroy()
  }
}

const sortRanges = (ranges: SelectionRange[]) => ranges.sort((a, b) => (a.less(b) ? -1 : 1))

/**
 * Removes given ranges from the array and returns the new array
 *
 * Ranges should be sorted and non-overlapping: (0, 1), (3, 5), etc.
 * The elements in a tuple (from, to) are both inclusive: (0, 1) will remove 0th and 1st element
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
    removedItems = removedItems.concat(array.slice(begin, end + 1))
    start = end + 1
  })

  // Add remainder
  result = result.concat(array.slice(start))

  return [result, removedItems]
}

function checkSelection(selection: ListSelection, items: SvelteListItem<any>[]) {
  if (selection.max > items.length - 1) {
    throw new RangeError('Selection points outside of array')
  }
}
