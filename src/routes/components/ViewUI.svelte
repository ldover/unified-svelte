<script lang="ts">
  import { getContext } from 'svelte'
  import { ViewImpl } from './view.js'

  import type { SvelteTree, SvelteTreeNode } from '$lib/tree.js'

  export let node: SvelteTreeNode<ViewImpl>

  let tree: SvelteTree<ViewImpl> = getContext('tree')

  function handleKeyDown(e: KeyboardEvent) {
    const metaKeys = e.shiftKey || e.ctrlKey || e.altKey || e.metaKey

    // Ignore the navigation events if any meta keys are pressed
    // because we have up/down+option bound to Mousetrap
    if (e.key == 'ArrowUp' && !metaKeys) {
      tree.up()
    } else if (e.key == 'ArrowDown' && !metaKeys) {
      tree.down()
    } else if (e.key == 'Enter') {
      if (e.metaKey) {
        // Show dashboard page on CMD+Enter
        // tree.select({ selectContent: true })
      } else if (node.collapsed) {
        // Otherwise toggle collapse/expand
        node.expand()
      } else {
        node.collapse()
      }
    }
  }
</script>

<div class="view-ui">
  <button on:click={() => tree.setNavigationRoot(node)}>Set root</button>
  <button
    on:keydown={handleKeyDown}
    id={node.id}
    class="flex"
    on:click={() => node.selectable && tree.select(node)}
  >
    <!-- Indent note view based on the level of nesting -->
    <div style="min-width: {node.level > 0 ? (node.level + 1) * 16 - 16 : 0}px;"></div>

    <div class="control flex-shrink-0">
      {#if node.children.length}
        {#if $node.collapsed}
          <button on:click|stopPropagation={() => node.expand()}>{'>'}</button>
        {:else}
          <button on:click|stopPropagation={() => node.collapse()}>{'^'}</button>
        {/if}
      {/if}
    </div>

    {$node.content.id}
  </button>
</div>

<style>
  button:focus {
    outline: 2px solid yellow;
  }

  .view-ui {
    display: flex;
  }
</style>
