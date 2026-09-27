import { expect, test } from 'vitest';
import { ErrorResponse } from '../../base-importer.js';

test('a default ErrorResponse represents failure with an empty message', () => {
  const response = new ErrorResponse();

  expect(response.success).toBe(false);
  expect(response.message).toBe('');
  expect(JSON.parse(JSON.stringify(response))).toEqual({ success: false, message: '' });
});
