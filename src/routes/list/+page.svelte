<script lang="ts">
  import { ListSelection, SvelteList, SvelteListItem } from '$lib/list.js'
  import { ItemImpl } from './components/item.js'
  import SvelteListUI from '$lib/SvelteListUI.svelte'
  import BasicListItemUi from './components/BasicListItemUI.svelte'

  let builder = (d: {id: string}) => new SvelteListItem(d.id, new ItemImpl(d.id, `Item ${d.id}`), { component: BasicListItemUi })

  let data = [...new Array(20)].map((_, i) => ({
    id: i + ''
  }))

  let list = new SvelteList(data, builder)
  let i: number

  const renderSelection = (selection: ListSelection | null) => {
    if (!selection) return 'null'
    return Object.values(selection.ranges)
      .map((item) => {
        return `(${[item.from, item.to]}${item.inverted ? '*' : ''})`
      })
      .join(', ')
  }
</script>

<div class="page">
  <div class="">Selected: {renderSelection($list.selection)}</div>
  <div class="">Main: {$list.selection?.mainIndex}</div>
  <div class="">
    <button on:click={() => list.insert({id: 'X' + Math.random() * 1000}, i)}>Insert</button>
    <button on:click={() => list.remove(list.data[i])}>Remove</button>
  </div>
  <button
    disabled={!i}
    on:click={() =>
      list.select(ListSelection.single(i), {
        scrollIntoView: true,
        focus: true
      })}>Select</button
  >
  <input type="number" bind:value={i} />
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
