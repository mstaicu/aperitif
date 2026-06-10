import { createDocument } from "./document.create.mjs";
import { listDocuments } from "./document.list.mjs";

/**
 * @param {import("../../platform/runtime.mjs").Runtime} runtime
 */
export const createDocumentsService = (runtime) => ({
  createDocument: createDocument(runtime),
  listDocuments: listDocuments(runtime),
});

/**
 * @typedef {ReturnType<typeof createDocumentsService>} DocumentsService
 */
