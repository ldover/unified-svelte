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
    <div class:visible class="insertion-slot"></div>
  {/if}
</div>

<style>
  /* TODO: try using :after pseudoselector here */
  .insertion-slot {
    position: relative; /* establish a containing block */
    height: 0;
  }

  .insertion-slot.visible::after {
    content: '';
    position: absolute; /* absolutely-positioned so it doesn’t contribute to flow */
    top: 0;
    left: 0;
    right: 0;
    height: 2px; /* thickness of your insertion indicator */
    background: #007bff;
    pointer-events: none;
    z-index: 10;
  }
</style>
