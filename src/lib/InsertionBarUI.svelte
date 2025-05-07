<script lang="ts">
  import { onMount } from 'svelte'
  import type { InsertionBar } from './list.js'

  let e: HTMLElement
  export let bar: InsertionBar

  onMount(() => {
    e.style.visibility = 'hidden'

    bar.afterSet('visible', (value) => {
      e.style.visibility = value ? 'visible' : 'hidden'
    })

    bar.afterSet('translateY', (value) => {
      e.style.transform = `translateY(${value}px)`
    })
  })
</script>

<div bind:this={e} class="bar"></div>

<style>
  .bar {
    position: absolute;
    left: 0;
    right: 0;
    height: 0;
    border-top: 2px solid var(--accent, dodgerblue);
    pointer-events: none;
    z-index: 10;
    transition: transform 40ms linear;
  }
</style>
