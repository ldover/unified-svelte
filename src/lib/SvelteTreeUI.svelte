<script lang="ts">
  import TreeNode from './SvelteTreeNodeUI.svelte'
  import { type SvelteTree } from './tree.js'
  import { setContext } from 'svelte'

  export let tree: SvelteTree<any>

  setContext('tree', tree)
</script>

<TreeNode node={tree.root} level={0}/>
