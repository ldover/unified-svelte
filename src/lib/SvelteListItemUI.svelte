<!-- lib/SvelteListItemUI.svelte -->
<script lang="ts">
  import { ListSelection, SvelteList, type SvelteListItem } from '$lib/list.js'
  import { getContext, onDestroy, onMount } from 'svelte'
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

  let list: SvelteList<any, any> = getContext('list')
  
  onMount(() => {
    item.mount()
  })

  onDestroy(() => {
    item.destroy()
  })

  function onDragStart(e: DragEvent) {
  const sel = list.selection?.contains(index)
    ? list.selection           // drag currently selected block
    : ListSelection.single(index)
  // serialise -> store on dataTransfer
  e.dataTransfer!.setData(
    'application/x-listselection',
    JSON.stringify(sel.indices())   // store raw indices
  )
  e.dataTransfer!.effectAllowed = 'move'

  /* optional “ghost” */
  const img = document.createElement('div')
  img.textContent = `${sel.size()} item${sel.size() > 1 ? 's' : ''}`
  img.style.cssText = 'padding:4px 8px;background:#444;color:white;border-radius:4px;'
  document.body.appendChild(img)
  e.dataTransfer!.setDragImage(img, -10, -10)
  setTimeout(()=>img.remove(),0)
}
</script>


<!-- TODO: add back use:focusOnClick  -->
<button id={item.id} 
        data-idx={index} 
        draggable="true"
        on:dragstart={onDragStart}
        on:click on:focus on:blur on:keydown>
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
