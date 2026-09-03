/** DSH Mobile Web browser plugin. */
import { installMobileController, type MobileClientContext } from './mobile-controller.js'

/** Stable Client plugin name. */
export const name = 'mobile-web'

/** Layout supplies navigation; slots and locale compose the candybar Chat Info View. */
export const inject = ['layout', 'slots', 'locale']

/**
 * Mount responsive presentation and touch behavior.
 * @param context - browser Cordis context with the public layout service.
 */
export function apply(context: MobileClientContext): void {
  context.effect(
    () => installMobileController(context),
    'dsh-mobile-web: responsive shell and touch behavior',
  )
}
