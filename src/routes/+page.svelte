<script lang="ts">
  import Tree from '$lib/SvelteTreeUI.svelte'
  import { SvelteTree, SvelteTreeNode } from '$lib/tree.js'
  import ViewUI from './components/ViewUI.svelte'
  import ViewUIContainer from './components/ViewUIContainer.svelte'
  import { ViewImpl } from './components/view.js'

  let view = new ViewImpl('Datastore')
  let root = new SvelteTreeNode(
    '1',
    new ViewImpl('Workshop'),
    [
      new SvelteTreeNode('1.1', new ViewImpl('Tiger'), [], {
        contentComponent: ViewUI,
        containerComponent: ViewUIContainer
      }),
      new SvelteTreeNode('1.2', view, [], {
        contentComponent: ViewUI,
        containerComponent: ViewUIContainer
      }),
      new SvelteTreeNode('1.20', view, [], {
        contentComponent: ViewUI,
        containerComponent: ViewUIContainer
      }),
      new SvelteTreeNode(
        '1.3',
        new ViewImpl('All tabs'),
        [
          new SvelteTreeNode('1.3.1', new ViewImpl('Current projects'), [], {
            contentComponent: ViewUI,
            containerComponent: ViewUIContainer
          }),
          new SvelteTreeNode('1.3.2', new ViewImpl('On Deck'), [], {
            contentComponent: ViewUI,
            containerComponent: ViewUIContainer
          }),
          new SvelteTreeNode('1.3.3', view, [], {
            contentComponent: ViewUI,
            containerComponent: ViewUIContainer
          })
        ],
        {
          contentComponent: ViewUI,
          containerComponent: ViewUIContainer,
          selectable: false,
          collapsed: false,
          borderVisible: true
        }
      )
    ],
    {
      contentComponent: ViewUI,
      containerComponent: ViewUIContainer,
      collapsed: false
    }
  )

  let tree = new SvelteTree(root)
  tree.select(root)

  tree.beforeSet('selected', (value, prevValue) => console.log('beforeSet', { value, prevValue }))
  tree.beforeUpdate((value, prevValue) => console.log('beforeUpdate', { value, prevValue }))
  tree.afterUpdate((value, prevValue) => console.log('afterUpdate', { value, prevValue }))
  tree.afterSet('selected', (value, prevValue) => console.log('afterSet', { value, prevValue }))
</script>

<div class="p-10">
  <div class="text-xl">Selected: {$tree.selected?.id || '/'}</div>

  <Tree {tree} />
</div>

<style>
</style>
