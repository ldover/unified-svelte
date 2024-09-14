export interface Item {
  id: string
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
}
