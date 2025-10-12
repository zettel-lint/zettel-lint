import { describe, expect, test } from 'vitest';
import { idFromFilename } from '../../file-handling';

describe('idFromFilename', () => {
  test('extracts numeric ID from simple filename', () => {
    expect(idFromFilename('12345678-note-title.md')).toBe('12345678');
  });

  test('extracts numeric ID from Windows-style path', () => {
    expect(idFromFilename('C:\\notes\\12345678-note-title.md')).toBe('12345678');
  });

  test('extracts numeric ID from Unix-style path', () => {
    expect(idFromFilename('/home/user/notes/12345678-note-title.md')).toBe('12345678');
  });

  test('handles multiple dots in filename', () => {
    expect(idFromFilename('12345678-note.title.with.dots.md')).toBe('12345678');
  });

  test('returns empty string for invalid filename', () => {
    expect(idFromFilename('')).toBe('');
  });

  test('returns empty string for undefined filename', () => {
    expect(idFromFilename(undefined as any)).toBe('');
  });

  test('handles mixed path separators', () => {
    expect(idFromFilename('C:/notes\\12345678-note-title.md')).toBe('12345678');
  });
});