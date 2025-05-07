import type { ListSelection } from "./list.js";

export interface HoverData {
    index: number
    e: HTMLElement
    pos: -1 | 0 | 1  // -1 is above, 0 center, 1 below
}

export function findInsertion(hover: HoverData): number {
    return hover.pos === -1 ? hover.index : hover.index + 1;
}

export function findMove(slot: number, sel: ListSelection | null): number {
    if (!sel) return slot;                       // nothing selected
  
    // 1. slot inside a selected block  (or right after it → r.to)
    for (const r of sel.ranges) {
      if (r.from < slot && slot <= r.to) return r.from;
    }
  
    // 2. slot really outside every block
    if (slot <= sel.min) return slot;            // above the whole selection

    const removedBefore = sel.indices().filter(i => i < slot).length;
    return slot - removedBefore;                 // adjust for lifted rows
}

export function findClosest(sel: string, e: DragEvent): HoverData | null {
    const target = (e.target as HTMLElement).closest<HTMLElement>(sel);
    if (!target) return null;
  
    const idx  = Number(target.dataset.idx);
    const rect = target.getBoundingClientRect();
    const T    = Math.min(6, rect.height / 3);
  
    let pos: -1|0|1 = 0;
    if (e.clientY < rect.top + T)      pos = -1;
    else if (e.clientY > rect.bottom - T) pos = 1;
  
    return { index: idx, e: target, pos };
  }
  
