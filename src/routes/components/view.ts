export interface View {
  id: string
  name: string
  has: (entity: string) => boolean
}

export class ViewImpl implements View {
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

  has(entity: string) {
    return true
  }
}
