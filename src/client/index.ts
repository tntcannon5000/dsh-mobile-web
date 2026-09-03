/** DSH Mobile Web browser plugin. */
import { installMobileController, type MobileClientContext } from './mobile-controller.js'

/** Stable Client plugin name. */
export const name = 'mobile-web'

/** Layout supplies the stock sidebar state transition. */
export const inject = ['layout']

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
