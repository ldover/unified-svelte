<script lang="ts">
  let e: HTMLElement
  export let slot: number
  export let visible: boolean
</script>

<div class:visible bind:this={e} class="insertion-slot"></div>

<style>
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
    background: red;
    pointer-events: none;
    z-index: 10;
  }
</style>
