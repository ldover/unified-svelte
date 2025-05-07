/**
 * Svelte action that focuses the element on click rather than on mousedown.
 */
export function focusOnClick(node: HTMLElement, enabled: boolean) {
  if (!enabled) {
    console.info('focus on click not enabled')
    return
  }

  function prevent(e: Event) {
    if (node.draggable) {
      console.warn('"draggable" cannot be used when focusOnClick action is applied to the element.')
    }

    e.preventDefault()
    e.stopPropagation()
  }

  function focus(this: HTMLElement) {
    this.focus()
  }

  node.addEventListener('mousedown', prevent)
  node.addEventListener('click', focus)

  return {
    destroy() {
      node.removeEventListener('mousedown', prevent)
      node.removeEventListener('click', focus)
    }
  }
}
