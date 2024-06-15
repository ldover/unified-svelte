import {
  type Readable,
  type Subscriber,
  type Unsubscriber,
  writable,
  type Writable,
  type Invalidator
} from 'svelte/store'

type Listener<T> = (prevValue: T, value: T) => void
type Listeners<T> = {
  [K in keyof T]?: Listener<T[K]>[]
}

export type Reactive<T> = {
  // todo: have two call signatures for afterUpdate: propperty listener and state listener
  afterUpdate: <K extends keyof T>(prop: K, listener: Listener<T[K]>) => void
  removeListener: <K extends keyof T>(prop: K, listener: Listener<T[K]>) => void
}

export abstract class ReactiveComponent<T> implements Reactive<T> {
  listeners: Listeners<T> = {}

  constructor() {
    const listeners = this.listeners
    const self = this
    return new Proxy(this, {
      set(target, property, value, receiver) {
        if (property in target && target[property] !== value) {
          const prevValue = target[property]
          // @ts-ignore
          target[property] = value
          // @ts-ignore
          listeners[property]?.forEach((listener) => listener(prevValue, value))
        }

        self.update()
        return true // Indicate success
      }
    })
  }

  removeListener<K extends keyof T>(prop: K, listener: Listener<T[K]>) {
    const propListeners = this.listeners[prop]
    if (!propListeners) return
    const index = propListeners.indexOf(listener)
    if (index > -1) {
      propListeners.splice(index, 1)
    }
  }

  afterUpdate<K extends keyof T>(prop: K, listener: Listener<T[K]>) {
    if (!this.listeners[prop]) this.listeners[prop] = []
    this.listeners[prop]!.push(listener)
  }

  abstract update(): void
}

export abstract class SvelteReactiveComponent<T> implements Reactive<T>, Readable<T> {
  listeners: Listeners<T> = {}
  private store: Writable<T> | null = null

  constructor() {
    const listeners = this.listeners
    const self = this
    return new Proxy(this, {
      set(target, property, value, receiver) {
        if (property in target && target[property] !== value) {
          const prevValue = target[property]
          // @ts-ignore
          target[property] = value
          // @ts-ignore
          listeners[property]?.forEach((listener) => listener(prevValue, value))
        }

        self.update()
        return true // Indicate success
      }
    })
  }

  subscribe(run: Subscriber<T>, invalidate?: Invalidator<T> | undefined): Unsubscriber {
    // Initialize store when first needed
    if (!this.store) {
      console.log('init store')
      this.store = writable(this.getState())
    }
    return this.store.subscribe(run, invalidate)
  }

  removeListener<K extends keyof T>(prop: K, listener: Listener<T[K]>) {
    const propListeners = this.listeners[prop]
    if (!propListeners) return
    const index = propListeners.indexOf(listener)
    if (index > -1) {
      propListeners.splice(index, 1)
    }
  }

  afterUpdate<K extends keyof T>(prop: K, listener: Listener<T[K]>) {
    if (!this.listeners[prop]) this.listeners[prop] = []
    this.listeners[prop]!.push(listener)
  }

  private update() {
    if (this.store != null) {
      console.log('update', this.getState())
      this.store.set(this.getState())
    }
  }

  abstract getState(): T
}
