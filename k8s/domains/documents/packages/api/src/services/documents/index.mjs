import { createDocument } from "./document.create.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createDocumentsService = (ctx) => ({
  createDocument: createDocument(ctx),
});

/**
 * @typedef {ReturnType<typeof createDocumentsService>} DocumentsService
 */
