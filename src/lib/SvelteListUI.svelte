<!-- lib/SvelteListUI.svelte -->
<script lang="ts">
  import { ListSelection, type Handler, type SvelteList, InsertionBar } from '$lib/list.js'
  import SvelteListItemUI from '$lib/SvelteListItemUI.svelte'
  import { onMount, setContext } from 'svelte'
  import { calculateHover, findClosest, findInsertion, findMove, type HoverData } from './drag.js'
  import InsertionBarUi from './InsertionBarUI.svelte'

  export let list: SvelteList<any, any>
  export let classes: string[] = []
  export let style: string = ''

  setContext('list', list)

  let e: HTMLElement
  onMount(() => {
    list.setElement(e)
    computeSelected(list.selection, null)
    bar.hide()
  })

  const computeSelected = (selection: ListSelection | null, prev: ListSelection | null) => {
    if (selection) {
      if (!prev || (prev && !selection.eq(prev))) {
        selected = new Set($list.selection ? fromSelection($list.selection) : [])
      }
    } else {
      selected = new Set()
    }
  }

  const fromSelection = (selection: ListSelection) => {
    const indices = Array.from({ length: list.items.length }, (_, index) => index)
    return selection.ranges
      .map((r) => indices.slice(r.from, r.to))
      .reduce((arr, next) => [...arr, ...next], [])
  }

  let selected: Set<number> = new Set()
  list.afterSet('selection', computeSelected)

  type Modifier = 'shiftKey' | 'ctrlKey' | 'altKey' | 'metaKey'
  const modifiers: Modifier[] = ['shiftKey', 'ctrlKey', 'altKey', 'metaKey']

  const onlyModifier = (e: KeyboardEvent | MouseEvent, modifier: Modifier) =>
    modifiers.every((m) => (m == modifier ? e[m] : !e[m]))

  const anyModifiers = (e: KeyboardEvent | MouseEvent) => modifiers.some((m) => e[m])

  const defaultSelectionHandlerMulti: Handler<MouseEvent> = function (e, props) {
    const index = props.index
    let newSelection: ListSelection | null | undefined = undefined
    if (onlyModifier(e, 'metaKey') && this.selection) {
      if (!this.selection.contains(index)) {
        newSelection = this.selection.addRange(ListSelection.range(index, index + 1))
      } else {
        newSelection = this.selection.splitRange(index)
      }
    } else if (onlyModifier(e, 'shiftKey')) {
      if (this.selection) {
        newSelection = this.selection.replaceRange(
          this.selection.main.extend(index),
          this.selection.mainIndex!
        )
      } else {
        newSelection = ListSelection.create([ListSelection.range(0, index)])
      }
    } else if (!anyModifiers(e)) {
      newSelection = ListSelection.single(index)
    }

    if (newSelection !== undefined) {
      this.select(newSelection)
    }
  }

  const defaultSelectionHandlerSingle: Handler<MouseEvent> = function (e, props) {
    if (!anyModifiers(e)) {
      this.select(ListSelection.single(props.index))
    }
  }

  const handleClick: Handler<MouseEvent> = function handleClick(event, props) {
    if (list.options.handlers?.click?.call(list, event, props)) {
      return
    }

    const selector =
      this.options.selection == 'multi'
        ? defaultSelectionHandlerMulti
        : defaultSelectionHandlerSingle
    selector.call(list, event, props)
  }

  const defaultKeydownHandler: Handler<KeyboardEvent> = function (e, props) {
    e.preventDefault() // Prevents scroll of the list view on up/down navigation

    if (onlyModifier(e, 'metaKey') && e.key === 'Backspace') {
      // Delete item on CMD+backspace
      if (this.selection && this.selection.isMultiple()) {
        this.removeFrom(this.selection)
      } else {
        this.removeFrom(props.index)
      }
    } else if (e.key == 'ArrowUp') {
      if (!anyModifiers(e)) {
        this.up()
      } else if (onlyModifier(e, 'altKey')) {
        this.select(ListSelection.single(0), { scrollIntoView: true })
      }
    } else if (e.key == 'ArrowDown') {
      if (!anyModifiers(e)) {
        this.down()
      } else if (onlyModifier(e, 'altKey')) {
        this.select(ListSelection.single(this.items.length - 1), { scrollIntoView: true })
      }
    } else if (e.key == 'a' && onlyModifier(e, 'metaKey') && this.options.selection == 'multi') {
      this.select(ListSelection.create([ListSelection.range(0, this.items.length)]))
    }
  }

  const handleKeydown: Handler<KeyboardEvent> = (e, props) => {
    if (list.options.handlers?.keydown?.call(list, e, props)) {
      return
    }

    defaultKeydownHandler.call(list, e, props)
  }

  const handleFocus: Handler<FocusEvent> = function (event, props) {
    list.set('focused', props.item)
  }

  const handleBlur: Handler<FocusEvent> = function () {
    list.set('focused', null)
  }

  
  let bar: InsertionBar = new InsertionBar({ component: list.options.insertionBar })
  let data: HoverData | null = null
  let closest: { index: number, e: HTMLElement} | null = null
  /* TODO: requestAnimationFrame */
  function handleDragOver(ev: DragEvent) {
    ev.preventDefault();           // allow drop
  
    closest = findClosest('[data-idx]', ev)
    
    if (closest) {
      const item = list.items[closest.index]
      data = calculateHover(closest.e, ev, item.options.hover)
      bar.show(closest.e, ev, e , data)
    }
  }

  function handleDrop(ev: DragEvent) {
    ev.preventDefault();
  
    if (closest) {
      if (!data) {throw new Error('data should be set')}
      
      if (data.pos == 0) {
        return  // Don't drop into the list when drop occurs on the item
      }
      let selection = list.selection ?? ListSelection.single(closest.index)
      
      const insertionIndex = findInsertion(data)
      list.move(selection, insertionIndex);
      bar.hide()
    }
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div bind:this={e}  
     on:dragover={handleDragOver}
     on:dragleave={() => bar.hide()}
     on:drop={handleDrop}
      class={classes.join(' ')} {style}>
  <InsertionBarUi {bar} />
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
    position: relative;
    flex-direction: column;
    overflow-y: auto;
    height: 100%;
  }
</style>
