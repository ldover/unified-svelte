<!-- InsertionSlotUI.svelte -->
<script lang="ts">
  import { getContext } from 'svelte'
  import type { SvelteList } from './list.js'


  export let slot: number
  export let visible: boolean

  let list: SvelteList<any, any> = getContext('list')
</script>

<div data-slot={slot} class="slot">
  {#if list.options.insertionSlot}
    <svelte:component this={list.options.insertionSlot} {slot} {visible} />
  {:else}
    <div class:visible class="slot-content"></div>
  {/if}
</div>

<style>
  /* TODO: try using :after pseudoselector here */
  .slot-content {
    height: 2px;
    background: transparent;
  }
  
  .slot-content.visible {
    background-color: dodgerblue;
  }

  .slot {
    /* TODO: Smooth transform and fade */
    transition:
      transform 80ms ease,
      opacity 100ms ease;
  }
</style>
