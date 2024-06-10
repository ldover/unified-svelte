import type { Storable } from '$lib/store.js'

export interface Tree<N extends TreeNode<N, T>, T> {
  root: N
  selected: N | null // for now keep it to single-selection

  /** Select node */
  setSelection: (node: N) => void
  clearSelection: () => void
  /** Trigger node selection event */
  select: (node: N) => void
  /** Move selection up */
  up: () => void
  /** Move selection down */
  down: () => void
}

export interface TreeNode<N extends TreeNode<N, T>, T> {
  id: string
  content: T
  parent: N | null
  children: N[]
  collapsed: boolean
  expand: () => void
  collapse: () => void

  level: number

  add: (node: N) => void
  insert: (node: N, i: number) => void
  /** Removes either direct child or descendant */
  remove: (node: N) => void
  /** Gets the direct child or descendant */
  get: (id: string) => N | null
}

export class BaseTreeNode<N extends TreeNode<N, T>, T> implements TreeNode<N, T> {
  public collapsed: boolean = true
  public parent: N | null = null

  constructor(
    public id: string,
    public content: T,
    public children: N[],
    public level: number,
    public onSelect: (node: N) => void
  ) {}

  insert(node: N, i: number) {
    this.children.splice(i, 0, node)
    // @ts-ignore
    node.parent = this
  }

  remove(node: N) {
    const index = this.children.findIndex((child) => child.id === node.id)
    if (index !== -1) {
      // Remove the child at the found index
      this.children.splice(index, 1)
    } else {
      // Recursively remove the node if not found in the immediate children
      this.children.forEach((child) => child.remove(node))
    }
  }

  // @ts-ignore
  get(id: string) {
    if (this.id === id) return this
    for (let child of this.children) {
      let result = child.get(id)
      if (result) return result
    }
    return null
  }

  add(node: N) {
    this.children = [...this.children, node]
  }

  expand() {
    this.collapsed = false
  }

  collapse() {
    this.collapsed = true
  }
}

export interface TreeOptions<N extends TreeNode<N, T>, T> {
  callbacks: {
    onSelect: (node: N) => void
  }
}

export class BaseTree<N extends TreeNode<N, T>, T> implements Tree<N, T> {
  selected: N | null = null

  constructor(
    public root: N,
    protected options: TreeOptions<N, T>
  ) {}

  clearSelection(): void {
    this.selected = null
  }

  setSelection(node: N): void {
    this.selected = node
  }

  select(node: N): void {
    this.options.callbacks.onSelect(node)
  }

  up(): void {
    if (!this.selected) {
      return
    }
    const id = this.selected.id
    const nodes = flattenVisibleTree(this.root, true)

    const i = nodes.findIndex((v) => v.id === id)
    if (i > 0) {
      this.options.callbacks.onSelect(nodes[i - 1])
    }
  }

  down(): void {
    if (!this.selected) {
      return
    }
    const id = this.selected.id
    const nodes = flattenVisibleTree(this.root, true)

    const i = nodes.findIndex((v) => v.id === id)
    if (i < nodes.length - 1) {
      this.options.callbacks.onSelect(nodes[i + 1])
    }
  }
}

export interface SvelteTreeNodeState<T> {
  content: T
  collapsed: boolean
  children: SvelteTreeNode<T>[]
  contentComponent: any
  containerComponent: any
}

export interface SvelteTreeState<T> {
  root: SvelteTreeNode<T>
  selected: SvelteTreeNode<T> | null
}

export class SvelteTree<T>
  extends BaseTree<SvelteTreeNode<T>, T>
  implements Storable<SvelteTree<T>, SvelteTreeState<T>>
{
  constructor(
    public root: SvelteTreeNode<T>,
    protected options: TreeOptions<SvelteTreeNode<T>, T>
  ) {
    super(root, options)
  }

  getState(): SvelteTreeState<T> {
    return {
      root: this.root,
      selected: this.selected
    }
  }

  getReactiveProps(): string[] {
    return ['selected']
  }

  select(node: SvelteTreeNode<T>) {
    super.select(node)
    this.selected?.focus()
  }

  up() {
    super.up()
    this.selected?.focus()
  }

  down() {
    super.down()
    this.selected?.focus()
  }
}

export class SvelteTreeNode<T>
  extends BaseTreeNode<SvelteTreeNode<T>, T>
  implements Storable<SvelteTreeNode<T>, SvelteTreeNodeState<T>>
{
  constructor(
    public id: string,
    public content: T,
    public children: SvelteTreeNode<T>[],
    public level: number,
    public onSelect: (node: SvelteTreeNode<T>) => void,
    public contentComponent: any,
    public containerComponent: any
  ) {
    super(id, content, children, level, onSelect)
  }

  getState(): SvelteTreeNodeState<T> {
    return {
      collapsed: this.collapsed,
      children: this.children,
      content: this.content,
      contentComponent: this.contentComponent,
      containerComponent: this.containerComponent
    }
  }

  getReactiveProps(): string[] {
    return ['collapsed', 'children']
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
