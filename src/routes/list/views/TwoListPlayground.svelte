<script lang=ts>
    import SingleListPlayground from "./SingleListPlayground.svelte"

    export let options: { serialize: Function, deserialize: Function} = {}


  function generate(num: number, start: number = 0) {
    return [...new Array(num)].map((_, i) => ({
      id: i + start + ''
    }))
  }
</script>

<div>
    <SingleListPlayground {options} data={generate(10, 0)} listId='list-1'/>
    <SingleListPlayground {options} data={generate(10, 10)} listId='list-2'/>
</div>

<style>
    div {
        height: 100%;
        display: flex;
    }
</style>