import { SvelteReactiveComponent } from './reactive.js'
import { inView, insert, mergeOptions, remove } from './util.js'

interface ListItemProps<T extends Content> {
  id: string
  selectable: boolean
  content: T
}

interface ListProps<N extends ListItem<T>, T extends Content> {
  items: N[]
  selection: ListSelection
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
  public readonly mainIndex: number | null

  constructor(
    public ranges: readonly SelectionRange[],
    mainIndex?: number
  ) {
    if (mainIndex == undefined) {
      if (ranges.length) {
        mainIndex = ranges.length - 1
      }
    }

    this.mainIndex = mainIndex != undefined ? mainIndex : null
  }

  /**
  Extend this selection with an extra range.
  */
  addRange(range: SelectionRange): ListSelection {
    let ranges = [...this.ranges]
    // Determine where to insert so the ranges remain sorted
    const i = this.ranges.findIndex((r) => range.less(r))
    if (i == -1) {
      ranges.push(range)
    } else {
      ranges.splice(i, 0, range)
    }

    let mainIndex: number

    ranges = this._removeOverlappingRanges(range, ranges)
    ;[ranges, mainIndex] = this._removeTouchingRanges(range, ranges)
    return new ListSelection(ranges, mainIndex)
  }

  /**
  Replace a given range with another range, and then normalize the
  selection to merge and sort ranges if necessary.
  */
  replaceRange(range: SelectionRange, which: number): ListSelection {
    let ranges = [...this.ranges]

    ranges.splice(which, 1, range)

    // Sort after changing the range
    ranges = sortRanges(ranges)

    let mainIndex: number

    ranges = this._removeOverlappingRanges(range, ranges)
    ;[ranges, mainIndex] = this._removeTouchingRanges(range, ranges)
    return new ListSelection(ranges, mainIndex)
  }

