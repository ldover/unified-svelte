<script lang=ts>
    import SingleListPlayground from "./views/SingleListPlayground.svelte"
    import TwoListPlayground from "./views/TwoListPlayground.svelte"

  // Have data 

  let map = new Map<string, any>()

  // TODO: probably best is for SvelteListItem to retain the `data` which was used to construct it  
  const serialize = (item) => {
    console.log('custom serialize', item.dta)
    return item.data
  }

  const deserialize = (data) => {
    console.log('custom deserialize', data)
    return data
  }

  let options = {
    serialize,
    deserialize
  }
</script>

<div class="page">
  <TwoListPlayground {options}/>
  <!-- <SingleListPlayground></SingleListPlayground> -->
</div>

<style>
  .page {
    height: 100vh;
  }
</style>
