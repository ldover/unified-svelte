<script lang="ts">
  import type { SvelteListItem } from '$lib/list.js'

  export let item: SvelteListItem<any>

  export let selected: boolean
  export let nextSelected: boolean
  export let prevSelected: boolean
  export let focused: boolean
  export let focusedGroup: boolean
  export let first: boolean
  export let last: boolean
</script>

<svelte:component
  this={$item.component}
  {item}
  {selected}
  {nextSelected}
  {prevSelected}
  {focused}
  {focusedGroup}
  {first}
  {last}
/>
