import "server-only";
import Papa from "papaparse";
import { detectSections, parseCsvRows, parseLexicon, splitByPageMarkers, type ImportCandidate, type Section } from "./parse";

export type Extraction = { pageCount: number; charCount: number; sections: Section[]; candidates: ImportCandidate[] };

/** Extrait le texte d'un document (PDF, DOCX, TXT, CSV) et propose une structuration. */
export async function extractDocument(buffer: Buffer, mime: string, filename: string, pageOffset = 0): Promise<Extraction> {
  const lower = filename.toLowerCase();
  if (mime === "text/csv" || lower.endsWith(".csv")) {
    const parsed = Papa.parse<Record<string, string>>(buffer.toString("utf8"), { header: true, skipEmptyLines: true });
    const candidates = parseCsvRows(parsed.data);
    return { pageCount: 0, charCount: buffer.length, sections: [], candidates };
  }
  let pages: { page: string | null; text: string }[];
  if (mime === "application/pdf" || lower.endsWith(".pdf")) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: false });
    pages = text.map((t, i) => ({ page: String(i + 1 + pageOffset), text: t }));
    // si le document porte ses propres numéros « p. N/M », on les privilégie
    const joined = text.join("\n");
    if (/p\.\s*\d+\s*\/\s*\d+/.test(joined)) pages = splitByPageMarkers(joined);
  } else if (lower.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer });
    pages = splitByPageMarkers(value);
  } else {
    pages = splitByPageMarkers(buffer.toString("utf8"));
  }
  const all = pages.map((p) => ({ ...p, text: p.text.normalize("NFC") }));
  return {
    pageCount: pages.length,
    charCount: all.reduce((s, p) => s + p.text.length, 0),
    sections: detectSections(all),
    candidates: parseLexicon(all),
  };
}
