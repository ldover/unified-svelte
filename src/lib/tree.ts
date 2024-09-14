import { insert, remove } from './util.js'
import { SvelteReactiveComponent } from './reactive.js'
import { mergeOptions } from './util.js'

interface TreeProps<N extends TreeNode<N, T>, T> {
  root: N
  selected: N | null // for now keep it to single-selection
  navigationRoot: N
}

interface TreeNodeProps<N extends TreeNode<N, T>, T> {
  id: string
  selectable: boolean
  content: T
  parent: N | null
  children: N[]
  collapsed: boolean
  level: number
}

export interface Tree<N extends TreeNode<N, T>, T> extends TreeProps<N, T> {
  add(node: N, parent: N): void
  insert(node: N, parent: N, i: number): void
  /** Select node or clear selection */
  select(node: N | null): void
  /** Move selection up */
  up(): void
  /** Move selection down */
  down(): void
  /** Constrain the range of up/down navigation to a specified node */
  setNavigationRoot(node: N): void
}

export interface TreeNode<N extends TreeNode<N, T>, T> extends TreeNodeProps<N, T> {
  expand(): void
  collapse(): void
  /** Removes either direct child or descendant */
  remove(node: N): void
  /** Gets the direct child or descendant */
  get(id: string): N | null
}

interface BaseTreeNodeOptions {
  selectable: boolean
  collapsed: boolean
}

export interface TreeOptions<N extends TreeNode<N, T>, T> {}

export interface SvelteTreeNodeProps<T extends ID> extends TreeNodeProps<SvelteTreeNode<T>, T> {
  borderVisible: boolean
  contentComponent: any
  containerComponent: any
}

export interface SvelteTreeProps<T extends ID> extends TreeProps<SvelteTreeNode<T>, T> {}

export class SvelteTree<T extends ID>
  extends SvelteReactiveComponent<SvelteTreeProps<T>>
  implements Tree<SvelteTreeNode<T>, T>
{
  private ids?: Set<string>

  constructor(root: SvelteTreeNode<T>, options?: TreeOptions<SvelteTreeNode<T>, T>) {
    super({ root, navigationRoot: root, selected: null })
    this.validate()
  }

  get selected() {
    return this.getProp('selected')
  }

  get root() {
    return this.getProp('root')
  }

  get navigationRoot() {
    return this.getProp('navigationRoot')
  }

  add(node: SvelteTreeNode<T>, parent: SvelteTreeNode<T>): void {
    if (this.ids?.has(node.id)) {
      this._throwUniqueError(node.id)
    }
    this.ids?.add(node.id)
    parent.set('children', [...parent.children, node])
    node.set('parent', parent)
  }

  insert(node: SvelteTreeNode<T>, parent: SvelteTreeNode<T>, i: number): void {
    if (this.ids?.has(node.id)) {
      this._throwUniqueError(node.id)
    }
    this.ids?.add(node.id)
    parent.set('children', insert(parent.children, node, i))
    node.set('parent', parent)
  }

  select(node: SvelteTreeNode<T> | null): void {
    if (node != this.selected) {
      if (node && !node.selectable) {
        throw new Error('Cannot select node that has selectable set to false')
      }
      this.set('selected', node)
    }
  }

  up(): void {
    if (!this.selected) {
      return
    }
    const nodes = flattenVisibleTree(this.navigationRoot, true).filter((node) => node.selectable)
    const i = this.findNodeIndex(nodes, this.selected)

    if (i > 0) {
      const node = nodes[i - 1]
      this.select(node)
      node.focus()
    }
  }

  down(): void {
    if (!this.selected) {
      return
    }

    const nodes = flattenVisibleTree(this.navigationRoot, true).filter((node) => node.selectable)
    const i = this.findNodeIndex(nodes, this.selected)

    if (i < nodes.length - 1) {
      const node = nodes[i + 1]
      this.select(node)
      node.focus()
    }
  }

  setNavigationRoot(node: SvelteTreeNode<T>) {
    if (this.selected && !node.get(this.selected.id)) {
      throw new Error('Selected node must be inside the navigation range')
    }

    this.set('navigationRoot', node)
  }

  private findNodeIndex(nodes: SvelteTreeNode<T>[], node: SvelteTreeNode<T>): number {
    const i = nodes.findIndex((n) => n.id === node.id)
    if (i == -1) {
      throw new Error(`Node not found (id=${node.id})`)
    }

    return i
  }

  private validate() {
    // Check for unique ids
    const set = new Set([this.root.id])
    const validateOne = (node: SvelteTreeNode<T>) => {
      node.children.forEach((child) => {
        if (set.has(child.id)) {
          this._throwUniqueError(child.id)
        }
        set.add(child.id)
        validateOne(child)
      })
    }

    validateOne(this.root)

    this.ids = set
  }

  private _throwUniqueError(id: string) {
    throw new Error(
      'Tree validation failed: nodes must have unique ids, but found two nodes with id ' + id
    )
  }
}

