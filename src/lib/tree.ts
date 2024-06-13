import type { Storable } from '$lib/store.js'

export interface Tree<N extends TreeNode<N, T>, T> {
  root: N
  selected: N | null // for now keep it to single-selection

  /** Set the selected node */
  setSelection: (node: N) => void
  /** Clear the selected node */
  clearSelection: () => void
  /** Trigger node selection event */
  select: (node: N) => void
  /** Move selection up */
  up: () => void
  /** Move selection down */
  down: () => void
  /** Constrain the range of up/down navigation to a specified node */
  setNavigationRoot: (node: N) => void
}

function insert<T>(arr: readonly T[], item: T, i: number): T[] {
  return [...arr].splice(i, 0, item)
}

function remove<T>(arr: readonly T[], i: number): T[] {
  return [...arr].splice(i, 1)
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
    public children: readonly N[],
    public level: number
  ) {}

  insert(node: N, i: number) {
    this.children = insert(this.children, node, i)

    // @ts-ignore
    node.parent = this
  }

  add(node: N) {
    this.children = [...this.children, node]
    // @ts-expect-error
    node.parent = this
  }

  remove(node: N) {
    const index = this.children.findIndex((child) => child.id === node.id)
    if (index !== -1) {
      // Remove the child at the found index
      this.children = remove(this.children, index)
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
  public selected: N | null = null

  private navigationRoot: N

  constructor(
    public root: N,
    protected options: TreeOptions<N, T>
  ) {
    this.navigationRoot = root
  }

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
    const nodes = flattenVisibleTree(this.navigationRoot, true)
    const i = this.findNodeIndex(nodes, this.selected)

    if (i > 0) {
      this.options.callbacks.onSelect(nodes[i - 1])
    }
  }

  down(): void {
    if (!this.selected) {
      return
    }

    const nodes = flattenVisibleTree(this.navigationRoot, true)
    const i = this.findNodeIndex(nodes, this.selected)

    if (i < nodes.length - 1) {
      this.options.callbacks.onSelect(nodes[i + 1])
    }
  }

  setNavigationRoot(node: N) {
    if (this.selected && !node.get(this.selected.id)) {
      throw new Error('Selected node must be inside the navigation range')
    }

    this.navigationRoot = node
  }

  private findNodeIndex(nodes: N[], node: N): number {
    const i = nodes.findIndex((n) => n.id === node.id)
    if (i == -1) {
      throw new Error(`Node not found (id=${node.id})`)
    }

    return i
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
    public contentComponent: any,
    public containerComponent: any
  ) {
    super(id, content, children, level)
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
