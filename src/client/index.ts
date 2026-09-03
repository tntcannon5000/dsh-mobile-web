/** DSH Mobile Web browser plugin. */
import { installMobileController, type MobileClientContext } from './mobile-controller.js'

/** Stable Client plugin name. */
export const name = 'mobile-web'

/** Layout and Workspace navigation supply mobile chrome; slots and locale compose Chat Info. */
export const inject = ['layout', 'slots', 'locale', 'uiWorkspace']

/**
 * Mount responsive presentation and touch behavior.
 * @param context - browser Cordis context with public layout and Workspace navigation services.
 */
export function apply(context: MobileClientContext): void {
  context.effect(
    () => installMobileController(context),
    'dsh-mobile-web: responsive shell and touch behavior',
  )
}
