import { ReactiveComponent, SvelteReactiveComponent } from './store.js'

interface TreeProps<N extends TreeNode<N, T>, T> {
  root: N
  selected: N | null // for now keep it to single-selection
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
  /** Select node or clear selection */
  select: (node: N | null) => void
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

export interface TreeNode<N extends TreeNode<N, T>, T> extends TreeNodeProps<N, T> {
  expand: () => void
  collapse: () => void

  add: (node: N) => void
  insert: (node: N, i: number) => void
  /** Removes either direct child or descendant */
  remove: (node: N) => void
  /** Gets the direct child or descendant */
  get: (id: string) => N | null
}

interface BaseTreeNodeOptions {
  selectable: boolean
  collapsed: boolean
}

const mergeOptions = <T>(defaults: T, options: Partial<T>): T => {
  return {
    ...defaults,
    ...options
  }
}

export class BaseTreeNode<N extends TreeNode<N, T>, T>
  extends ReactiveComponent<TreeNodeProps<N, T>>
  implements TreeNode<N, T>
{
  public collapsed: boolean
  public parent: N | null = null
  public selectable: boolean

  constructor(
    public readonly id: string,
    public content: T,
    public children: readonly N[],
    public level: number,
    options?: Partial<BaseTreeNodeOptions>
  ) {
    super()
    const merged: BaseTreeNodeOptions = mergeOptions(
      {
        selectable: true,
        collapsed: true
      },
      options || {}
    )

    this.selectable = merged.selectable
    this.collapsed = merged.collapsed
  }

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

  update(): void {
    // todo: do we need this?
  }
}

export interface TreeOptions<N extends TreeNode<N, T>, T> {}

export class BaseTree<N extends TreeNode<N, T>, T>
  extends ReactiveComponent<TreeProps<N, T>>
  implements Tree<N, T>
{
  public selected: N | null = null

  private navigationRoot: N

  constructor(
    public root: N,
    options?: TreeOptions<N, T>
  ) {
    super()
    this.navigationRoot = root
  }

  select(node: N | null): void {
    if (node != this.selected) {
      if (node && !node.selectable) {
        throw new Error('Cannot select node that has selectable set to false')
      }
      this.selected = node
    }
  }

  up(): void {
    if (!this.selected) {
      return
    }
    const nodes = flattenVisibleTree(this.navigationRoot, true).filter((node) => node.selectable)
    const i = this.findNodeIndex(nodes, this.selected)

    if (i > 0) {
      this.select(nodes[i - 1])
    }
  }

  down(): void {
    if (!this.selected) {
      return
    }

    const nodes = flattenVisibleTree(this.navigationRoot, true).filter((node) => node.selectable)
    const i = this.findNodeIndex(nodes, this.selected)

    if (i < nodes.length - 1) {
      this.select(nodes[i + 1])
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

  update(): void {
    // todo: do we need this?
  }
}

export interface SvelteTreeNodeProps<T> extends TreeNodeProps<SvelteTreeNode<T>, T> {
  borderVisible: boolean
  contentComponent: any
  containerComponent: any
}

export interface SvelteTreeProps<T> extends TreeProps<SvelteTreeNode<T>, T> {}

export class SvelteTree<T>
  extends SvelteReactiveComponent<SvelteTreeProps<T>>
  implements Tree<SvelteTreeNode<T>, T>
{
  public selected: SvelteTreeNode<T> | null = null
  public root: SvelteTreeNode<T>

  private navigationRoot: SvelteTreeNode<T>

  constructor(root: SvelteTreeNode<T>, options?: TreeOptions<SvelteTreeNode<T>, T>) {
    super()
    this.root = root
    this.navigationRoot = root
  }

  getState(): SvelteTreeProps<T> {
    return {
      root: this.root,
      selected: this.selected
    }
  }

  select(node: SvelteTreeNode<T> | null): void {
    if (node != this.selected) {
      if (node && !node.selectable) {
        throw new Error('Cannot select node that has selectable set to false')
      }
      this.selected = node
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

    this.navigationRoot = node
  }

  private findNodeIndex(nodes: SvelteTreeNode<T>[], node: SvelteTreeNode<T>): number {
    const i = nodes.findIndex((n) => n.id === node.id)
    if (i == -1) {
      throw new Error(`Node not found (id=${node.id})`)
    }

    return i
  }
}

interface SvelteTreeNodeOptions extends BaseTreeNodeOptions {
  contentComponent: object | null
  containerComponent: object | null
  borderVisible: boolean
}

export class SvelteTreeNode<T>
  extends SvelteReactiveComponent<SvelteTreeNodeProps<T>>
  implements TreeNode<SvelteTreeNode<T>, T>
{
  public id: string
  public content: T
  public children: SvelteTreeNode<T>[]
  public level: number

  public contentComponent: object | null
  public containerComponent: object | null
  public borderVisible: boolean
  public selectable: boolean
  public collapsed: boolean
  public parent: SvelteTreeNode<T> | null

  constructor(
    id: string,
    content: T,
    children: SvelteTreeNode<T>[],
    level: number,
    options: Partial<SvelteTreeNodeOptions>
  ) {
    super()
    const merged: SvelteTreeNodeOptions = mergeOptions(
      {
        contentComponent: null,
        containerComponent: null,
        borderVisible: false,
        selectable: true, // todo: I'm duplicating this merging from BaseTree
        collapsed: true
      },
      options || {}
    )

    this.id = id
    this.content = content
    this.children = children
    this.level = level
    this.contentComponent = merged.contentComponent
    this.containerComponent = merged.containerComponent
    this.borderVisible = merged.borderVisible
    this.selectable = merged.selectable
    this.collapsed = merged.collapsed
    this.collapsed = merged.collapsed
    this.parent = null
  }

  insert(node: SvelteTreeNode<T>, i: number) {
    this.children = insert(this.children, node, i)

    // @ts-ignore
    node.parent = this
  }

  add(node: SvelteTreeNode<T>) {
    this.children = [...this.children, node]
    node.parent = this
  }

  remove(node: SvelteTreeNode<T>) {
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
  get(id: string): SvelteTreeNode<T> | null {
    if (this.id === id) return this as any as SvelteTreeNode<T>
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

  getState(): SvelteTreeNodeProps<T> {
    return {
      id: this.id,
      selectable: this.selectable,
      parent: this.parent,
      level: this.level,
      collapsed: this.collapsed,
      children: this.children,
      content: this.content,
      borderVisible: this.borderVisible,
      contentComponent: this.contentComponent,
      containerComponent: this.containerComponent
    }
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
    this.borderVisible = borderVisible
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
