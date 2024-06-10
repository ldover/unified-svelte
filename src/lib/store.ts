import { type Readable, type Subscriber, type Unsubscriber, writable } from 'svelte/store'

export interface Storable<T, State> {
  getState: () => State
  getReactiveProps: () => string[]
}

export type Stored<
  T extends Storable<any, State>,
  State = T extends Storable<any, infer S> ? S : never
> = T & Readable<State>

export function stored<
  T extends Storable<any, State>,
  State = T extends Storable<any, infer S> ? S : never
>(obj: T): Stored<T, State> {
  const store = writable(obj.getState())

  return new Proxy(obj, {
    set(target, property, value) {
      // @ts-ignore
      target[property] = value
      if (typeof property == 'string') {
        if (obj.getReactiveProps().includes(property)) {
          store.set(obj.getState())
        }
      }
      return true // Indicate success
    },
    get(target, property, receiver) {
      if (property === 'subscribe') {
        return (run: Subscriber<State>): Unsubscriber => store.subscribe(run)
      }
      return Reflect.get(target, property, receiver)
    }
  }) as Stored<T, State>
}
