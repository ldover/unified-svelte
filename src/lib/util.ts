export function insert<T>(arr: readonly T[], item: T, i: number): T[] {
  const newArr = [...arr]
  newArr.splice(i, 0, item)
  return newArr
}
export function remove<T>(arr: readonly T[], i: number): T[] {
  const newArr = [...arr]
  newArr.splice(i, 1)
  return newArr
}

export const mergeOptions = <T>(defaults: T, options: Partial<T>): T => {
  return {
    ...defaults,
    ...options
  }
}

export const inView = (container: HTMLElement, item: HTMLElement) => {
  const elemRect = item.getBoundingClientRect()
  const contRect = container.getBoundingClientRect()

  return elemRect.top >= contRect.top && elemRect.bottom <= contRect.bottom
}
