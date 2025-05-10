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
  data: T;
}

/**
 * Target component contract.
 */
export interface Droppable<TExpected = unknown>
  extends Readable<DroppableState> {
  deserialize(str: string): TExpected;
  drop(payload: TExpected, ev: DragEvent): void | Promise<void>;
  setDragover(on: boolean, ev: DragEvent): void;
  ignore?: string[]; // list of origins to reject
}

/* ---------------------------------------------------------------- *
 * 2.  External‑adapter registry
 * ---------------------------------------------------------------- */

export interface ExternalAdapter {
  match(dt: File): boolean;
  parse(dt: File): Promise<DraggablePayload | null>;
}

const adapters: ExternalAdapter[] = [];

/** Register a new adapter (e.g. plain text, URI list, files). */
export function registerAdapter(adapter: ExternalAdapter): void {
  adapters.push(adapter);
}

/* ---------------------------------------------------------------- *
 * 3.  Utility helpers
 * ---------------------------------------------------------------- */

/** Try to read internal payload first; else consult adapters. */
async function extractPayload(ev: DragEvent): Promise<DraggablePayload | null> {
  const dt = ev.dataTransfer;
  if (!dt) return null;

  if (dt.types?.includes(UNIFIED_MIME)) {
    try {
      const json = dt.getData(UNIFIED_MIME);
      return JSON.parse(json) as DraggablePayload;
    } catch {
      return null;
    }
  }

  for (const a of adapters) {
    try {
      if (a.match(dt)) {
        const p = await a.parse(dt);
        if (p) return p;
      }
    } catch {
      /* swallow adapter errors */
    }
  }
  return null;
}

/* ---------------------------------------------------------------- *
 * 4.  Svelte actions
 * ---------------------------------------------------------------- */

/** Params for the `draggable` action. */
export interface DraggableActionParams<T = unknown> {
  item: Draggable<T>;
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

  return {
    update,
    destroy() {
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
    // TODO: test dragCounter
  let dragCounter = 0; // track nested dragenter/dragleave

  async function handleDragOver(ev: DragEvent) {
    const payload = await extractPayload(ev);
    if (!payload) return; // unknown drag source → ignore for now

    if (params.target.ignore?.includes(payload.origin)) {
      return; // reject — origin on blacklist
    }

    ev.preventDefault(); // signal drop allowed
    if (dragCounter === 0) params.target.setDragover(true, ev);
    dragCounter++;
  }

  function handleDragLeave(ev: DragEvent) {
    dragCounter = Math.max(dragCounter - 1, 0);
    if (dragCounter === 0) params.target.setDragover(false, ev);
  }

  async function handleDrop(ev: DragEvent) {
    ev.preventDefault();
    dragCounter = 0;
    params.target.setDragover(false, ev);

    const payload = await extractPayload(ev);
    if (!payload) return;
    if (params.target.ignore?.includes(payload.origin)) return;

    // Convert to target‑specific form
    const deserialized = params.target.deserialize(
      JSON.stringify(payload.data)
    );

    await params.target.drop(deserialized as TExpected, ev);
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

