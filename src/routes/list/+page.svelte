<script lang="ts">
  import { SvelteList, SvelteListItem } from '$lib/list.js'
  import { ItemImpl } from './components/item.js'
  import SvelteListUI from '$lib/SvelteListUI.svelte'
  import BasicListItemUi from './components/BasicListItemUI.svelte'
  import { setContext } from 'svelte'

  let items: SvelteListItem<any>[] = [...new Array(20)].map((_, i) => {
    const id = i + ''
    return new SvelteListItem(id, new ItemImpl(id, `Item ${id}`), { component: BasicListItemUi })
  })

  let list = new SvelteList(items)

  const renderSelection = (selection: Record<string, SvelteListItem<any>>) => {
    return Object.values(selection)
      .map((item) => {
        return item.id
      })
      .join(', ')
  }
</script>

<div class="p-10">
  <div class="text-xl">Selected: {renderSelection($list.selection)}</div>
  <SvelteListUI {list} />
</div>

<style>
</style>
