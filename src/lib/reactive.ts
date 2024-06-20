import {
  writable,
  type Readable,
  type Subscriber,
  type Invalidator,
  type Writable
} from 'svelte/store'

type PropListener<T> = (value: T, prevValue: T) => void
type UpdateListener<Props> = (props: Props, prevProps: Props) => void
type Unsubscriber = () => void

export interface Reactive<Props> {
  set: <K extends keyof Props>(property: K, value: Props[K]) => void
  update: (values: Partial<Props>) => void
  afterSet: <K extends keyof Props>(prop: K, listener: PropListener<Props[K]>) => Unsubscriber
  beforeSet: <K extends keyof Props>(prop: K, listener: PropListener<Props[K]>) => Unsubscriber
  afterUpdate: (listener: UpdateListener<Props>) => Unsubscriber
  beforeUpdate: (listener: UpdateListener<Props>) => Unsubscriber
  getProp: <K extends keyof Props>(property: K) => Props[K]
  getProps: () => Props
}

export interface SvelteReactive<Props, State = Props> extends Reactive<Props>, Readable<State> {
  getState: () => State
}

function createUnsubscriber(listeners: any[], listener: any): Unsubscriber {
  return () => {
    const index = listeners.indexOf(listener)
    if (index !== -1) {
      listeners.splice(index, 1)
    }
  }
}

export abstract class ReactiveComponent<Props> implements Reactive<Props> {
  private props: Props
  private listeners: {
    beforePropListeners: { [K in keyof Props]?: PropListener<Props[K]>[] }
    afterPropListeners: { [K in keyof Props]?: PropListener<Props[K]>[] }
    beforeUpdateListeners: UpdateListener<Props>[]
    afterUpdateListeners: UpdateListener<Props>[]
  } = {
    beforePropListeners: {},
    afterPropListeners: {},
    beforeUpdateListeners: [],
    afterUpdateListeners: []
  }

  constructor(props: Props) {
    this.props = props
  }

  afterSet<K extends keyof Props>(prop: K, listener: PropListener<Props[K]>): Unsubscriber {
    const listeners =
      this.listeners.afterPropListeners[prop] ?? (this.listeners.afterPropListeners[prop] = [])
    listeners.push(listener)
    return createUnsubscriber(listeners, listener)
  }

  beforeSet<K extends keyof Props>(prop: K, listener: PropListener<Props[K]>): Unsubscriber {
    const listeners =
      this.listeners.beforePropListeners[prop] ?? (this.listeners.beforePropListeners[prop] = [])
    listeners.unshift(listener)
    return createUnsubscriber(listeners, listener)
  }

  afterUpdate(listener: UpdateListener<Props>): Unsubscriber {
    this.listeners.afterUpdateListeners.push(listener)
    return createUnsubscriber(this.listeners.afterUpdateListeners, listener)
  }

  beforeUpdate(listener: UpdateListener<Props>): Unsubscriber {
    this.listeners.beforeUpdateListeners.unshift(listener)
    return createUnsubscriber(this.listeners.beforeUpdateListeners, listener)
  }

  update(values: Partial<Props>) {
    const prevProps = { ...this.props }
    const newProps = { ...this.props, ...values }
    this.listeners.beforeUpdateListeners.forEach((listener) => listener({ ...newProps }, prevProps))
    this.props = newProps
    this.listeners.afterUpdateListeners.forEach((listener) => listener({ ...newProps }, prevProps))
  }

  set<K extends keyof Props>(property: K, value: Props[K]) {
    const prevProps = { ...this.props }
    const prevValue = this.props[property]
    const newProps = { ...this.props, property: value }
    this.listeners.beforePropListeners[property]?.forEach((listener) => listener(value, prevValue))
    this.listeners.beforeUpdateListeners.forEach((listener) => listener({ ...newProps }, prevProps))
    this.props = newProps
    this.listeners.afterPropListeners[property]?.forEach((listener) => listener(value, prevValue))
    this.listeners.afterUpdateListeners.forEach((listener) => listener({ ...newProps }, prevProps))
  }

  public getProp<K extends keyof Props>(property: K): Props[K] {
    return this.props[property]
  }

  public getProps(): Props {
    return { ...this.props }
  }
}

export abstract class SvelteReactiveComponent<Props, State = Props>
  implements SvelteReactive<Props, State>
{
  private store: Writable<State>
  private props: Props
  private listeners: {
    beforePropListeners: { [K in keyof Props]?: PropListener<Props[K]>[] }
    afterPropListeners: { [K in keyof Props]?: PropListener<Props[K]>[] }
    beforeUpdateListeners: UpdateListener<Props>[]
    afterUpdateListeners: UpdateListener<Props>[]
  } = {
    beforePropListeners: {},
    afterPropListeners: {},
    beforeUpdateListeners: [],
    afterUpdateListeners: []
  }

  private deriveState?: (props: Props) => State

  constructor(props: Props, deriveState?: (props: Props) => State) {
    this.props = props
    this.deriveState = deriveState
    this.store = writable(this.getState())
  }

  subscribe(run: Subscriber<State>, invalidate?: Invalidator<State>): Unsubscriber {
    return this.store.subscribe(run, invalidate)
  }

  afterSet<K extends keyof Props>(prop: K, listener: PropListener<Props[K]>): Unsubscriber {
    const listeners =
      this.listeners.afterPropListeners[prop] ?? (this.listeners.afterPropListeners[prop] = [])
    listeners.push(listener)
    return createUnsubscriber(listeners, listener)
  }

  beforeSet<K extends keyof Props>(prop: K, listener: PropListener<Props[K]>): Unsubscriber {
    const listeners =
      this.listeners.beforePropListeners[prop] ?? (this.listeners.beforePropListeners[prop] = [])
    listeners.unshift(listener)
    return createUnsubscriber(listeners, listener)
  }

  afterUpdate(listener: UpdateListener<Props>): Unsubscriber {
    this.listeners.afterUpdateListeners.push(listener)
    return createUnsubscriber(this.listeners.afterUpdateListeners, listener)
  }

  beforeUpdate(listener: UpdateListener<Props>): Unsubscriber {
    this.listeners.beforeUpdateListeners.unshift(listener)
    return createUnsubscriber(this.listeners.beforeUpdateListeners, listener)
  }

  update(values: Partial<Props>) {
    const prevProps = { ...this.props }
    const newProps = { ...this.props, ...values }
    this.listeners.beforeUpdateListeners.forEach((listener) => listener({ ...newProps }, prevProps))
    this.props = newProps
    this.store.set(this.getState())
    this.listeners.afterUpdateListeners.forEach((listener) => listener({ ...newProps }, prevProps))
  }

  set<K extends keyof Props>(property: K, value: Props[K]) {
    const prevProps = { ...this.props }
    const prevValue = this.props[property]
    const newProps = { ...this.props, [property]: value }
    this.listeners.beforePropListeners[property]?.forEach((listener) => listener(value, prevValue))
    this.listeners.beforeUpdateListeners.forEach((listener) => listener({ ...newProps }, prevProps))
    this.props = newProps
    this.store.set(this.getState())
    this.listeners.afterPropListeners[property]?.forEach((listener) => listener(value, prevValue))
    this.listeners.afterUpdateListeners.forEach((listener) => listener({ ...newProps }, prevProps))
  }

  public getState(): State {
    return this.deriveState ? this.deriveState(this.props) : (this.getProps() as any as State)
  }

  public getProp<K extends keyof Props>(property: K): Props[K] {
    return this.props[property]
  }

  public getProps(): Props {
    return { ...this.props }
  }
}
