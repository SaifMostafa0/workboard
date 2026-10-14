import { hasModifier, isApplePlatform, isEditableTarget } from '@/lib/hotkeys';
import { describe, expect, it } from 'vitest';

describe('isEditableTarget', () => {
  it('is true for input, textarea and select elements', () => {
    expect(isEditableTarget(document.createElement('input'))).toBe(true);
    expect(isEditableTarget(document.createElement('textarea'))).toBe(true);
    expect(isEditableTarget(document.createElement('select'))).toBe(true);
  });

  it('is true for contenteditable elements', () => {
    const div = document.createElement('div');
    // jsdom does not derive isContentEditable from the attribute, so set it.
    Object.defineProperty(div, 'isContentEditable', { value: true });
    expect(isEditableTarget(div)).toBe(true);
  });

  it('is false for regular elements, text nodes and null', () => {
    expect(isEditableTarget(document.createElement('div'))).toBe(false);
    expect(isEditableTarget(document.createTextNode('x'))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});

describe('hasModifier', () => {
  it('detects the meta or ctrl modifier', () => {
    expect(hasModifier({ metaKey: true, ctrlKey: false })).toBe(true);
    expect(hasModifier({ metaKey: false, ctrlKey: true })).toBe(true);
    expect(hasModifier({ metaKey: false, ctrlKey: false })).toBe(false);
  });
});

describe('isApplePlatform', () => {
  it('returns a boolean', () => {
    expect(typeof isApplePlatform()).toBe('boolean');
  });
});
