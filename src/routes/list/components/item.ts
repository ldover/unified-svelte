import type { Content } from '$lib/list.js'

export interface Item extends Content {
  name: string
}

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

  destroy(): void {}
  destroy(): void {}
}
