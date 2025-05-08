<!-- routes/list/+page.svelte -->
<script lang="ts">
  import { ListSelection, SvelteList } from '$lib/list.js'
  import SvelteListUI from '$lib/SvelteListUI.svelte'
  import BasicListItemUi from './components/BasicListItemUI.svelte'
  import CustomInsertionBarUi from './components/InsertionBarContentUI.svelte'
  import { ItemImpl } from './components/item.js'

  let builder = (d: { id: string }) => ({
    content: new ItemImpl(d.id, `Item ${d.id}`),
    options: { component: BasicListItemUi, hover: { threshold: 0.2} }
  })

  function data(num: number) {
    return [...new Array(num)].map((_, i) => ({
      id: i + ''
    }))
  }

  let list = new SvelteList(data(20), builder, {
    id: 'simple-list',
    selection: 'multi',
    insertionBar: CustomInsertionBarUi,
    focusOn: 'mousedown',
    cache: false,
    handlers: {
      keydown: function (e) {
        if (e.metaKey && e.key == 'a' && e.shiftKey) {
          this.selection?.pick(this.items).forEach((item) => console.log('archive', item))
          return true
        }
      }
    }
  })

  let i: number
  let i1: number

  const renderSelection = (selection: ListSelection | null) => {
    if (!selection) return 'null'
    return Object.values(selection.ranges)
      .map((item) => {
        return `(${[item.from, item.to]}${item.inverted ? '*' : ''})`
      })
      .join(', ')
  }

  function handleRemove() {
    if (i && i1) {
      list.removeFrom(i, i1)
    } else {
      list.remove(list.items[i].content.id)
    }
  }

  function handleMove() {
    const selection = list.getProp('selection')
    if (i && i1) {
      list.move(i, i1)
    } else if (selection && i1 != undefined) {
      list.move(selection, i1)
    }
  }
</script>

<div class="page">
  <div class="">Selected: {renderSelection($list.selection)}</div>
  <div class="">Main: {$list.selection?.mainIndex}</div>
  <div class="">
    <button on:click={() => list.setData(data(Math.round(Math.random() * 100)))}>Refresh</button>
    <button disabled={!i} on:click={() => list.insert({ id: 'X' + Math.random() * 1000 }, i)}
      >Insert</button
      >
    <button disabled={i1 == undefined} on:click={() => handleMove()}>Move</button>
    <button disabled={!i} on:click={() => handleRemove()}>Remove</button>
    <button
      disabled={!i}
      on:click={() =>
        list.select(ListSelection.single(i), {
          scrollIntoView: true,
          focus: true
        })}>Select</button
    >
  </div>
  <label>
    i0
    <input type="number" bind:value={i} />
  </label>
  <label>
    i1
    <input type="number" bind:value={i1} />
  </label>
  <div class="list-container">
    <SvelteListUI {list} />
  </div>
</div>

<style>
  .list-container {
    height: 80%;
  }
  .page {
    height: 100vh;
    padding: 16px;
  }
</style>
