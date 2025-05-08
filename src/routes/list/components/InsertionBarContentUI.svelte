<script lang="ts">
  import type { InsertionBar } from '$lib/list.js'

  let e: HTMLElement
  export let bar: InsertionBar

</script>

<div bind:this={e} class="bar-content"></div>

<style>
  .bar-content {
    border-top: 4px solid red;
  }
</style>
