<script lang="ts">
  import type { SvelteTreeNode } from './tree.js'

  export let node: SvelteTreeNode<any>
</script>

<svelte:component this={$node.containerComponent} {node}>
  <svelte:component this={$node.contentComponent} {node} />
  {#if $node.children.length && !$node.collapsed}
    <div class="w-full">
      {#each $node.children as child (child.id)}
        <svelte:self node={child} />
      {/each}
    </div>
  {/if}
  <slot></slot>
</svelte:component>

<style>
</style>
