<script lang="ts">
  import { getContext } from 'svelte'
  import { ListSelection, type SvelteList, type SvelteListItem } from './list.js'

  //   import { draggable } from '../drag-and-drop/actions'
  //   import type { Draggable } from '../drag-and-drop'

  // TODO: DragHandle that implements Draggable; or just Draggable?
  export let item: SvelteListItem<any>

  export let index: number
  export let selected: boolean
  export let nextSelected: boolean
  export let prevSelected: boolean
  export let focused: boolean
  export let focusedGroup: boolean
  export let first: boolean
  export let last: boolean

  let color: string = '#6b7280'

  let list: SvelteList<any, any> = getContext('list')

  function onDragStart(e: DragEvent) {
    const sel = list.selection?.contains(index)
      ? list.selection // drag currently selected block
      : ListSelection.single(index)
    // serialise -> store on dataTransfer
    e.dataTransfer!.setData(
      'application/x-listselection',
      JSON.stringify(sel.indices()) // store raw indices
    )
    e.dataTransfer!.effectAllowed = 'move'

    // TODO: expose API for the drag image
    //  Tiger will provide own drag image. although it also needs
    //  we might also integrate with `Draggable` interface; or rather make Draggable part of these
    //  unified UI libraries...
    // Let's leave this for later
    /* optional “ghost” */
    const img = document.createElement('div')
    img.textContent = `${sel.size()} item${sel.size() > 1 ? 's' : ''}`
    img.style.cssText = 'padding:4px 8px;background:#444;color:white;border-radius:4px;'
    document.body.appendChild(img)
    e.dataTransfer!.setDragImage(img, -10, -10)
    setTimeout(() => img.remove(), 0)
  }

  console.log('style')
</script>

<!-- TODO: use:draggable={{ sItem }} -->
<button
  on:mousedown|stopPropagation
  style="position: absolute;"
  draggable="true"
  on:dragstart={onDragStart}
>
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M6.29028 5.5L8.79028 3M8.79028 3L11.2903 5.5M8.79028 3V6.375V9.75M8.79028 16.5C8.79028 16.5 7.26659 14.9763 6.29028 14M8.79028 16.5C8.79028 16.5 10.314 14.9763 11.2903 14M8.79028 16.5V13.125V9.75M8.79028 9.75H15.7903M8.79028 9.75H2M15.7903 9.75L13.2903 7.5M15.7903 9.75L13.2903 12M2 9.75L4.29028 7.5M2 9.75L4.29028 12"
      stroke={color}
      stroke-opacity={1}
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</button>

<style>
  button {
    background-color: none;
    outline: none;
    border: none;

    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 5px;
    cursor: default;
  }

  button:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }
</style>
