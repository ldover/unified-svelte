<script lang="ts">
  import type { SvelteListItem } from '$lib/list.js'

  export let item: SvelteListItem<any>
</script>

<svelte:component this={$item.component} {item} />
