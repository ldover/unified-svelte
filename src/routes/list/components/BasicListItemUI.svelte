<!-- routes/list/components/BasicListItemUI.svelte -->
<script lang="ts">
  import { type SvelteListItem } from '$lib/list.js'
  import type { Item } from './item.js'

  export let item: SvelteListItem<Item>

  export let index: number
  export let dragover: boolean
  export let selected: boolean
  export let nextSelected: boolean
  export let prevSelected: boolean
  export let focused: boolean
  export let focusedGroup: boolean
  export let first: boolean
  export let last: boolean
</script>

<div
  class='list-item'
  class:dragover
  class:selected
  class:prevSelected
  class:nextSelected
  class:last
  class:first
  class:focused={focused || focusedGroup}
>
  {$item.content.name}

  <div class="drag-handle-container">
    <slot name="drag-handle" />
  </div>
</div>

<style>
  .drag-handle-container {
    background: transparent;
    position: absolute;
    left: 0;
    top: 0;
    padding: 0;
    margin-top: 4px;
    margin-left: 4px;
  }
  .list-item.dragover { 
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1), inset 0 -2px 4px rgba(0, 0, 0, 0.06);
  } 

  .list-item {
    position: relative;
    padding: 8px;
    background-color: white;
    border-top: 1px solid transparent;
    border-left: 6px solid transparent;
  }

  .list-item:not(.first):not(.selected):not(.prevSelected) {
    border-top: 1px solid rgb(205, 205, 205);
  }

  .list-item.selected {
    background: rgba(0, 0, 0, 0.2);
    color: white;
    border-radius: 4px;
    border-left: 6px solid transparent;
  }

  .list-item.selected.focused {
    border-left: 6px solid green;
  }

  .list-item.prevSelected {
    border-top-left-radius: 0px;
    border-top-right-radius: 0px;
  }
  .list-item.nextSelected {
    border-bottom-left-radius: 0px;
    border-bottom-right-radius: 0px;
  }
</style>
