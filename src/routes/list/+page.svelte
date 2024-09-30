<script lang="ts">
  import { ListSelection, SvelteList } from '$lib/list.js'
  import SvelteListUI from '$lib/SvelteListUI.svelte'
  import BasicListItemUi from './components/BasicListItemUI.svelte'
  import { ItemImpl } from './components/item.js'

  let builder = (d: { id: string }) => ({
    content: new ItemImpl(d.id, `Item ${d.id}`),
    options: { component: BasicListItemUi }
  })

  let data = [...new Array(20)].map((_, i) => ({
    id: i + ''
  }))

  let list = new SvelteList(data, builder, {
    id: 'simple-list',
    selection: 'single',
    keymap: [
      {
        key: 'Cmd-Alt-a',
        run: (list) => {
          list.selection?.pick(list.items).forEach((item) => console.log('archive', item))
        }
      }
    ]
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
</script>

<div class="page">
  <div class="">Selected: {renderSelection($list.selection)}</div>
  <div class="">Main: {$list.selection?.mainIndex}</div>
  <div class="">
    <button disabled={!i} on:click={() => list.insert({ id: 'X' + Math.random() * 1000 }, i)}
      >Insert</button
    >
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
