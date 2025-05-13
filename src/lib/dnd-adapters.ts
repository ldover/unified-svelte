// src/dnd-adapter.ts
import {
    type FileAdapter,
  } from "./dnd.js";
  
  
  /* ------------ helpers shared by both adapters --------------- */
  const readAsDataURL = (f: File) =>
    new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onerror = () => rej(r.error);
      r.onload = () => res(r.result as string);
      r.readAsDataURL(f);
    });
  
  const readAsText = (f: File) =>
    new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onerror = () => rej(r.error);
      r.onload = () => res(r.result as string);
      r.readAsText(f);
    });
  
  /* -------------------- image adapter -------------------------- */
  export const imageFileAdapter: FileAdapter = {
    match: (file: File) => file.type.startsWith("image/"),
  
    async parse(file: File) {
      const dataURL = await readAsDataURL(file);
      const base64 = dataURL.split(",")[1];
  
      // discover dimensions
      const { width, height } = await new Promise<{ width: number; height: number }>(
        (resolve, reject) => {
          const img = new Image();
          img.onload = () =>
            resolve({ width: (img as HTMLImageElement).width, height: (img as HTMLImageElement).height });
          img.onerror = reject;
          img.src = dataURL;
        }
      );
  
      return {
          kind: "image",
          name: file.name,
          src: base64,
          width,
          height,
          mime_type: file.type,
      }
    }
  };
  
  /* ------------------ note adapter ------------------------- */
  export const noteFileAdapter: FileAdapter = {
    match: (file: File) => {
        return /\.md$/i.test(file.name) || 
            file.type.includes('text/plain') ||
            file.type.includes('text/markdown')
        
    },
    async parse(file: File) {
      const text = await readAsText(file);
      return {
          kind: "note",
          name: file.name,
          content: text,
      };
    },
  };
