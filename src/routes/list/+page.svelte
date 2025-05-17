<script lang=ts>
    import { registerFileHandler } from "$lib/dnd.js"
    import type { ListOptions } from "$lib/list.js"
    import SingleListPlayground from "./views/SingleListPlayground.svelte"
    import TwoListPlayground from "./views/TwoListPlayground.svelte"

  // Have data 

  let map = new Map<string, {id: string}>()

  const fileHandler = (droppable, files) => {
    console.log({droppable, files})
    return null
  }

  registerFileHandler({onHandle: fileHandler})
  
  let options: Partial<ListOptions<{id: string}>> = {
    serialize: (item) => {
      console.log('custom serialize', item.data)
      return (item.data as {id: string}).id
    },
    deserialize: (data) => {
      const parsed = JSON.parse(data) as string[]
      console.log('custom deserialize', data, parsed)

      return parsed.map(id => map.get(id))
    }
  }

  function generate(num: number, start: number = 0) {
    return [...new Array(num)].map((_, i) => {
      const obj ={
        id: i + start + ''
      }
      
      map.set(obj.id, obj)
      return obj
    })
  }

  let data1 = generate(10)
  let data2 = generate(10, 20)
</script>

<div class="page">
  <TwoListPlayground {options} {data1} {data2}/>
  <!-- <SingleListPlayground></SingleListPlayground> -->
</div>

<style>
  .page {
    height: 100vh;
  }
</style>
