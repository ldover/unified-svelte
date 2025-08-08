<script lang="ts">
  import type { SvelteTreeNode } from '$lib/tree.js'
  import type { ViewImpl } from './view.js'

  export let node: SvelteTreeNode<ViewImpl>
  export let level: number
</script>

<div class="w-full rounded-md border border-orange-400" class:show-border={$node.borderVisible}>
  <slot />
</div>

<style>
  .show-border {
    border: 1px solid teal;
  }
</style>
