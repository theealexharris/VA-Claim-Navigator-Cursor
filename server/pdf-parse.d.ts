declare module "pdf-parse" {
  function pdfParse(
    dataBuffer: Buffer,
    options?: { pagerender?: (pageData: unknown) => string; max?: number }
  ): Promise<{ numpages?: number; text: string; info?: unknown; metadata?: unknown }>;
  export default pdfParse;
}
