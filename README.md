# unified-svelte

*Headless components & interaction utilities for Svelte projects*

> **Status: Early‑stage / unstable.** The public API may change without notice while the project matures. Use in production at your own risk.

---

## Why it exists

Front‑end apps often need more than a scrollable list: multi‑selection, keyboard navigation, drag‑and‑drop, virtual scrolling, and custom renderers. Implementing these concerns repeatedly is tedious and error‑prone. **unified‑svelte** extracts those mechanics into a small, headless library so you can focus on how each item looks, not on how the list behaves.

## Components

- **List** — headless list controller with multiple‑selection, range selection, and keyboard shortcuts that feel like a desktop app.
- **Tree** — hierarchical controller with collapse/expand, selection, and arrow‑key navigation.
- **Drag‑and‑drop module** — native HTML5 DnD hooks usable on their own; includes file‑drop helpers for turning dropped files into domain objects.

## Installation

```bash
npm install unified-svelte
```

## Examples

### List

```svelte
<script lang="ts">
  import { SvelteList, SvelteListUI, BasicListItem } from 'unified-svelte';
  import ListItem from './ListItem.svelte';

  const data = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }));

  const list = new SvelteList(
    data,
    d => ({
      content: { id: d.id },
      options: { component: ListItem, draggable: true }
    }),
    {
      id: 'demo-list',
      selection: 'multi',
      focusOn: 'click'
    }
  );
</script>

<SvelteListUI {list} />
```

### Tree

```svelte
<script lang="ts">
  import { SvelteTree, SvelteTreeNode, SvelteTreeUI } from 'unified-svelte';

  const root = new SvelteTreeNode('1', { id: 'Root' }, [
    new SvelteTreeNode('1.1', { id: 'Child A' }),
    new SvelteTreeNode('1.2', { id: 'Child B' })
  ]);

  const tree = new SvelteTree(root);
  tree.select(root);
</script>

<SvelteTreeUI {tree} />
```

For more complete demos, browse the SvelteKit example pages under `src/routes`.

