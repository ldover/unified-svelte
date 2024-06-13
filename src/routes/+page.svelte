<script lang="ts">
  import { SvelteTree, SvelteTreeNode } from '$lib/tree.js'
  import ViewUI from './components/ViewUI.svelte'
  import { type View, ViewImpl } from './components/view.js'
  import ViewUIContainer from './components/ViewUIContainer.svelte'
  import Tree from '$lib/SvelteTreeUI.svelte'
  import { stored } from '$lib/store.js'

  function handleSelect(node: SvelteTreeNode<ViewImpl>) {
    tree.setSelection(node)
  }

  let root = new SvelteTreeNode(
    '1',
    new ViewImpl('Workshop'),
    [
      new SvelteTreeNode('1.1', new ViewImpl('Tiger'), [], 1, ViewUI, ViewUIContainer),
      new SvelteTreeNode('1.2', new ViewImpl('Datastore'), [], 1, ViewUI, ViewUIContainer),
      new SvelteTreeNode(
        '1.3',
        new ViewImpl('All tabs'),
        [
          new SvelteTreeNode(
            '1.3.1',
            new ViewImpl('Current projects'),
            [],
            2,
            ViewUI,
            ViewUIContainer
          ),
          new SvelteTreeNode('1.3.2', new ViewImpl('On Deck'), [], 2, ViewUI, ViewUIContainer)
        ],
        1,
        ViewUI,
        ViewUIContainer
      )
    ],
    0,
    ViewUI,
    ViewUIContainer
  )

  let tree = stored(
    new SvelteTree(root, {
      callbacks: {
        onSelect: handleSelect
      }
    })
  )
  tree.setSelection(root)
</script>

<div class="p-10">
  <div class="text-xl">Selected: {$tree.selected?.id || '/'}</div>

  <Tree {tree} />
</div>

<style>
</style>
