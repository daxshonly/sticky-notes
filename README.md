# sticky-notes
create an sticky note that always be on top i.e the always ON top feature.

## Microsoft Store packaging

This app is configured for an Electron AppX build so it can be packaged for Microsoft Store submission.

Before publishing, replace the placeholder publisher values in [package.json](package.json) with the identity from your Store certificate:

- `appx.publisher`
- `appx.publisherDisplayName`
- `appx.identityName`

Build the Store package with:

```bash
npm run dist:store
```

The output is written to `dist/`.
