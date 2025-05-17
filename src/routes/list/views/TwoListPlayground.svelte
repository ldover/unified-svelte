<script lang=ts>
    import type { ListOptions } from "$lib/list.js"
    import SingleListPlayground from "./SingleListPlayground.svelte"

    export let options: Partial<ListOptions<any>>


    export let data1
    export let data2
</script>

<div>
    <SingleListPlayground {options} data={data1} listId='list-1'/>
    <SingleListPlayground {options} data={data2} listId='list-2'/>
</div>

<style>
    div {
        height: 100%;
        display: flex;
    }
</style>