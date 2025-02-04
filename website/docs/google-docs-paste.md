---
title: 📝 Google Docs Paste
---

The Google Docs paste source turns Google Docs pastes into an
atjson document. atjson uses Google Doc's internal format directly,
which you can learn more about in our [content documentation](./google-docs-explainer).

## Getting Started

Install the Google Docs paste handler using `npm`:

```bash
npm install --save @atjson/source-google-docs-paste
```

## Handling pastes from Google Docs

This source is designed to be used to handle paste events that contain bits from a Google Doc. In the text editor of your choice, add a handler to the paste event.

Get the Google Docs paste item from the paste event under the name `application/x-vnd.google-docs-document-slice-clip+wrapped`:

```ts
let gdocsPaste = evt.clipboardData.getData('application/x-vnd.google-docs-document-slice-clip+wrapped');
```

After getting the data, check if it a paste from Google Docs and use the Google Docs paste source to turn the paste into an AtJSON document:

```ts
if (gdocsPaste !== '') {
  let data = JSON.parse(JSON.parse(gdocsPaste).data);
  let pastedDoc = GoogleDocsPasteSource.fromRaw(data);
}
```

