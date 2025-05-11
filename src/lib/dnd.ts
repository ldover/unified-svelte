import type { Readable } from 'svelte/store';
import { imageFileAdapter, noteFileAdapter } from './dnd-adapters.js';

/* ---------------------------------------------------------------- *
 * 1.  Core types & constants
 * ---------------------------------------------------------------- */

export const UNIFIED_MIME = 'application/x-unified';

/** Draggable → store state */
export interface DraggableState { draggable: boolean }
/** Droppable → store state */
export interface DroppableState { dragover: boolean }

/**
 * First‑class draggable description used by client components.
 */
export interface Draggable<T = unknown> extends Readable<DraggableState> {
  serialize(): T;
  getDragImage(): HTMLElement | null;
  draggable: boolean;
  origin?: string; // component id / namespace
  effectAllowed?: DataTransfer['effectAllowed'];
}

/** Normalised payload placed on the DataTransfer */
export interface DraggablePayload<T = unknown> {
  origin: string;
  data: T[];
}

/**
 * Target component contract.
 */
export interface Droppable<TExpected = unknown>
  extends Readable<DroppableState> {
  deserialize(str: string[]): TExpected[];
  drop(ev: DragEvent, payload: TExpected[], origin: string): void | Promise<void>;
  setDragover(ev: DragEvent, on: boolean): void;
  ignore?: string[]; // list of origins to reject
}

/* ---------------------------------------------------------------- *
 * 2.  External‑adapter registry
 * ---------------------------------------------------------------- */

export interface ExternalAdapter {
  match(dt: File): boolean;
  parse(dt: File): Promise<unknown | null>;
}

const adapters: ExternalAdapter[] = [];

/** Register a new adapter (e.g. plain text, URI list, files). */
export function registerAdapter(adapter: ExternalAdapter): void {
  adapters.push(adapter);
}

let externalHandler: ((target: Droppable, data: unknown[]) => void) | null = null

/** To parse files */
export function registerExternalHandler(options: { adapters?: ExternalAdapter[], onHandle: (data: unknown) => void}): void {
    externalHandler =  options.onHandle
    if (options.adapters) {
        options.adapters.forEach(a => registerAdapter(a))
    }
}

/* ---------------------------------------------------------------- *
 * 3.  Utility helpers
 * ---------------------------------------------------------------- */

export const handleFile = async (f: File) => {
    for (const a of adapters) {
        try {
            if (a.match(f)) {
                return a.parse(f);
            }
        } catch (err) {
            console.error('Failed to parse' + f.name, err)
        }
    }
}

/** Try to read internal payload first; else consult adapters. */
function extractPayload(ev: DragEvent): string | null {
  const dt = ev.dataTransfer;
  if (!dt) return null;

  if (dt.types?.includes(UNIFIED_MIME)) {
    try {
      return dt.getData(UNIFIED_MIME);
    } catch {
      return null;
    }
  }

  return null
}

async function extractExternal(ev: DragEvent): Promise<DraggablePayload | null> {
  const dt = ev.dataTransfer;
  if (!dt) return null;
  const data = await Promise.all([...dt.files].map(handleFile))
  
  return {
    origin: 'external',
    data
  }
}

/* ---------------------------------------------------------------- *
 * 4.  Svelte actions
 * ---------------------------------------------------------------- */

/** Params for the `draggable` action. */
export interface DraggableActionParams<T = unknown> {
  item: Draggable<T>;
  disabled: boolean;
}

/**
 * Svelte action that wires drag events based on the Draggable interface.
 *
 * Usage: <div use:draggable={{ item }}>
 */
export function draggable<T>(
  node: HTMLElement,
  params: DraggableActionParams<T>
) {
  if (params.disabled) return
  // Ensure the DOM element itself is draggable
  node.draggable = params.item.draggable;

  function handleDragStart(ev: DragEvent) {
    
    if (!params.item.draggable) {
      ev.preventDefault();
      return;
    }

    const payload: DraggablePayload<any> = {
      origin: params.item.origin ?? '',
      data: params.item.serialize(),
    };

    console.log(payload)

    ev.dataTransfer?.setData(UNIFIED_MIME, JSON.stringify(payload));

    if (params.item.effectAllowed) {
      ev.dataTransfer!.effectAllowed = params.item.effectAllowed;
    } else {
      ev.dataTransfer!.effectAllowed = 'copyMove';
    }

    const img = params.item.getDragImage?.();
    if (img) {
      ev.dataTransfer!.setDragImage(img, 0, 0);
    }
  }

  function update(newParams: DraggableActionParams<T>) {
    params = newParams;
    node.draggable = params.item.draggable;
  }

  node.addEventListener('dragstart', handleDragStart);

  const sub = params.item.subscribe(state => {
    node.draggable = state.draggable
  })

  return {
    update,
    destroy() {
      sub()
      node.removeEventListener('dragstart', handleDragStart);
    },
  } as const;
}

/** Params for the `droppable` action. */
export interface DroppableActionParams<T = unknown> {
  target: Droppable<T>;
}

export function droppable<TExpected>(
  node: HTMLElement,
  params: DroppableActionParams<TExpected>
) {

    async function handleDragOver(ev: DragEvent) {
    // TODO: implement blacklist based on target.ignore and origin  of the drag event
    //       although I think we only do that for

    ev.preventDefault(); // signal drop allowed
    params.target.setDragover(ev, true);
  }

  function handleDragLeave(ev: DragEvent) {
    params.target.setDragover(ev, false);
  }

  async function handleDrop(ev: DragEvent) {
    ev.preventDefault();
    params.target.setDragover(ev, false);

    let payload: string | null = null

    // TODO: add external
    // if (ev.dataTransfer?.files.length) {
    //   payload = await extractExternal(ev)
    // } else {
        // }
    payload = extractPayload(ev);
    
    if (!payload) return;

    const {origin, data} = JSON.parse(payload)

    // Siginal to client to handle external drop
    // TODO: add back
    // if (payload.origin == 'external') {
    //     if (!externalHandler) {
    //         return console.warn("No external handler registered")
    //     }
    //     // TODO: tighten the 'any' type
    //     await externalHandler(params.target, payload as any)
    // }

    // Convert to target‑specific form
    // TODO: I am not sure about this: seems ugly strignifying again like this
    const deserialized = params.target.deserialize(
      data
    );

    // TODO: see if we can avoid "as" type casting
    await params.target.drop(ev, deserialized, origin)
  }

  function update(newParams: DroppableActionParams<TExpected>) {
    params = newParams;
  }

  node.addEventListener('dragover', handleDragOver);
  node.addEventListener('dragleave', handleDragLeave);
  node.addEventListener('drop', handleDrop);

  return {
    update,
    destroy() {
      node.removeEventListener('dragover', handleDragOver);
      node.removeEventListener('dragleave', handleDragLeave);
      node.removeEventListener('drop', handleDrop);
    },
  } as const;
}

/* ---------------------------------------------------------------- *
 * 5.  Register adapters
 * ---------------------------------------------------------------- */

registerAdapter(imageFileAdapter);
registerAdapter(noteFileAdapter);

export const defaultAdapters = [imageFileAdapter, noteFileAdapter]

