# DSH Mobile Web Horizon

## Status

This document is the durable product direction for the DSH Mobile Web plugin. It records the destination and limits that should remain stable while individual UI decisions evolve through discussion and visual feedback.

Read this file and [`DEVELOPMENT_GUIDELINES.md`](DEVELOPMENT_GUIDELINES.md) at the start of every development session. Update this document before implementing a decision that changes its scope or principles.

## North star

Make the complete DeepSeek Harness Web experience comfortable and dependable on tall phones and portrait foldables while preserving the stock Harness application and the stock Sorsama authentication workflow.

The result should feel like Harness composed for the available screen, not a separate mobile client and not a desktop page forcibly scaled down.

## Product model

- **Application:** the stock DeepSeek Harness Web UI.
- **Mobile delivery:** a standalone, distributable DSH plugin.
- **Remote access:** stock Sorsama `dsh-relay`.
- **Installed experience:** a Chrome-installed PWA named `DeepSeek Harness`.
- **Source ownership:** a dedicated GitHub repository, independent of the Harness and relay repositories.
- **Feedback model:** small visual changes proposed, displayed in three live device windows, and revised from direct user feedback.

The browser PWA is not the native Sorsama Android application. The plugin does not implement a second Harness frontend, protocol client, or authentication system.

## Fixed decisions

1. Do not maintain a DeepSeek Harness fork for mobile presentation.
2. Do not modify Harness source files to distribute this work.
3. Keep Sorsama responsible for sign-in, pairing, TLS, proxying, and revocation.
4. Keep the mobile plugin independent of Sorsama internals; it should work because the relay transparently forwards the Harness Web application.
5. Use the clean root PWA identity and launch URL: `/`.
6. Do not restore `/pair-app`, `/pair-accept`, old device credentials, or the retired remote channel.
7. Do not add offline caching or a Harness application-shell service worker.
8. Do not use device-name detection, generated class selectors, or broad DOM mutation.
9. Prioritize portrait phones and foldables; do not begin a broad desktop or landscape redesign.
10. Apply presentation changes only to narrow portrait cover/candybar phones unless the user explicitly includes unfolded displays. “Candybar” means the narrow portrait geometry represented by conventional phones and foldable cover displays. Validate the unfolded Find N5 for non-regression even when it is outside a change's visual scope.
11. On candybar phones with an active chat, keep only the official brand/sidebar toggle in the collapsed navigation layer and integrate it beside the Session title. Keep New Session, Add Workspace, Search, and Settings available inside the expanded overlay drawer without painting them over the conversation.
12. On every touch-mobile layout, including unfolded foldables, suppress the sidebar-toggle hover tooltip, close an open sidebar when the conversation is tapped or swiped left, and allow a right swipe on the conversation to open it.
13. On candybar phones, add a Chat Info View between Chat and Trajectory. It presents existing live Session metrics, mode, background-job, subagent, model, speed, quota, context, and Session-log controls without replacing their owning plugins. Keep third-party Conversation Views in the same tab row.
14. On candybar phones, horizontal swipes move between Conversation Views. A right swipe from the leftmost View opens the sidebar; sidebar-close gestures continue to take priority while the drawer is open.
15. On candybar phones, keep the composer docked immediately above the visible software keyboard. Its compact active-chat toolbar keeps Commands, access/mode controls, third-party left-slot actions such as file attachment, and the submit action; controls moved into Chat Info do not consume composer width.
16. Prefer minimal changes that preserve familiar Harness behavior and reuse live slot contributions rather than rebuilding their interactions.

## Experience principles

### Familiar

Keep existing language, information architecture, and interaction behavior unless a mobile constraint makes them unusable. A user moving between desktop Harness and the PWA should recognize the same product.

### Space-conscious

Every persistent pixel must justify itself on a narrow screen. Navigation, details, and secondary controls may collapse or move, but important actions must remain reachable.

### Keyboard-safe

The composer is the primary mobile control. It must remain visible, stable, and reachable as the software keyboard opens, closes, or changes height.

### Content-first

Conversation content, questions, approvals, tool output, images, and the composer take priority over decorative chrome.

### Touch-capable

Controls must tolerate imprecise fingers, not merely a mouse pointer. Hover may enhance but never unlock required behavior.

### Progressive

The Web application remains usable when PWA installation APIs, safe-area variables, or `visualViewport` are unavailable. Unsupported capabilities should disappear without error.

### Inspectable

Every accepted UI change must be visible in the shared headed browser lab and supported by screenshots. The implementation must not hide behind code-only assertions.

## Target environments

| Priority | Environment | CSS viewport | DPR | Role |
|---:|---|---:|---:|---|
| 1 | Oppo Find N5 cover | 380 × 872 | 3 | narrow foldable cover screen |
| 1 | Samsung Galaxy S23 Ultra | 412 × 883 | 3.5 | conventional tall Android flagship |
| 1 | Oppo Find N5 inner | 749 × 827 | 3 | almost-square but still portrait inner display |
| 2 | Comparable portrait Android phones | responsive range | device-defined | generalization check |
| 3 | Landscape and square windows | responsive range | device-defined | basic non-breakage only |
| Out of active scope | Desktop | desktop-defined | device-defined | no optimization work planned |

