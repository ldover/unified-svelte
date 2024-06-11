<script lang="ts">
  import TreeNode from './SvelteTreeNodeUI.svelte'
  import { type SvelteTree } from './tree.js'
  import { setContext } from 'svelte'
  import { type Stored, stored } from '$lib/store.js'

  export let tree: Stored<SvelteTree<any>>

  setContext('tree', tree)
</script>

<TreeNode node={stored(tree.root)} />
