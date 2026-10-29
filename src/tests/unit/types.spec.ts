import { expect, test } from 'vitest';
import { formatData, invertDictionary } from '../../types.js';

test('invertDictionary returns an ordinary object with inherited methods', () => {
  const ref = new formatData();
  ref.id = '1';
  ref.title = 'Note';
  ref.data = ['#tag'];

  const result = invertDictionary([ref]);

  expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  expect(result.hasOwnProperty('#tag')).toBe(true);
  expect(result.hasOwnProperty('missing')).toBe(false);
  expect(result['#tag']).toEqual(['[Note][1]']);
  expect(Object.getPrototypeOf(invertDictionary([]))).toBe(Object.prototype);
});

test('invertDictionary safely groups prototype property names and skips dangerous keys', () => {
  const first = new formatData();
  first.id = '1';
  first.title = 'First';
  first.data = ['toString', 'valueOf', 'hasOwnProperty', 'toString', '__proto__', 'constructor', 'prototype'];
  const second = new formatData();
  second.id = '2';
  second.title = 'Second';
  second.data = ['toString'];

  const result = invertDictionary([first, second]);

  expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  expect(Object.keys(result)).toEqual(['toString', 'valueOf', 'hasOwnProperty']);
  expect(result.toString).toEqual(['[First][1]', '[First][1]', '[Second][2]']);
  expect(result.valueOf).toEqual(['[First][1]']);
  expect(result['hasOwnProperty']).toEqual(['[First][1]']);
});
