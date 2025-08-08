<script lang="ts">
  import type { SvelteTreeNode } from './tree.js'

  export let node: SvelteTreeNode<any>
  export let level: number
</script>

<svelte:component this={$node.containerComponent} {node} {level}>
  <svelte:component this={$node.contentComponent} {node} {level}/>
  {#if $node.children.length && !$node.collapsed}
    <div class="w-full">
      {#each $node.children as child (child.id)}
        <svelte:self node={child} level={level + 1}/>
      {/each}
    </div>
  {/if}
  <slot></slot>
</svelte:component>

<style>
</style>
