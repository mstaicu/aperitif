import type { RequestContext } from "remix/fetch-router";
import { html } from "remix/html-template";
import { createHtmlResponse } from "remix/response/html";

import { loadDocuments } from "../domains/documents.ts";

export const documentsPage = {
  actions: {
    index: async (args: RequestContext) => {
      const { body } = await loadDocuments(args);

      return createHtmlResponse(
        html`<html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1"
            />
            <title>Documents</title>
            <style>
              :root {
                color-scheme: light;
                font-family: ui-sans-serif, system-ui, sans-serif;
                background: #f7f7f4;
                color: #161616;
              }

              body {
                margin: 0;
                padding: 3rem;
              }

              main {
                max-width: 52rem;
              }

              h1 {
                font-size: 2rem;
                margin: 0 0 1rem;
              }

              pre {
                background: #111;
                color: #f5f5f5;
                overflow: auto;
                padding: 1rem;
              }
            </style>
          </head>
          <body>
            <main>
              <h1>Documents</h1>
              <pre>${JSON.stringify(body, null, 2)}</pre>
            </main>
          </body>
        </html>`,
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    },
  },
};
