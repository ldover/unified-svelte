<script lang="ts">
  import type { SvelteList } from '$lib/list.js'
  import SvelteListItemUI from '$lib/SvelteListItemUI.svelte'
  import { onMount, setContext } from 'svelte'

  export let list: SvelteList<any>

  setContext('list', list)

  let e: HTMLElement
  onMount(() => {
    list.setElement(e)
  })
</script>

<div bind:this={e}>
  {#each $list.items as item}
    <SvelteListItemUI {item} />
  {/each}
</div>

<style>
  div {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    height: 100%;
  }
</style>
