<script lang="ts">
  import type { Item } from './item.js'
  import type { SvelteList, SvelteListItem } from '$lib/list.js'
  import { getContext } from 'svelte'

  export let item: SvelteListItem<Item>

  const list: SvelteList<any> = getContext('list')

  $: selected = list.selection[item.id] !== undefined
  $: focused = list.focused
    ? Object.values(list.selection).length > 1
      ? selected
      : list.focused == item
    : false

  function handleSelect(e: MouseEvent) {
    if (e.metaKey) {
      if (!list.selection[item.id]) {
        list.addSelection(item)
      } else {
        list.removeSelection(item)
      }
    } else if (e.shiftKey) {
      list.extendSelection(item)
    } else {
      list.select(item)
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    e.preventDefault() // Prevents scroll of the list view on up/down navigation

    const metaKeys = e.shiftKey || e.ctrlKey || e.altKey || e.metaKey

    if (e.key === 'Backspace' && e.metaKey) {
      // Delete item on CMD+backspace
      list.remove(item)
    } else if (e.key == 'ArrowUp' && !metaKeys) {
      list.up()
    } else if (e.key == 'ArrowDown' && !metaKeys) {
      list.down()
    }
  }
</script>

<button
  id={item.id}
  on:keydown={handleKeydown}
  on:click={handleSelect}
  class:selected
  class:focused
>
  {$item.content.name}
</button>

<style>
  button {
    border: none;
    margin: 2px;
  }
  .selected {
    background: rgba(0, 0, 0, 0.5);
    color: white;
  }

  .selected.focused {
    border-left: 6px solid green;
  }
</style>
