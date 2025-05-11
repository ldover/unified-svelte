<script lang=ts>

    export let data
    
     let builder = (d: { id: string }) => ({
      content: new ItemImpl(d.id, `Item ${d.id}`),
      options: { component: BasicListItemUi, hover: { threshold: 0.2} }
    })
  
    function data(num: number) {
      return [...new Array(num)].map((_, i) => ({
        id: i + ''
      }))
    }
  
    let list = new SvelteList(data(10), builder, {
      id: 'simple-list',
      selection: 'multi',
      insertionBar: CustomInsertionBarUi,
      dragHandle: DragHandleUi,
      focusOn: 'click',
      cache: false,
      handlers: {
        keydown: function (e) {
          if (e.metaKey && e.key == 'a' && e.shiftKey) {
            this.selection?.pick(this.items).forEach((item) => console.log('archive', item))
            return true
          }
        }
      }
    })
</script>

