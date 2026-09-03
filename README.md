# DSH Mobile Web

Unofficial, removable mobile-Web and PWA improvements for DeepSeek Harness. The plugin preserves the stock Harness application and stock Sorsama relay authentication.

The current implementation changes narrow portrait cover/candybar layouts only: the collapsed navigation rail stops reserving width, its official brand toggle joins the active Session title, and the remaining navigation actions stay available inside the overlay drawer instead of painting over the conversation. Active chats gain a responsive Chat Info View that reuses the live Session, job, subagent, model, usage, context, metric, and export controls supplied by Harness and other plugins. The compact composer retains Commands, access controls, third-party left-slot actions, and submit; it also tracks the visible viewport above the software keyboard.

Horizontal swipes move between candybar Conversation Views, and a right swipe from the leftmost View opens the sidebar. Touch-mobile layouts, including unfolded foldables, retain tap/left-swipe sidebar dismissal, right-swipe opening, and suppression of the sidebar hover tooltip. Unfolded visual composition remains stock.

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

Chat Info visually projects the original live controls without moving or recreating their React DOM. This preserves current interactions and plugin ownership, but keyboard and screen-reader order remains the controls’ original header/composer order rather than the visual card order. The DOM anchors are pinned to the tested Harness `0.1.2-alpha.4` release until Harness offers owner-supported alternate control-layout slots.
