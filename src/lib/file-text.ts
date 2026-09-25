import { clampText, docxXmlToText, readableKind } from "@/lib/file-text-model";

const PDFJS = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build";
const FFLATE = "https://cdn.jsdelivr.net/npm/fflate@0.8.3/esm/browser.js";
const MAX_PDF_PAGES = 50;

/**
 * Reads the text inside a file on this device (PDF, Word .docx, plain
 * text). Returns "" for anything else or on failure; the file itself is
 * kept either way. Images are not read (no OCR yet).
 */
export async function readFileText(file: Blob & { name?: string }): Promise<string> {
  const kind = readableKind(file.type, file.name ?? "");
  try {
    if (kind === "text") return clampText(await file.text());
    if (kind === "docx") {
      const { unzipSync, strFromU8 } = await import(/* @vite-ignore */ FFLATE);
      const files = unzipSync(new Uint8Array(await file.arrayBuffer()), {
        filter: (f: { name: string }) => f.name === "word/document.xml",
      });
      const xml = files["word/document.xml"];
      return xml ? clampText(docxXmlToText(strFromU8(xml))) : "";
    }
    if (kind === "pdf") {
      const pdfjs = await import(/* @vite-ignore */ `${PDFJS}/pdf.min.mjs`);
      pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS}/pdf.worker.min.mjs`;
      const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
        .promise;
      const pages: string[] = [];
      for (let i = 1; i <= Math.min(doc.numPages, MAX_PDF_PAGES); i++) {
        const content = await (await doc.getPage(i)).getTextContent();
        pages.push(content.items.map((it: { str?: string }) => it.str ?? "").join(" "));
      }
      return clampText(pages.join("\n"));
    }
  } catch (e) {
    console.info("[file-text] could not read", file.name, e);
  }
  return "";
}
