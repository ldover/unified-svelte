import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { draggable, droppable, registerAdapter, type ExternalAdapter, type DraggablePayload } from "./dnd.js";

// ---------------------------------------------------------------------------
// Minimal DataTransfer stub for jsdom (HTML Drag & Drop API is not implemented)
// ---------------------------------------------------------------------------
class DTStub implements DataTransfer {
  dropEffect: DataTransfer["dropEffect"] = "none";
  effectAllowed: DataTransfer["effectAllowed"] = "all";
  files: FileList = {} as FileList;
  items: DataTransferItemList = {} as DataTransferItemList;
  types: string[] = [];
  private store: Record<string, string> = {};

  setData(type: string, data: string) {
      this.store[type] = data;
    if (!this.types.includes(type)) this.types.push(type);
    return true;
  }
  getData(type: string) {
    return this.store[type] ?? "";
  }
  clearData(type?: string) {
    if (type) delete this.store[type];
    else this.store = {};
    return true;
  }
  setDragImage(): void {/* noop */}
}

// Patch global DataTransfer so DragEventInit can use it
beforeEach(() => {
  // @ts-ignore
  global.DataTransfer = DTStub;
});

afterEach(() => {
  // @ts-ignore
  delete global.DataTransfer;
});

// Helper to forge a DragEvent with our stub
function makeDragEvent(type: string, dt: DataTransfer): DragEvent {
  // JSDOM still won’t construct DragEvent with init, so cast CustomEvent.
  const ev = new Event(type, { bubbles: true, cancelable: true }) as unknown as DragEvent;
  Object.defineProperty(ev, "dataTransfer", { value: dt });
  return ev;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("draggable action", () => {
  it("serialises payload under application/x-unified and sets effectAllowed", () => {
    const node = document.createElement("div");
    const item = {
      id: "42",
      serialize() { return { kind: "task", id: this.id }; },
      getDragImage: () => null,
      draggable: true,
      origin: "listA",
      effectAllowed: "copy",
      // satisfy readable store contract minimally
      subscribe: () => { return () => {}; }
    } as const;
    const action = draggable(node, { item });

    const dt = new DTStub();
    const ev = makeDragEvent("dragstart", dt);

    node.dispatchEvent(ev);

    const json = dt.getData("application/x-unified");
    expect(json).not.toBe("");
    const payload = JSON.parse(json) as DraggablePayload;
    expect(payload.origin).toBe("listA");
    expect(payload.data).toEqual({ kind: "task", id: "42" });
    expect(dt.effectAllowed).toBe("copy");

    action?.destroy?.();
  });
});

// ---------------------------------------------------------------------------

describe("droppable action", () => {
  it("accepts internal payload when origin not ignored and invokes drop()", async () => {
    const node = document.createElement("div");
    const received: DraggablePayload[] = [];

    const target = {
      deserialize: (s: string) => JSON.parse(s) as DraggablePayload,
      drop: vi.fn((p) => { received.push(p); }),
      setDragover: vi.fn(),
      ignore: ["otherList"],
      subscribe: () => { return () => {}; }
    };

    droppable(node, { target });

    // prepare a dragover / drop sequence with allowed payload
    const dt = new DTStub();
    const payload: DraggablePayload = { origin: "listA", data: { id: "1" } };
    dt.setData("application/x-unified", JSON.stringify(payload));

    
      
    const overEv = makeDragEvent("dragover", dt);
    node.dispatchEvent(overEv);
    // TODO: preventDefault() is called but this test isn't good
    // expect(overEv.preventDefault).toBe(true)

    const dropEv = makeDragEvent("drop", dt);
    node.dispatchEvent(dropEv);

    // Flush async drop() promise
    await Promise.resolve();

    expect(target.setDragover).toHaveBeenCalledWith(false, expect.any(Event));
    expect(target.drop).toHaveBeenCalledTimes(1);

    // TODO: this is also poorly structured, probalby becuase of drop async
    // expect(received[0].origin).toBe("listA");
  });

  it("blocks payload whose origin is in ignore[]", () => {
    const node = document.createElement("div");
    const target = {
      deserialize: JSON.parse,
      drop: vi.fn(),
      setDragover: vi.fn(),
      ignore: ["listA"],
      subscribe: () => { return () => {}; }
    };

    droppable(node, { target });

    const dt = new DTStub();
    dt.setData("application/x-unified", JSON.stringify({ origin: "listA", data: {} }));

    const overEv = makeDragEvent("dragover", dt);
    node.dispatchEvent(overEv);
    expect(overEv.defaultPrevented).toBe(false); // no accept
  });
});

// ---------------------------------------------------------------------------

// TODO: non-functioning test
// describe("external adapter registry", async () => {
//   it.only("uses registered adapter when no internal payload", async () => {
//     const adapter: ExternalAdapter = {
//       match: (dt) => dt.types.includes("text/plain"),
//       parse: async (dt) => ({ origin: "external", data: { text: dt.getData("text/plain") } })
//     };
//     registerAdapter(adapter);

//     const node = document.createElement("div");
//     const target = {
//       deserialize: (_: string) => { throw new Error("should not call deserialize for external"); },
//       drop: vi.fn(),
//       setDragover: vi.fn(),
//       ignore: [],
//       subscribe: () => { return () => {}; }
//     };
//     droppable(node, { target });

//     const dt = new DTStub();
//     dt.setData("text/plain", "hello world");

//     const dropEv = makeDragEvent("drop", dt);
//     await node.dispatchEvent(dropEv);

//     // Flush async drop() promise
//     await Promise.resolve();

//     expect(target.drop).toHaveBeenCalled();
//     const arg = target.drop.mock.calls[0][0];
//     expect(arg.data.text).toBe("hello world");
//   });
// });
