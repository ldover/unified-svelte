<script lang="ts">
  import { SvelteTree, SvelteTreeNode } from '$lib/tree.js'
  import ViewUI from './components/ViewUI.svelte'
  import { type View, ViewImpl } from './components/view.js'
  import ViewUIContainer from './components/ViewUIContainer.svelte'
  import Tree from '$lib/Tree.svelte'
  import { stored } from '$lib/store.js'

  function handleSelect(node: SvelteTreeNode<ViewImpl>) {
    tree.setSelection(node)
  }

  let root = new SvelteTreeNode(
    '1',
    new ViewImpl('Workshop'),
    [
      new SvelteTreeNode(
        '1.1',
        new ViewImpl('Tiger'),
        [],
        1,
        handleSelect,
        ViewUI,
        ViewUIContainer
      ),
      new SvelteTreeNode(
        '1.2',
        new ViewImpl('Datastore'),
        [],
        1,
        handleSelect,
        ViewUI,
        ViewUIContainer
      ),
      new SvelteTreeNode(
        '1.3',
        new ViewImpl('All tabs'),
        [
          new SvelteTreeNode(
            '1.3.1',
            new ViewImpl('Current projects'),
            [],
            2,
            handleSelect,
            ViewUI,
            ViewUIContainer
          ),
          new SvelteTreeNode(
            '1.3.2',
            new ViewImpl('On Deck'),
            [],
            2,
            handleSelect,
            ViewUI,
            ViewUIContainer
          )
        ],
        1,
        handleSelect,
        ViewUI,
        ViewUIContainer
      )
    ],
    0,
    handleSelect,
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
  <div class="text-xl">Playground</div>

  <Tree {tree} />
</div>

<style>
</style>
