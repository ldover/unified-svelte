<script lang="ts">
  import { ListSelection, SvelteList, SvelteListItem } from '$lib/list.js'
  import { ItemImpl } from './components/item.js'
  import SvelteListUI from '$lib/SvelteListUI.svelte'
  import BasicListItemUi from './components/BasicListItemUI.svelte'

  let items: SvelteListItem<any>[] = [...new Array(200)].map((_, i) => {
    const id = i + ''
    return new SvelteListItem(id, new ItemImpl(id, `Item ${id}`), { component: BasicListItemUi })
  })

  let list = new SvelteList(items)
  let i: number

  const renderSelection = (selection: ListSelection) => {
    return Object.values(selection.ranges)
      .map((item) => {
        return `(${[item.anchor, item.head]})`
      })
      .join(', ')
  }
</script>

<div class="page">
  <div class="">Selected: {renderSelection($list.selection)}</div>
  <div class="">Main: {$list.selection.mainIndex}</div>
  <button
    disabled={!i}
    on:click={() =>
      list.setSelection(ListSelection.create([ListSelection.single(i)]), {
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
