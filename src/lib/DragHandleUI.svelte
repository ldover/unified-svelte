<script lang="ts">
  import { draggable } from './dnd.js'
  import { type SvelteListItem } from './list.js'

  export let item: SvelteListItem<any>
</script>

<button
  on:mousedown|stopPropagation
  use:draggable={{item}}
>
  <slot/>
</button>

<style>
  button {
    padding: 0;
    background: none;
    outline: none;
    border: none;
    cursor: default;
  }
</style>
