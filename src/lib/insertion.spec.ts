import { findInsertion } from '$lib/drag.js'
import { expect, it } from 'vitest'


it('When at 0 | [1] 2 3, should return 1', () =>
  expect(findInsertion({ index: 1, pos: -1 } as any)).toBe(1))

it('When at [0] | 1 2 3 should return 1', () =>
  expect(findInsertion({ index: 0, pos: 1 } as any)).toBe(1))

it('When at | [0] 1 2 3 should return 0', () =>
  expect(findInsertion({ index: 0, pos: -1 } as any)).toBe(0))

it('When at 0 1 2 [3] | should return 0', () =>
  expect(findInsertion({ index: 3, pos: 1 } as any)).toBe(4))
