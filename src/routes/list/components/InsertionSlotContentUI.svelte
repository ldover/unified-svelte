<script lang="ts">
  import type { InsertionSlot } from '$lib/list.js'

  let e: HTMLElement
  export let slot: number
  export let visible:  boolean

</script>

<div class:visible={visible} bind:this={e} class="bar-content"></div>

<style>
  .bar-content {
    border-top: 2px solid transparent;

  }

  .bar-content.visible {
    border-top: 2px solid red;
  }
</style>
