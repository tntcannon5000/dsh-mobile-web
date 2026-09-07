# DSH Mobile Web Development Guidelines

## Purpose

These guidelines govern development of the standalone DSH Mobile Web plugin. Read this file together with [`HORIZON.md`](HORIZON.md) before planning or implementing a change.

The project improves the stock DeepSeek Harness Web interface for portrait phones and foldables without forking DeepSeek Harness or replacing Sorsama authentication.

## Product boundary

The plugin owns:

- installable-PWA metadata, artwork, and installation UI;
- portrait-responsive presentation of the stock Harness Web interface;
- safe-area, dynamic-viewport, and virtual-keyboard behavior;
- narrowly scoped browser-side behavior required by those presentation changes.

The plugin does not own:

- authentication, pairing, TLS, tunnelling, device credentials, or revocation;
- Harness RPC, WebSocket, session, workspace, model, or agent behavior;
- the native Sorsama Android application;
- offline session support or application-shell caching;
- `/pair-app`, `/pair-accept`, or compatibility with the retired remote plugin.

Sorsama `dsh-relay` remains the authentication and reverse-proxy layer. The plugin must work through a clean upstream relay and must not depend on private relay modifications.

## Distribution model

- Develop and distribute one standalone DSH plugin from its own GitHub repository.
- Do not modify or fork the DeepSeek Harness source merely to ship a mobile optimization.
- Keep Host and Client responsibilities inside the plugin package and use documented Harness extension points.
- Installation may add the plugin dependency and bundle entry to a Web profile. It must not overwrite the profile's existing bundles, Cordis patch, settings, or local development customizations.
- Back up the profile manifest and lockfile before the first installation, then inspect the resulting diff.
- Use a local `link:` dependency during development and a pinned GitHub release tag or commit for normal installation (no npm publication).

## Architecture rules

### Host half

The Host plugin may:

- serve its own manifest and icon assets;
- transform the Harness index through the supported `webServer.tapIndex` mechanism;
- inject a minimal early listener needed to retain `beforeinstallprompt` until the Client UI mounts.

The Host plugin must not proxy Harness traffic, handle sign-in, mint credentials, or copy Sorsama routes.

### Client half

The Client plugin should:

- compose new UI through Harness slots, including `shell.overlay` for the installation prompt;
- use Cordis effects with complete disposal for listeners, attributes, styles, and viewport observers;
- use CSS media and container queries before JavaScript;
- use `window.visualViewport` only for behavior CSS cannot express reliably;
- expose one plugin-owned root marker when global responsive rules need an explicit opt-in.

### Stable integration points

Prefer stable semantic anchors such as:

- `[data-slot="root"]`;
- `[data-slot="sidebar"]`;
- `[data-slot="conversation"]`;
- `[data-slot="shell.overlay"]`;
- `[data-sidebar-collapsed]`;
- `[data-details-collapsed]`.

Never target generated CSS-module class names. Never depend on incidental child indexes when a slot or semantic attribute exists.

Do not recreate the retired plugin's MutationObserver-driven DOM rewriting. If a requested change cannot be expressed through stable slots, semantic attributes, CSS, or a small disposable browser effect, pause and discuss the limitation before proceeding.

## PWA rules

The clean PWA identity is:

- name: `DeepSeek Harness`;
- id: `/`;
- start URL: `/`;
- scope: `/`;
- display mode: `standalone`.

The PWA must include reviewed 192×192, 512×512, and 512×512 maskable PNG artwork. Preserve applicable MIT notices and identify the application as an unofficial customization when distributed publicly.

The installation UI must:

- appear only when the browser supplies `beforeinstallprompt`;
- never appear in standalone or fullscreen display mode;
- require a user gesture before calling `prompt()`;
- offer `Install` and `Not now` actions;
- remember dismissal for the current browser session;
- disappear after `appinstalled`;
- remain usable with screen readers, touch, and narrow safe areas;
- degrade silently on browsers that do not support the event.

Do not add a service worker merely to qualify as a PWA. Do not cache the Harness shell, dynamic plugin bundles, authenticated API responses, sessions, or credentials.

## Responsive scope

Optimize portrait layouts first. The agreed validation profiles are:

| Device | CSS viewport | DPR | Orientation |
|---|---:|---:|---|
| Oppo Find N5 cover | 380 × 872 | 3 | portrait |
| Oppo Find N5 inner | 749 × 827 | 3 | slightly portrait |
| Samsung Galaxy S23 Ultra | 412 × 883 | 3.5 | portrait |

