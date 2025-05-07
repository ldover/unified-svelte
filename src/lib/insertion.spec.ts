import { describe, it, expect } from 'vitest'
import { ListSelection } from '$lib/list.js'
import { findMove, findInsertion } from '$lib/drag.js'

const sel = (indices: number[]) => ListSelection.fromIndices(indices)!

describe('findMoveIndex', () => {

  // 0 | 1 2 3   (nothing selected)
  it('plain insert — returns slot', () => {
    expect(findMove(0, null)).toBe(0)
  })

  // [0] | 1 2 3
  it('slot after contiguous sel — no-op', () => {
    expect(findMove(1, sel([0]))).toBe(0)
  })

  // [0] | 1 2 [3]
  it(`bar after 0; non-contig sel → move to 1`, () => {
    expect(findMove(1, sel([0, 3]))).toBe(0)
  })

  // 0 | [1 2] 3
  it('slot before block — no-op (returns 1)', () => {
    expect(findMove(1, sel([1, 2]))).toBe(1)
  })

  // 0 [1 | 2] 3  (inside range)
  it('slot inside range → returns range.from', () => {
    expect(findMove(2, sel([1, 2]))).toBe(1)
  })

  // 0 1 [2] 3 [5 | 6 7] 8 9 [10]
  it('slot inside middle block of mixed selection', () => {
    expect(findMove(5, sel([2, 4, 5, 6, 9]))).toBe(4)
  })

  // 0 | 1 [2] 3    (bar between 0 and 1)  slot = 1
  it('bar after 0 with sel[2] → move to 1', () => {
    expect(findMove(1, sel([2]))).toBe(1)
  })

  // 0 1 | [2] 3    (bar between 1 and 2)  slot = 2
  it('bar before selected row → no‑op', () => {
    expect(findMove(2, sel([2]))).toBe(2)
  })

  // [0] 1 2 3 | 4 [5]   (bar between 3 and 4)  slot = 4
  it('move down crossing one block', () => {
    expect(findMove(4, sel([0, 5]))).toBe(3)
  })

  // 0 1 [2] 3 | 5 [6 7] 8 9 [10]
  it('slot outside the selection ranges -> returns that slot', () => {
    expect(findMove(4, sel([2, 6, 7, 10]))).toBe(3)
  })

  // [0 1] 2 | 3 4 
  it.only('move two down', () => {
    expect(findMove(3, sel([0, 1]))).toBe(2)
  })

  // [0 1  2] 3 | 4 
  it.only('move three down', () => {
    expect(findMove(4, sel([0, 1, 2]))).toBe(2)
  })
})

it('pos -1 returns hover.index', () =>
  expect(findInsertion({ index: 3, pos: -1 } as any)).toBe(3))

it('pos  1 returns index+1', () =>
  expect(findInsertion({ index: 3, pos: 1 } as any)).toBe(4))

it('When at 0 | [1] 2 3, should return 1', () =>
  expect(findInsertion({ index: 1, pos: -1 } as any)).toBe(1))

it('When at [0] | 1 2 3 should return 1', () =>
  expect(findInsertion({ index: 0, pos: 1 } as any)).toBe(1))

it('When at | [0] 1 2 3 should return 0', () =>
  expect(findInsertion({ index: 0, pos: -1 } as any)).toBe(0))
