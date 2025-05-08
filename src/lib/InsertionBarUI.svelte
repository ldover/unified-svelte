<script lang="ts">
  import { onMount } from 'svelte'
  import type { InsertionBar } from './list.js'

  let e: HTMLElement
  export let bar: InsertionBar

  // TODO: simplify this component
  onMount(() => {
    // Start hidden
    e.style.opacity = '0'
    e.style.visibility = 'hidden'

    let fadeInTimeout: ReturnType<typeof setTimeout> | null = null

    bar.afterSet('visible', (value) => {
      if (value) {
        e.style.visibility = 'visible'
        // Slight delay before fade-in
        fadeInTimeout = setTimeout(() => {
          e.style.opacity = '1'
        }, 50)
      } else {
        if (fadeInTimeout) clearTimeout(fadeInTimeout)
        e.style.opacity = '0'
        // Wait for fade-out transition to finish before hiding
        setTimeout(() => {
          e.style.visibility = 'hidden'
        }, 120)
      }
    })

    bar.afterSet('translateY', (value) => {
      e.style.transform = `translateY(${value}px)`
    })
  })
</script>

<div bind:this={e} class="bar">
  {#if bar.options.component}
    <svelte:component this={bar.options.component} {bar}/>
  {:else}
    <div class="bar-content"></div>
  {/if}
</div>

<style>
  .bar-content {
    border-top: 2px solid var(--accent, dodgerblue);
  }

  .bar {
    position: absolute;
    left: 0;
    right: 0;
    height: 0;
    pointer-events: none;
    z-index: 10;

    /* Smooth transform and fade */
    transition:
      transform 80ms ease,
      opacity 100ms ease;
    opacity: 0;
  }
</style>