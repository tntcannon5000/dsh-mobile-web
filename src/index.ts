/** Host face required for DSH to discover the browser plugin. */
import type { Context } from '@deepseek-ai/cordis'

/** Stable Cordis plugin name. */
export const name = 'mobile-web'

/** The current host face owns no service dependency. */
export const inject: string[] = []

/**
 * Mount the host face.
 * @param _ctx - host Cordis context reserved for the PWA foundation.
 */
export function apply(_ctx: Context): void {}
