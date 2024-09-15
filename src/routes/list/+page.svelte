<script lang="ts">
  import { SvelteList, SvelteListItem } from '$lib/list.js'
  import { ItemImpl } from './components/item.js'
  import SvelteListUI from '$lib/SvelteListUI.svelte'
  import BasicListItemUi from './components/BasicListItemUI.svelte'
  import { setContext } from 'svelte'

  let items: SvelteListItem<any>[] = [...new Array(200)].map((_, i) => {
    const id = i + ''
    return new SvelteListItem(id, new ItemImpl(id, `Item ${id}`), { component: BasicListItemUi })
  })

  let list = new SvelteList(items)
  let i: number

  const renderSelection = (selection: Record<string, SvelteListItem<any>>) => {
    return Object.values(selection)
      .map((item) => {
        return item.id
      })
      .join(', ')
  }
</script>

<div class="page">
  <div class="">Selected: {renderSelection($list.selection)}</div>
  <button
    disabled={!i}
    on:click={() => list.select(list.items[i], { scrollIntoView: true, focus: true })}
    >Select</button
  >
  <input type="number" bind:value={i} />
  <SvelteListUI {list} />
</div>

<style>
  .page {
    height: 100vh;
    padding: 16px;
  }
</style>