The physical panel resolution informs DPR and screenshot density. CSS viewport dimensions govern layout and media queries.

## Capability horizon

### Horizon 0 — Development foundation

- Standalone plugin repository and MIT licensing.
- Safe local-link installation that preserves the existing Web profile.
- Three visible device windows with exact CSS viewport and DPR emulation.
- Repeatable build, reload, screenshot, console, and network checks.
- Stock Sorsama relay retained as the working authentication path.

### Horizon 1 — Installable PWA

- Reviewed 192, 512, and maskable application icons.
- Root-scoped manifest using `standalone` display.
- Correct mobile metadata and launch background.
- First-time Android installation prompt driven by `beforeinstallprompt`.
- Session-level `Not now` dismissal and installed-state suppression.
- Authenticated installation, launch, expiration, sign-in, and relaunch verified through the public HTTPS relay origin.

### Horizon 2 — Mobile shell

- Navigation consumes substantially less permanent width on narrow screens.
- Details and secondary panels cannot remain stranded offscreen.
- The main surface has no unintended document-level horizontal overflow.
- Relay access remains reachable without covering essential controls.
- Safe-area and dynamic viewport behavior is consistent in browser and installed modes.

### Horizon 3 — Composer and keyboard

- Composer remains visible above the software keyboard.
- Focus, typing, attachment staging, model selection, send, queue, and steering actions remain reachable.
- Composer controls wrap or condense intentionally rather than clipping unpredictably.
- Opening and closing the keyboard does not lose the active draft or jump to an unrelated scroll position.

### Horizon 4 — Conversation completeness

- Long messages and code remain readable.
- User questions and approvals are fully operable.
- Tool cards, menus, dialogs, drawers, images, video, and file output fit within the viewport.
- Loading, streaming, empty, error, and long-content states remain usable.
- The Find N5 inner screen receives an intentional composition rather than an enlarged narrow-phone layout.

### Horizon 5 — Durable distribution

- Public GitHub releases with explicit Harness and relay compatibility.
- Reproducible package installation without machine-specific paths.
- Focused automated checks and real-device release verification.
- A documented upgrade and rollback path.
- Optional npm publication only after GitHub-tag installation is dependable.

## Explicit non-goals

- Replacing Sorsama relay or modifying its authentication design.
- Repairing or redesigning the native DSH Mobile application.
- Supporting the retired remote plugin's paired-device model.
- Preserving the old installed `/pair-app` application without reinstalling it.
- Providing offline conversations, cached authenticated responses, or background agent execution.
- Rebuilding Harness components wholesale inside the plugin.
- Achieving exact visual parity with Android-native controls.
- Optimizing every possible tablet, desktop, landscape, or multi-window layout in the first release.
- Hiding settings or security restrictions imposed by the relay.

## Compatibility boundary

The plugin may depend on documented DSH plugin APIs, Cordis lifecycle effects, Web-server index transforms, exact plugin-owned routes, slots, semantic `data-*` attributes, browser standards, and CSS capabilities.

The plugin must not depend on private component exports, generated CSS-module names, incidental DOM depth, Sorsama token formats, relay state files, Harness credentials, or unpublished runtime internals.

Because DeepSeek Harness is prerelease software, each plugin release names and tests its supported Harness versions. Compatibility is established by tests and visual evidence, not assumed from a broad version range.

## Decision gates

Discuss and obtain explicit agreement before:

- replacing a complete shipped Harness component;
- changing navigation structure rather than presentation;
- hiding a control instead of relocating or condensing it;
- adding persistent local storage beyond PWA dismissal state;
- introducing a service worker;
- adding a runtime dependency;
- requiring a relay source change;
- widening work to desktop or landscape redesign;
- using a selector without a documented semantic anchor;
- changing the PWA name, identity, scope, or display mode.

## Success conditions

The first stable release succeeds when:

- the PWA installs with the agreed name and artwork;
- opening it reaches the existing Sorsama sign-in flow when authentication is required;
- all three priority device profiles can create or open a session, read the conversation, answer questions, approve interactions, stage attachments, and send a message;
- the composer remains usable with the software keyboard;
- essential controls are neither clipped nor covered;
- no obsolete remote-auth behavior has returned;
- the plugin can be removed to recover the unmodified stock Harness Web presentation;
- installation and removal do not overwrite unrelated Web-profile customizations.

## Governance

User feedback determines product behavior. Technical recommendations should explain browser, plugin, security, or maintenance consequences without overriding an explicit product preference.

Treat accepted screenshots and stated behavior as the current visual requirement. When feedback changes direction, update this horizon if the change is durable, then implement the smallest coherent revision.

Keep unresolved ideas out of fixed decisions. Record them in issues or discussion notes until the user accepts them into the horizon.