Desktop is outside the active optimization scope. Landscape and square layouts receive only safeguards needed to prevent breakage. Do not use device model detection; responsive behavior must derive from CSS dimensions, orientation, capabilities, and safe-area values.

Unless a request explicitly includes unfolded displays, apply visual and geometry changes only to narrow portrait cover/candybar layouts. Touch-specific interaction fixes may explicitly span both narrow phones and unfolded foldables. Always keep the unfolded profile in the validation pass so narrow-only rules cannot leak into it.

Prioritize:

- usable conversation width;
- reachable navigation and controls;
- composer visibility when the software keyboard opens;
- readable wrapping without horizontal page overflow;
- dialogs, drawers, questions, tool cards, media, and menus fitting the viewport;
- adequate touch targets;
- correct image aspect ratios;
- stable scrolling and no fixed element covering content.

Prefer the smallest coherent change. Do not redesign working surfaces merely because the viewport is mobile.

## Feedback-driven development loop

1. Discuss one behavior or defect with the user.
2. State the proposed visual and interaction change before editing.
3. Wait for explicit approval when the discussion has not yet settled the behavior.
4. Capture the current state in all affected device windows.
5. Read the owning source and identify the narrowest stable plugin extension.
6. Implement one related change group.
7. Run the narrowest relevant static, component, or integration checks.
8. Rebuild the plugin and reload all visible device windows together.
9. Capture and visually inspect screenshots from every affected viewport.
10. Inspect new console errors and failed required network requests.
11. Report what changed, what remains, and any trade-off discovered.
12. Incorporate user feedback in another focused iteration.

Use no more than three implementation iterations for one defect group without pausing to reassess the approach.

Do not claim visual success from source inspection, DOM snapshots, or test results alone. Screenshots and the user's visible windows are required evidence.

## Visible browser workflow

Keep three separate headed Edge windows visible on the primary monitor throughout active UI work. They must use the exact CSS viewport and DPR values in the responsive matrix.

The same Playwright pages used for automation must be the windows visible to the user. After each build, reload all affected pages together. Use semantic snapshots for interaction and screenshots for layout, clipping, overflow, canvas, SVG, media, and animation.

Generated screenshots belong in the browser artifact directory, not the plugin repository, unless a reviewed test fixture intentionally requires one.

## Change safety

- Read a file before editing it.
- Avoid unrelated cleanup.
- Preserve existing profile and relay behavior.
- Keep every listener and DOM effect disposable for plugin reload.
- Keep mobile rules behind explicit media conditions or a plugin-owned marker.
- Do not introduce secrets, hostnames, machine paths, tokens, cookies, relay state, session logs, or user data into source control.
- Do not weaken the relay's authentication or privileged-method policy to make a UI test pass.
- Do not switch from the working source-linked relay to a registry artifact without separately verifying equivalent authentication behavior.

## Testing expectations

Every product-visible change requires:

- focused unit or component coverage where practical;
- a plugin build and typecheck;
- a clean activation and disposal test;
- visual verification at every affected agreed viewport;
- no new material browser-console failure;
- no new failed required asset or API request.

PWA work additionally verifies:

- manifest syntax, identity, icon fields, and MIME types;
- icon dimensions and maskable purpose;
- secure-origin installation behavior;
- install-prompt capture, dismissal, acceptance, and installed-state suppression;
- authenticated launch through stock Sorsama relay;
- installation and relaunch on at least one real Android device before release.

## Git and releases

- Keep `main` releasable.
- Use focused branches such as `feat/pwa-foundation` and `feat/portrait-layout`.
- Keep PWA foundation, responsive behavior, and deployment documentation in separate coherent commits.
- Tag tested releases using semantic versions.
- Pin the supported DeepSeek Harness and `dsh-relay` versions in release notes.
- Never rewrite a shared release tag.
- Use `--force-with-lease`, never raw `--force`, if a private topic branch must be rebased.
- Commit source, tests, documentation, and intentional assets. Exclude dependencies, logs, caches, credentials, browser artifacts, runtime state, and local profile copies.

## Definition of done

A change is complete only when:

- it matches the behavior agreed with the user;
- it stays within the boundaries in `HORIZON.md`;
- the plugin builds and relevant checks pass;
- affected device views have been visually inspected;
- the user can see the result in the headed browser windows;
- stock Harness and stock Sorsama responsibilities remain intact;
- source-control changes are focused and contain no private runtime data;
- documentation reflects any durable decision introduced by the change.
