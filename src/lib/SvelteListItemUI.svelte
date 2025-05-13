<!-- lib/SvelteListItemUI.svelte -->
<script lang="ts">
  import { ListSelection, SvelteList, type SvelteListItem } from '$lib/list.js'
  import { getContext, onDestroy, onMount } from 'svelte'
  import { focusOnClick } from './actions/focusOnClick.js'
  import { draggable } from './dnd.js'
  import DragHandleUI from './DragHandleUI.svelte'

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

  // bundle all the props for easy spreading
  $: props = {
    index,
    item,
    selected,
    nextSelected,
    prevSelected,
    focused,
    focusedGroup,
    first,
    last
  }

  onMount(() => {
    item.mount()
  })

  onDestroy(() => {
    item.destroy()
  })
</script>

<button
  id={item.id}
  data-idx={index}
  use:focusOnClick={isFocusOnClick}
  use:draggable={{ item, disabled: !!list.options.dragHandle }}
  on:click
  on:focus
  on:blur
  on:keydown
>
  <svelte:component
    this={$item.component}
    {...props}
  >
    <svelte:fragment slot="drag-handle">
      {#if list.options.dragHandle}
        <DragHandleUI {item}>
          <svelte:component
          this={list.options.dragHandle}
          {...props}
        />
        </DragHandleUI>
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