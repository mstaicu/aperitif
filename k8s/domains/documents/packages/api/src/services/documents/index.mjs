import { createDocument } from "./document.create.mjs";
import { listDocuments } from "./document.list.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createDocumentsService = (ctx) => ({
  createDocument: createDocument(ctx),
  listDocuments: listDocuments(ctx),
});

/**
 * @typedef {ReturnType<typeof createDocumentsService>} DocumentsService
 */
