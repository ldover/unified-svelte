<!-- routes/list/components/BasicListItemUI.svelte -->
<script lang="ts">
  import { type SvelteListItem } from '$lib/list.js'
  import type { Item } from './item.js'

  export let item: SvelteListItem<Item>

  export let index: number
  export let selected: boolean
  export let nextSelected: boolean
  export let prevSelected: boolean
  export let focused: boolean
  export let focusedGroup: boolean
  export let first: boolean
  export let last: boolean
</script>

<div
  class:selected
  class:prevSelected
  class:nextSelected
  class:last
  class:first
  class:focused={focused || focusedGroup}
>
  {$item.content.name}
</div>

<style>
  div {
    padding: 8px;
    background-color: white;
    border-top: 1px solid transparent;
  }

  div:not(.first):not(.selected):not(.prevSelected) {
    border-top: 1px solid rgb(205, 205, 205);
  }

  .selected {
    background: rgba(0, 0, 0, 0.2);
    color: white;
    border-radius: 4px;
  }

  .selected.focused {
    border-left: 6px solid green;
  }

  div.prevSelected {
    border-top-left-radius: 0px;
    border-top-right-radius: 0px;
  }
  div.nextSelected {
    border-bottom-left-radius: 0px;
    border-bottom-right-radius: 0px;
  }
</style>
