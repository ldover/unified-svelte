<script lang="ts">
  import type { Item, ItemImpl } from './item.js'
  import { ListSelection, type SvelteList, type SvelteListItem } from '$lib/list.js'
  import { getContext } from 'svelte'

  export let item: SvelteListItem<Item>

  const list: SvelteList<{ id: string }, Item> = getContext('list')

  export let selected: boolean
  export let nextSelected: boolean
  export let prevSelected: boolean
  export let focused: boolean
  export let focusedGroup: boolean
  export let first: boolean
  export let last: boolean

  function handleSelect(e: MouseEvent) {
    let newSelection: ListSelection | null = null
    let itemIndex = list.getIndex(item)
    if (e.metaKey && list.selection) {
      if (!list.selection.contains(itemIndex)) {
        newSelection = list.selection.addRange(ListSelection.range(itemIndex, itemIndex + 1))
      } else {
        newSelection = list.selection.splitRange(itemIndex)
      }
    } else if (e.shiftKey) {
      if (list.selection) {
        newSelection = list.selection.replaceRange(
          list.selection.main.extend(itemIndex),
          list.selection.mainIndex!
        )
      } else {
        newSelection = ListSelection.create([ListSelection.range(0, itemIndex)])
      }
    } else {
      newSelection = ListSelection.single(itemIndex)
    }

    if (newSelection) {
      list.select(newSelection)
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    e.preventDefault() // Prevents scroll of the list view on up/down navigation

    const metaKeys = e.shiftKey || e.ctrlKey || e.altKey || e.metaKey

    if (e.key === 'Backspace' && e.metaKey) {
      // Delete item on CMD+backspace
      if (list.selection && list.selection.isMultiple()) {
        list.removeFrom(list.selection)
      } else {
        list.remove(item)
      }
    } else if (e.key == 'ArrowUp' && !metaKeys) {
      list.up()
    } else if (e.key == 'ArrowDown' && !metaKeys) {
      list.down()
    } else if (e.key == 'a' && e.metaKey) {
      list.select(ListSelection.create([ListSelection.range(0, list.items.length - 1)]))
    }
  }
</script>

<button
  id={item.id}
  on:keydown={handleKeydown}
  on:click={handleSelect}
  class:selected
  class:prevSelected
  class:nextSelected
  class:focused={focused || focusedGroup}
>
  {$item.content.name}
</button>

<style>
  button {
    border: none;
    padding: 2px;
    background-color: white;

    border-top: 1px solid transparent;
  }

  button:not(.selected) {
    border-top: 1px solid rgb(205, 205, 205);
  }

  button:not(.prevSelected) {
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

  button.prevSelected {
    border-top-left-radius: 0px;
    border-top-right-radius: 0px;
  }
  button.nextSelected {
    border-bottom-left-radius: 0px;
    border-bottom-right-radius: 0px;
  }
</style>
