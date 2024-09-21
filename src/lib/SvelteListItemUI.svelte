<script lang="ts">
  import type { SvelteListItem } from '$lib/list.js'
  import { onDestroy, onMount } from 'svelte'

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
    item.mount && item.mount()
  })

  onDestroy(() => {
    item.destroy && item.destroy()
  })
</script>

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
