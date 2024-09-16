<script lang="ts">
  import type { Item } from './item.js'
  import { ListSelection, type SvelteList, type SvelteListItem } from '$lib/list.js'
  import { getContext } from 'svelte'

  export let item: SvelteListItem<Item>

  const list: SvelteList<any> = getContext('list')

  $: selected = list.selection.contains(list.getIndex(item))
  $: focused = list.focused
    ? Object.values(list.selection).length > 1
      ? selected
      : list.focused == item
    : false

  function handleSelect(e: MouseEvent) {
    let newSelection: ListSelection | null = null
    let itemIndex = list.getIndex(item)
    if (e.metaKey) {
      if (!list.selection.contains(itemIndex)) {
        newSelection = list.selection.addRange(ListSelection.single(itemIndex))
      } else {
        newSelection = list.selection.splitRange(itemIndex)
      }
    } else if (e.shiftKey) {
      if (list.selection.main) {
        newSelection = list.selection.replaceRange(
          list.selection.main.extend(itemIndex),
          list.selection.mainIndex!
        )
      } else {
        newSelection = ListSelection.create([ListSelection.range(0, itemIndex)])
      }
    } else {
      newSelection = ListSelection.create([ListSelection.single(itemIndex)])
    }

    if (newSelection) {
      list.setSelection(newSelection)
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    e.preventDefault() // Prevents scroll of the list view on up/down navigation

    const metaKeys = e.shiftKey || e.ctrlKey || e.altKey || e.metaKey

    if (e.key === 'Backspace' && e.metaKey) {
      // Delete item on CMD+backspace
      if (list.selection.isMultiple()) {
        list.removeFrom(list.selection)
      } else {
        list.remove(item)
      }
    } else if (e.key == 'ArrowUp' && !metaKeys) {
      list.up()
    } else if (e.key == 'ArrowDown' && !metaKeys) {
      list.down()
    } else if (e.key == 'a' && e.metaKey) {
      list.setSelection(ListSelection.create([ListSelection.range(0, list.items.length - 0)]))
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
