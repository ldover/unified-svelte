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

  let isFocusOnClick = list.options.focusOn == 'click'
  
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
    setTimeout(()=>img.remove(),0)
}
</script>


<button id={item.id} 
        data-idx={index} 
        use:focusOnClick={isFocusOnClick}
        draggable="{!isFocusOnClick}"
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
  >
  <svelte:fragment slot="drag-handle">
    {#if list.options.dragHandle}
    <!-- TODO: test the drag handle -->
    <svelte:component {item} 
                      {index}
                      {selected}
                      {nextSelected}
                      {prevSelected}
                      {focused}
                      {focusedGroup}
                      {first}
                      {last}
    this={list.options.dragHandle}/>
  {/if}
  </svelte:fragment>
</svelte:component>
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
