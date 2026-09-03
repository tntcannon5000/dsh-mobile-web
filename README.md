# DSH Mobile Web

Unofficial, removable mobile-Web and PWA improvements for DeepSeek Harness. The plugin preserves the stock Harness application and stock Sorsama relay authentication.

The first implementation phase changes narrow portrait cover/candybar layouts only: the collapsed navigation rail stops reserving width while its controls remain in place, the expanded sidebar overlays and dims the conversation, and the composer tracks the visible viewport above the software keyboard. Touch-mobile layouts, including unfolded foldables, also gain tap/swipe sidebar dismissal, right-swipe opening, and suppression of the sidebar hover tooltip.

## Development

```sh
pnpm install
pnpm run check
```

During local development, install the package as a `link:` dependency in the DSH Web profile and append `dsh-mobile-web` to that profile's bundle list. Build this package before reloading Harness because the Web runtime serves `lib/client.js`.

## Compatibility

The current development target is DeepSeek Harness `0.1.2-alpha.4`. The plugin uses the public layout service and semantic `data-*` anchors; it does not modify Harness source or Sorsama.

## Model Experience

This presentation plugin does not add model-visible content, tokens, tools, session events, or KV-cache input.

## Known Limitations and Deferred Work

PWA manifest, artwork, installation promotion, and real-device Android keyboard acceptance remain later horizons. Desktop and landscape redesign are intentionally out of scope.
