<script lang="ts">
  import { ListSelection, type Handler, type SvelteList, runHandlers } from '$lib/list.js'
  import SvelteListItemUI from '$lib/SvelteListItemUI.svelte'
  import { onMount, setContext } from 'svelte'

  export let list: SvelteList<any, any>
  export let classes: string[] = []
  export let style: string = ''

  setContext('list', list)

  let e: HTMLElement
  onMount(() => {
    list.setElement(e)
  })

  const fromSelection = (selection: ListSelection) => {
    const indices = Array.from({ length: list.items.length }, (_, index) => index)
    return selection.ranges
      .map((r) => indices.slice(r.from, r.to))
      .reduce((arr, next) => [...arr, ...next], [])
  }

  let selected: Set<number> = new Set()
  list.afterSet('selection', (selection, prev) => {
    if (selection) {
      if (!prev || (prev && !selection.eq(prev))) {
        selected = new Set($list.selection ? fromSelection($list.selection) : [])
      }
    } else {
      selected = new Set()
    }
  })

  const defaultSelectionHandler: Handler<MouseEvent> = function (e, props) {
    const index = props.index
    let newSelection: ListSelection | null = null
    if (e.metaKey && this.selection) {
      if (!this.selection.contains(index)) {
        newSelection = this.selection.addRange(ListSelection.range(index, index + 1))
      } else {
        newSelection = this.selection.splitRange(index)
      }
    } else if (e.shiftKey) {
      if (this.selection) {
        newSelection = this.selection.replaceRange(
          this.selection.main.extend(index),
          this.selection.mainIndex!
        )
      } else {
        newSelection = ListSelection.create([ListSelection.range(0, index)])
      }
    } else {
      newSelection = ListSelection.single(index)
    }

    if (newSelection) {
      this.select(newSelection)
    }
  }

  const handleClick: Handler<MouseEvent> = function handleClick(event, props) {
    const selector = list.options.onSelect ? list.options.onSelect : defaultSelectionHandler
    selector.call(list, event, props)
  }

  const handleKeydown: Handler<KeyboardEvent> = (e, props) => {
    if (runHandlers(list.keymap, e, list, props)) {
      e.preventDefault()
    }
  }

  const handleFocus: Handler<FocusEvent> = function (event, props) {
    list.set('focused', props.item)
  }

  const handleBlur: Handler<FocusEvent> = function () {
    list.set('focused', null)
  }
</script>

<div bind:this={e} class={classes.join(' ')} {style}>
  {#each $list.items as item, i (item.id)}
    <SvelteListItemUI
      on:click={(e) => handleClick.call(list, e, { item, index: i })}
      on:keydown={(e) => handleKeydown.call(list, e, { item, index: i })}
      on:focus={(e) => handleFocus.call(list, e, { item, index: i })}
      on:blur={(e) => handleBlur.call(list, e, { item, index: i })}
      {item}
      index={i}
      selected={selected.has(i)}
      nextSelected={selected.has(i + 1)}
      prevSelected={selected.has(i - 1)}
      focused={$list.focused == item}
      focusedGroup={list.focused ? selected.has(i) : false}
      first={i == 0}
      last={i == $list.items.length - 1}
    />
  {/each}
</div>

<style>
  div {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    height: 100%;
  }
</style>
