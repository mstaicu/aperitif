import { html, type SafeHtml } from "remix/html-template";
import { createHtmlResponse } from "remix/response/html";

export type PageAssets = {
  scriptHref: string;
  stylesHref: string;
};

export function createDocumentResponse({
  content,
  scriptHref,
  stylesHref,
  title,
}: PageAssets & {
  content: SafeHtml;
  title: string;
}) {
  return createHtmlResponse(
    html`
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="color-scheme" content="light" />
          <title>${title} · Auth</title>
          <link rel="stylesheet" href="${stylesHref}" />
          <script type="module" src="${scriptHref}"></script>
        </head>
        <body>
          <main>${content}</main>
        </body>
      </html>
    `,
    { headers: { "Cache-Control": "no-store" } },
  );
}
