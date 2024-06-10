<script lang="ts">
  import TreeNode from './TreeNode.svelte'
  import { SvelteTree } from './tree.js'
  import { setContext } from 'svelte'
  import { type Stored, stored } from '$lib/store.js'
  import type { ViewImpl } from '../routes/components/view.js'

  export let tree: Stored<SvelteTree<ViewImpl>>

  setContext('tree', tree)
</script>

<TreeNode node={stored(tree.root)} />