  /**
   * Remove this index from the selection range, creating two ranges if the position is in the middle
   * of the range
   */
  splitRange(index: number): ListSelection {
    const rangeIndex = this.ranges.findIndex((range) => range.contains(index))

    const range = this.ranges[rangeIndex]

    if (range.empty()) {
      if (this.ranges.length > 1) {
        // Remove range if empty and move mainIndex to the closest range
        const mainIndex = 0
        return ListSelection.create(
          this.ranges.slice(0, rangeIndex).concat(this.ranges.slice(rangeIndex + 1)),
          mainIndex
        )
      } else {
        return ListSelection.empty()
      }
    } else {
      // Split this range in two if index is in the middle of the selecton
      // or shorten the range if index is at the edge of selection
      let [i0, i1] = [range.anchor, range.head]
      if (i0 > i1) {
        ;[i0, i1] = [i1, i0]
      }

      const atTheEdge = index === range.anchor || index === range.head
      const ranges = [...this.ranges]

      if (!atTheEdge) {
        // Split into two separate ranges
        const range1 = ListSelection.range(i0, index - 1)
        const range2 = ListSelection.range(index + 1, i1)

        ranges.splice(rangeIndex, 1, range1, range2)
        const mainIndex = ranges.findIndex((r) => r === this.main)

        return ListSelection.create(ranges, mainIndex)
      } else {
        // Shorten the range
        let newRange
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
   * Returns true if there is no selection range
   */
  isNone(): boolean {
    return this.ranges.length == 0
  }

  /**
   * Returns true if there is a single empty selection range
   */
  isSingle(): boolean {
    return this.ranges.length == 1 && this.ranges[0].empty()
  }

  get main(): SelectionRange | null {
    if (this.mainIndex != null) {
      return this.ranges[this.mainIndex]
    }

    return null
  }

  isMultiple(): boolean {
    if (this.ranges.length == 1) {
      return !this.ranges[0].empty()
    }

    return this.ranges.length >= 2
  }

  private _removeOverlappingRanges(
    range: SelectionRange,
    ranges: SelectionRange[]
  ): SelectionRange[] {
    const overlappingIndices: Set<number> = new Set(
      ranges
        .map((R, i) => (R != range && R.overlaps(range) ? i : null))
        .filter((r) => r !== null) as number[]
    )
    if (overlappingIndices.size) {
      ranges = ranges.filter((_, i) => !overlappingIndices.has(i))
      console.log('remove overlapping', overlappingIndices)
    }

    return ranges
  }

  /**
   * Removes the ranges that touch the given range;
   * todo: maybe a general "merge touching" would be useful: consider creating new ListSelection and passing it touching or overlapping ranges: it should merge them, or throw error...
   *
   * @param range - given range
   * @param ranges
   * @returns
   */
  private _removeTouchingRanges(
    range: SelectionRange,
    ranges: SelectionRange[]
  ): [SelectionRange[], number] {
    let rangeIndex = ranges.findIndex((r) => r.eq(range))
    console.assert(rangeIndex != -1, 'Given range not found in ranges', { range, ranges })

    const touchingIndices: number[] = ranges
      .map((R, i) => (R != range && R.touches(range) ? i : null))
      .filter((r) => r !== null) as number[]
    if (touchingIndices.length) {
      // Touching indices can only be around our range
      console.assert(touchingIndices.length <= 2)
      console.log('remove touching', touchingIndices)

      const newRange = mergeRanges(range, ...touchingIndices.map((i) => ranges[i]))

      ranges[rangeIndex] = newRange
      ranges = ranges.filter((_, i) => !touchingIndices.includes(i))
      rangeIndex = ranges.findIndex((r) => r == newRange)
    }

    return [ranges, rangeIndex]
  }

  static create(ranges: readonly SelectionRange[], mainIndex?: number): ListSelection {
    return new ListSelection(ranges, mainIndex)
  }

  static empty(): ListSelection {
    return new ListSelection([])
  }

  static single(index: number): SelectionRange {
    return new SelectionRange(index, index)
  }

  /**
  Create a selection range.
  */
  static range(anchor: number, head: number): SelectionRange {
    return new SelectionRange(anchor, head)
  }
}

export class SelectionRange {
  anchor: number
  head: number

  constructor(anchor: number, head: number) {
    this.anchor = anchor
    this.head = head
  }

  empty(): boolean {
    return this.anchor == this.head
  }

  extend(to: number): SelectionRange {
    return new SelectionRange(this.anchor, to)
  }

  eq(other: SelectionRange): boolean {
    return this.anchor === other.anchor && this.head === other.head
  }

  /**
   * Returns true if this selection range is less than other
   * @param other
   * @returns
   */
  less(other: SelectionRange): boolean {
    const [i0, i1] = this.indices()
    const [j0, j1] = other.indices()

    if (i0 == j0) {
      return i1 < j1
    } else {
      return i0 < j0
    }
  }

  contains(pos: number): boolean {
    const [i0, i1] = this.indices()
    if (i0 <= pos && pos <= i1) {
      return true
    }
    return false
  }

  length(): number {
    return Math.abs(this.anchor - this.head)
  }

  /**
   * Returns true if the two ranges overlap
   * @param range
   * @returns
   */
  overlaps(range: SelectionRange): boolean {
    const [r1, r2] = sortRanges([this, range])
    const [i0, i1] = r1.indices()
    const [j0, j1] = r2.indices()

    if (i0 <= j0 && j0 <= i1) {
      return true
    }

    return false
  }

  touches(range: SelectionRange): boolean {
    if (this.overlaps(range)) return false

    // Sort them and check if they're adjacent
    const [r1, r2] = sortRanges([this, range])
    if (r1.indices()[1] == r2.indices()[0] - 1) {
      return true
    }

    return false
  }

  /**
   *
   * @returns indices sorted
   */
  indices(): [number, number] {
    // Note: head can be less than anchor
    return [this.head, this.anchor].sort((a, b) => a - b) as [number, number]
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
  /** Removes items from specified range: from (inclusive), to (exclusive) */
  removeFrom(selection: ListSelection): void
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

  constructor(items: SvelteListItem<T>[]) {
    super({ selection: ListSelection.create([]), items, focused: null, e: null })
  }

  setItems(items: SvelteListItem<T>[]): void {
    this.items.forEach((item) => item.destroy())
    this.set('selection', ListSelection.empty()) // Reset selection when reseting the list
    this.set('items', items)
  }

  add(item: SvelteListItem<T>): void {
    const newItems = [...this.items, item]
    this.set('items', newItems)
    // todo: update selection, for now reset
    this.setSelection(ListSelection.empty())
  }

  insert(item: SvelteListItem<T>, i: number): void {
    if (i < 0 || i > this.items.length) {
      throw new Error('Index out of bounds')
    }
    // todo: update selection, for now reset
    this.setSelection(ListSelection.empty())
    const items = insert(this.items, item, i)
    this.set('items', items)
  }

  remove(item: SvelteListItem<T>): void {
    const index = this.items.indexOf(item)
    if (index === -1) {
      throw new Error('Item not found')
    }
    this.items[index].destroy()
    const items = remove(this.items, index)
    this.set('items', items)

    // todo: update selection, for now reset
    this.setSelection(ListSelection.empty())
  }

  removeFrom(selection: ListSelection): void
  removeFrom(from: number, to: number): void
  removeFrom(from: number | ListSelection, to?: number): void {
    let items: SvelteListItem<T>[]
    let selection: ListSelection
    if (typeof from == 'number') {
      selection = ListSelection.create([ListSelection.range(from, to!)])
    } else {
      selection = from
    }

    items = removeRanges(
      this.items,
      selection.ranges.map((r) => r.indices())
    )

    this.set('selection', ListSelection.empty())
    this.set('items', items)
  }

  setSelection(selection: ListSelection, options?: SelectOptions | undefined): void {
    // Check that selection is valid
    if (!selection.isNone() && selection.ranges.slice(-1)[0].indices()[1] > this.items.length - 1) {
      throw new Error('Selection out of bounds')
    }
    this.set('selection', selection)

    if (options && !selection.isNone()) {
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

  up() {
    if (this.focused) {
      const i = this.items.findIndex((item) => item.id == this.focused!.id)
      if (i > 0) {
        const item = this.items[i - 1]
        this.setSelection(ListSelection.create([ListSelection.single(i - 1)]))
        item.focus()
      }
    }
  }

  down() {
    if (this.focused) {
      const i = this.items.findIndex((item) => item.id === this.focused!.id)
      if (i < this.items.length - 1) {
        const item = this.items[i + 1]
        this.setSelection(ListSelection.create([ListSelection.single(i + 1)]))
        item.focus()
      }
    }
  }

  setFocused(item: SvelteListItem<T> | null): void {
    this.set('focused', item)
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
      const item = this.getItem(id)
      if (item) {
        this.setFocused(item)
      } else {
        console.error(
          `Failed to find the HTMLElement corresponding to the focused list item with ID: '${id}'. Ensure each list item element has a unique 'id' attribute matching its data representation.`
        )
      }
    }

    this.blurListener = () => {
      this.setFocused(null)
    }

    e.addEventListener('focus', this.focusListener, true)
    e.addEventListener('blur', this.blurListener, true)
  }

  destroy(): void {
    const e = this.getProp('e')
    if (e) {
      this.focusListener && e.removeEventListener('focus', this.focusListener, true)
      this.blurListener && e.removeEventListener('blur', this.blurListener, true)
    }
  }

  get selection(): ListSelection {
    return this.getProp('selection')
  }

  get items(): SvelteListItem<T>[] {
    return this.getProp('items')
  }

  get focused(): SvelteListItem<T> | null {
    return this.getProp('focused')
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

const sortRanges = (ranges: SelectionRange[]) =>
  ranges.sort((a, b) => (a.eq(b) ? 0 : a.less(b) ? -1 : +1))

const mergeRanges = (...ranges: SelectionRange[]): SelectionRange => {
  const sortedRanges = sortRanges(ranges)

  const i0 = sortedRanges[0].indices()[0]
  const i1 = sortedRanges[sortedRanges.length - 1].indices()[1]

  return ListSelection.range(i0, i1)
}

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
function removeRanges<T>(array: T[], ranges: [number, number][]): T[] {
  let result: T[] = []
  let start = 0

  // todo: test this logic that it indeed removes the
  ranges.forEach(([begin, end]) => {
    result = result.concat(array.slice(start, begin))
    start = end + 1
  })

  // Add the remaining elements after the last range
  result = result.concat(array.slice(start))

  return result
}
