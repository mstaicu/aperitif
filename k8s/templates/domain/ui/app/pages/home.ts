import { html } from "remix/html-template";
import { createHtmlResponse } from "remix/response/html";

export function homePage() {
  return createHtmlResponse(
    html`<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>&lt;domain&gt;</title>
</head>
<body>
  <main>
    <h1>&lt;domain&gt; UI</h1>
  </main>
</body>
</html>`,
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
