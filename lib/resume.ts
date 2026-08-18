import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

export const MAX_RESUME_BYTES = 10 * 1024 * 1024; // 10MB, matching the UI copy.
// Enough to cover a long CV without blowing past free-tier token limits.
const MAX_RESUME_CHARS = 24_000;

export const ACCEPTED_RESUME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export class ResumeError extends Error {}

function tidy(text: string): string {
  const cleaned = text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned.length > MAX_RESUME_CHARS
    ? `${cleaned.slice(0, MAX_RESUME_CHARS)}\n… [truncated]`
    : cleaned;
}

// Turn an uploaded resume into plain text. PDF goes through unpdf (which runs
// in a serverless runtime, unlike pdf-parse); .docx goes through mammoth.
export async function extractResumeText(file: File): Promise<string> {
  if (file.size > MAX_RESUME_BYTES) {
    throw new ResumeError("That file is over 10MB. Upload a smaller resume.");
  }
  if (file.size === 0) throw new ResumeError("That file is empty.");

  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();
  const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
  const isDocx =
    file.type === ACCEPTED_RESUME_TYPES[1] || name.endsWith(".docx");

  let text = "";
  if (isPdf) {
    try {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text: pdfText } = await extractText(pdf, { mergePages: true });
      text = Array.isArray(pdfText) ? pdfText.join("\n") : pdfText;
    } catch {
      throw new ResumeError("Could not read that PDF. It may be corrupt or password-protected.");
    }
  } else if (isDocx) {
    try {
      const res = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
      text = res.value;
    } catch {
      throw new ResumeError("Could not read that Word file. Try exporting it as a PDF.");
    }
  } else {
    throw new ResumeError("Unsupported file. Upload a PDF or a Word .docx file.");
  }

  const tidied = tidy(text);
  if (tidied.length < 50) {
    // Almost always a scanned/image-only PDF, which has no text layer at all.
    throw new ResumeError(
      "No text found in that file. If it is a scan, export a text-based PDF instead."
    );
  }
  return tidied;
}