interface SvelteTreeNodeOptions extends BaseTreeNodeOptions {
  contentComponent: object | null
  containerComponent: object | null
  borderVisible: boolean
}

interface ID {
  id: string
}

export class SvelteTreeNode<T extends ID>
  extends SvelteReactiveComponent<SvelteTreeNodeProps<T>>
  implements TreeNode<SvelteTreeNode<T>, T>
{
  constructor(
    id: string,
    content: T,
    children: SvelteTreeNode<T>[],
    level: number,
    options: Partial<SvelteTreeNodeOptions>
  ) {
    const merged: SvelteTreeNodeOptions = mergeOptions(
      {
        contentComponent: null,
        containerComponent: null,
        borderVisible: false,
        selectable: true,
        collapsed: true
      },
      options || {}
    )

    super({
      id,
      content,
      children,
      level,
      contentComponent: merged.contentComponent,
      containerComponent: merged.containerComponent,
      borderVisible: merged.borderVisible,
      selectable: merged.selectable,
      collapsed: merged.collapsed,
      parent: null
    })
  }

  get id(): string {
    return this.getProp('id')
  }

  get content(): T {
    return this.getProp('content')
  }

  get children(): SvelteTreeNode<T>[] {
    return this.getProp('children')
  }

  get level(): number {
    return this.getProp('level')
  }

  get contentComponent(): object | null {
    return this.getProp('contentComponent')
  }

  get containerComponent(): object | null {
    return this.getProp('containerComponent')
  }

  get borderVisible(): boolean {
    return this.getProp('borderVisible')
  }

  get selectable(): boolean {
    return this.getProp('selectable')
  }

  get collapsed(): boolean {
    return this.getProp('collapsed')
  }

  get parent(): SvelteTreeNode<T> | null {
    return this.getProp('parent')
  }

  remove(node: SvelteTreeNode<T>, deep: boolean = false): boolean {
    const index = this.children.findIndex((child) => child.id === node.id)
    if (index !== -1) {
      this.set('children', remove(this.children, index))
      return true
    } else {
      if (deep) {
        for (const child of this.getProp('children')) {
          if (child.remove(node, deep)) {
            return true
          }
        }
      }
    }

    return false
  }

  get(id: string, deep: boolean = false): SvelteTreeNode<T> | null {
    if (this.id === id) return this
    for (let child of this.children) {
      if (child.id === id) {
        return child
      }
    }

    if (deep) {
      for (let child of this.children) {
        let result = child.get(id)
        if (result) return result
      }
    }

    return null
  }

  getByContentId(contentId: string): SvelteTreeNode<T>[] {
    let result: SvelteTreeNode<T>[] = []
    for (let child of this.children) {
      result = [...result, ...child.getByContentId(contentId)]
    }

    if (this.content.id === contentId) {
      return [this, ...result]
    } else {
      return result
    }
  }

  expand() {
    this.set('collapsed', false)
  }

  collapse() {
    this.set('collapsed', true)
  }

  focus() {
    if (document.activeElement?.id !== this.id) {
      const e = document.getElementById(this.id)
      if (!e) {
        return console.warn('failed to focus SvelteTreeNode: element not found')
      }
      e.focus()
    }
  }

  setBorder(borderVisible: boolean) {
    this.set('borderVisible', borderVisible)
  }
}

export function flattenVisibleTree<N extends TreeNode<any, any>>(node: N, root = false): N[] {
  let items: N[] = []
  if (root) {
    items.push(node)
  }

  if (node.children.length) {
    if (!node.collapsed) {
      node.children.forEach((item) => {
        items.push(item)
        items = [...items, ...flattenVisibleTree(item)]
      })
    }
  }

  return items
}
