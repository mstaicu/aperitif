import { createDocument } from "./document.create.mjs";
import { listDocuments } from "./document.list.mjs";

/**
 * @param {{ db: import("pg").Pool }} resources
 */
export const createDocumentsService = ({ db }) => ({
  createDocument: createDocument({ db }),
  listDocuments: listDocuments({ db }),
});

/**
 * @typedef {ReturnType<typeof createDocumentsService>} DocumentsService
 */
