/**
 * True when a keyboard event originated from a text-entry surface, where
 * single-character shortcuts should be ignored so typing isn't hijacked.
 */
export const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  return Boolean(target.isContentEditable);
};

/** True when the platform "command" modifier is held (⌘ on macOS, Ctrl elsewhere). */
export const hasModifier = (event: Pick<KeyboardEvent, 'metaKey' | 'ctrlKey'>): boolean =>
  event.metaKey || event.ctrlKey;

/**
 * True when the primary command modifier is ⌘ (Apple platforms), used to show
 * the right hint in the UI. Falls back to Ctrl when the platform is unknown.
 */
export const isApplePlatform = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);
};
