import { SvelteReactiveComponent } from './reactive.js'
import { inView, insert, mergeOptions, remove } from './util.js'

interface ListItemProps<T extends Content> {
  id: string
  selectable: boolean
  content: T
}

interface ListProps<N extends ListItem<T>, T extends Content> {
  items: N[]
  selection: Record<string, N>
}

interface SvelteListProps<T extends Content> extends ListProps<SvelteListItem<T>, T> {
  e: HTMLElement | null
  focused: SvelteListItem<T> | null
}

interface SelectOptions {
  scrollIntoView?: boolean // defaults to true
  focus?: boolean // defaults to false
}

export interface List<N extends ListItem<T>, T extends Content> {
  setItems(items: N[]): void
  // todo: change these methods to support multiple items: `...items`
  /** Adds item to the end of the list */
  add(item: N): void
  /** Inserts item at the given index */
  insert(item: N, i: number): void
  // todo: removeAt(from, to): void
  /** Removes items from the list */
  remove(item: N): void
  /** Select item or clear selection */
  select(item: N | null, options?: SelectOptions): void
  selectAll(): void
  /** Extends selection to the provided item */
  extendSelection(item: N): void
  /** Adds this item to selection */
  addSelection(item: N): void
  /** Remove this item from selection */
  removeSelection(item: N): void
  /** Clears selection */
  clear(): void
  /** Move selection up */
  up(): void
  /** Move selection down */
  down(): void
  /** Gets item by id */
  getItem(id: string): N | null
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

  private _lastSelection: SvelteListItem<T> | null = null

  constructor(items: SvelteListItem<T>[]) {
    super({ selection: {}, items, focused: null, e: null })
  }

  setItems(items: SvelteListItem<T>[]): void {
    this.items.forEach((item) => item.destroy())
    this.set('selection', {}) // Reset selection when reseting the list
    this.set('items', items)
  }

  add(item: SvelteListItem<T>): void {
    const newItems = [...this.items, item]
    this.set('items', newItems)
  }

  insert(item: SvelteListItem<T>, i: number): void {
    if (i < 0 || i > this.items.length) {
      throw new Error('Index out of bounds')
    }
    const items = insert(this.items, item, i)
    this.set('items', items)
  }

  // todo: figure out how to design API to remove all selected items
  remove(item: SvelteListItem<T>): void {
    const index = this.items.indexOf(item)
    if (index === -1) {
      throw new Error('Item not found')
    }
    this.items[index].destroy()
    const items = remove(this.items, index)
    this.set('items', items)

    // Update selection if the removed item was selected
    if (item.id in this.selection) {
      const newSelection = { ...this.selection }
      delete newSelection[item.id]
      this.set('selection', newSelection)
      if (this._lastSelection === item) {
        this._lastSelection = null
      }
    }
  }

  select(item: SvelteListItem<T>, options?: SelectOptions): void {
    this.set('selection', { [item.id]: item })
    this._lastSelection = item

    let eItem = document.getElementById(item.id)
    if (options?.scrollIntoView != false && this.e && eItem && !inView(this.e, eItem)) {
      eItem.scrollIntoView({ behavior: 'instant', block: 'nearest' })
    }

    if (options?.focus && !item.focused()) {
      item.focus()
    }
  }

  selectAll(): void {
    const selection = Object.fromEntries(this.items.map((item) => [item.id, item]))
    this.set('selection', selection)
  }

  // todo: this is only a partial implementation of multiple select that doesn't handle the combinations
  //   of add selection and extend selection operations.
  extendSelection(item: SvelteListItem<T>): void {
    const i = this.items.findIndex((i) => i === item)
    if (i >= 0) {
      let from = this._lastSelection ? this.items.findIndex((i) => i === this._lastSelection) : 0
      let to = i
      if (from > to) {
        ;[from, to] = [to, from]
      } else {
        to += 1
      }

      const selection: Record<string, SvelteListItem<T>> = {}
      if (this._lastSelection) {
        selection[this._lastSelection.id] = this._lastSelection
      }
      this.items.slice(from, to).forEach((item) => {
        selection[item.id] = item
      })

      this.set('selection', selection)
    }
  }
  addSelection(item: SvelteListItem<T>): void {
    this.set('selection', { ...this.selection, [item.id]: item })
    this._lastSelection = item
  }
  removeSelection(item: SvelteListItem<T>): void {
    delete this.selection[item.id]
    if (item === this._lastSelection) {
      this._lastSelection = null
    }
    this.set('selection', this.selection)
  }
  clear(): void {
    this.set('selection', {})
    this._lastSelection = null
  }

  up() {
    if (this.focused) {
      const i = this.items.findIndex((item) => item.id == this.focused!.id)
      if (i > 0) {
        const item = this.items[i - 1]
        this.select(item)
        item.focus()
      }
    }
  }

  down() {
    if (this.focused) {
      const i = this.items.findIndex((item) => item.id === this.focused!.id)
      if (i < this.items.length - 1) {
        const item = this.items[i + 1]
        this.select(item)
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

  get selection() {
    return this.getProp('selection')
  }

  get items() {
    return this.getProp('items')
  }

  get focused() {
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
