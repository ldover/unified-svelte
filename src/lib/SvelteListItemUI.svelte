<!-- lib/SvelteListItemUI.svelte -->
<script lang="ts">
  import { type SvelteListItem } from '$lib/list.js'
  import { onDestroy, onMount } from 'svelte'
  import { focusOnClick } from './actions/focusOnClick.js'

  export let item: SvelteListItem<any>

  export let index: number
  export let selected: boolean
  export let nextSelected: boolean
  export let prevSelected: boolean
  export let focused: boolean
  export let focusedGroup: boolean
  export let first: boolean
  export let last: boolean

  onMount(() => {
    item.mount()
  })

  onDestroy(() => {
    item.destroy()
  })
</script>

<button id={item.id} use:focusOnClick on:click on:focus on:blur on:keydown>
  <svelte:component
    this={$item.component}
    {index}
    {item}
    {selected}
    {nextSelected}
    {prevSelected}
    {focused}
    {focusedGroup}
    {first}
    {last}
  />
</button>

<style>
  button {
    padding: 0;
    margin: 0;
    width: 100%;

    border: none;
    background: none;
    outline: none;
  }
</style>
