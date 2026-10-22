/**
 * Small cross-component notifications for data that changes in place.
 *
 * Server data hooks do not poll. When a modal mutates a shared record (for
 * example opening the cash drawer), it announces the change so other widgets
 * on the same screen can refresh without a page reload.
 */
export const SHIFTS_CHANGED_EVENT = 'warung:shifts-changed'
