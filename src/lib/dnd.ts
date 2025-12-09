import type { Readable } from 'svelte/store';
import { imageFileAdapter, noteFileAdapter } from './dnd-adapters.js';

/* ---------------------------------------------------------------- *
 * 1.  Core types & constants
 * ---------------------------------------------------------------- */

export const UNIFIED_MIME = 'application/x-unified';

/** Draggable → store state */
export interface DraggableState { draggable: boolean }
/** Droppable → store state */
export interface DroppableState { dragover: boolean, droppable: boolean }

/**
 * First‑class draggable description used by client components.
 */
export interface Draggable<P = unknown> extends Readable<DraggableState> {
  serialize(): P | P[];
  getDragImage(): HTMLElement | null;
  draggable: boolean;
  origin?: string; // component id / namespace
  effectAllowed?: 'copy' | 'move'
}

/** Normalised payload placed on the DataTransfer */
export interface DraggablePayload {
  origin: string;
  data: string;
}

/**
 * Target component contract.
 */
export interface Droppable<TExpected = unknown>
  extends Readable<DroppableState> {
  deserialize(data: string): TExpected | TExpected[];
  drop(ev: DragEvent, payload: TExpected[], origin: string): void | Promise<void>;
  setDragover(ev: DragEvent, on: boolean): void;
  ignore?: string[]; // list of origins to reject
  droppable: boolean
}

/* ---------------------------------------------------------------- *
 * 2.  File-adapter registry
 * ---------------------------------------------------------------- */

export interface FileAdapter {
  match(dt: File): boolean;
  parse(dt: File): Promise<unknown | null>;
}

const adapters: FileAdapter[] = [];

/** Register a new adapter (e.g. plain text, URI list, files). */
export function registerAdapter(adapter: FileAdapter): void {
  adapters.push(adapter);
}

type FileHandler = (target: Droppable, data: unknown[]) => Promise<unknown[]>
let fileHandler: FileHandler| null = null

/** To parse files */
export function registerFileHandler(options: { adapters?: FileAdapter[], onHandle: FileHandler }): void {
    fileHandler =  options.onHandle
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

async function extractFiles(ev: DragEvent) {
  const dt = ev.dataTransfer;
  if (!dt) return null;
  return await Promise.all([...dt.files].map(handleFile))
}

/* ---------------------------------------------------------------- *
 * 4.  Svelte actions
 * ---------------------------------------------------------------- */

/** Params for the `draggable` action. */
export interface DraggableActionParams<T = unknown> {
  item: Draggable<T>;
  disabled?: boolean;
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

    const payload: DraggablePayload = {
      origin: params.item.origin ?? '',
      data: JSON.stringify(params.item.serialize()),
    };

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
      if (!params.target.droppable) {
        return
      }

      if (ev.dataTransfer) {
        ev.dataTransfer.dropEffect = ev.altKey ? 'copy' : 'move'
      }
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

    if (ev.dataTransfer) {
      ev.dataTransfer.dropEffect = ev.altKey ? 'copy' : 'move'
    }

    let payload: string | null = null
    let deserialized: TExpected[]

    if (ev.dataTransfer?.files.length) {
      if (!fileHandler) {
        return console.warn("No file handler registered")
      }

      let data = await extractFiles(ev)
      if (!data) return
      
      // TODO: tighten the type safety here
      deserialized = await fileHandler(params.target, data) as TExpected[]
      if (!deserialized) {
        return
      }

      await params.target.drop(ev, deserialized, 'file')

    } else {
      payload = extractPayload(ev);
      if (!payload) return;
      const parsed = JSON.parse(payload) as DraggablePayload
      origin = parsed.origin
      let data = parsed.data

      let deserialized = params.target.deserialize(
        data
      );
  
      if (!Array.isArray(deserialized)) {
          deserialized = [deserialized]
      }

        await params.target.drop(ev, deserialized, origin)
    }
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

export const defaultAdapters = [imageFileAdapter, noteFileAdapter]

