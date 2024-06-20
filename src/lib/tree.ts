import { ReactiveComponent, SvelteReactiveComponent } from './reactive.js'

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

export interface TreeOptions<N extends TreeNode<N, T>, T> {}

export interface SvelteTreeNodeProps<T> extends TreeNodeProps<SvelteTreeNode<T>, T> {
  borderVisible: boolean
  contentComponent: any
  containerComponent: any
}

export interface SvelteTreeProps<T> extends TreeProps<SvelteTreeNode<T>, T> {
  navigationRoot: SvelteTreeNode<T>
}

export class SvelteTree<T>
  extends SvelteReactiveComponent<SvelteTreeProps<T>>
  implements Tree<SvelteTreeNode<T>, T>
{
  constructor(root: SvelteTreeNode<T>, options?: TreeOptions<SvelteTreeNode<T>, T>) {
    super({ root, navigationRoot: root, selected: null })
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

  insert(node: SvelteTreeNode<T>, i: number) {
    this.set('children', insert(this.children, node, i))

    // @ts-ignore
    node.parent = this
  }

  add(node: SvelteTreeNode<T>) {
    this.set('children', [...this.children, node])
    node.set('parent', this)
  }

  remove(node: SvelteTreeNode<T>) {
    const index = this.children.findIndex((child) => child.id === node.id)
    if (index !== -1) {
      // Remove the child at the found index
      this.set('children', remove(this.children, index))
    } else {
      // Recursively remove the node if not found in the immediate children
      this.getProp('children').forEach((child) => child.remove(node))
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
