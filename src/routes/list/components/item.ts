import type { Content } from '$lib/list.js'

export interface Item extends Content {
  name: string
}

let mounted = 0

export class ItemImpl implements Item {
  public name: string

  constructor(
    public id: string,
    name?: string
  ) {
    if (name) {
      this.name = name
    } else {
      this.name = ''
    }
  }

  destroy(): void {
    mounted--
    console.log({ mounted })
  }

  mount(): void {
    mounted++
    console.log({ mounted })
  }
}
