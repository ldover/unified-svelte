import { ListSelection } from './lib/list.js'
import { describe, it, expect } from 'vitest'

const formatSelection = (sel: ListSelection) =>
  sel.ranges.map((r) => r.anchor + '/' + r.head).join(',')

describe('ListSelection', () => {
  it('stores ranges with a primary range', () => {
    let sel = ListSelection.create(
      [ListSelection.range(0, 1), ListSelection.range(3, 2), ListSelection.range(4, 5)],
      1
    )
    expect(sel.main.from).toBe(2)
    expect(sel.main.to).toBe(3)
    expect(sel.main.anchor).toBe(3)
    expect(sel.main.head).toBe(2)
    expect(formatSelection(sel)).toBe('0/1,3/2,4/5')
  })

  it('merges and sorts ranges when normalizing', () => {
    let sel = ListSelection.create([
      ListSelection.range(10, 12),
      ListSelection.range(6, 7),
      ListSelection.range(4, 5),
      ListSelection.range(3, 4),
      ListSelection.range(0, 6),
      ListSelection.range(7, 8),
      ListSelection.range(9, 13),
      ListSelection.range(13, 14)
    ])
    expect(formatSelection(sel)).toBe('0/8,9/14')
  })

  it('merges adjacent point ranges when normalizing', () => {
    let sel = ListSelection.create([
      ListSelection.range(10, 12),
      ListSelection.range(12, 13),
      ListSelection.range(12, 13),
      ListSelection.range(10, 11),
      ListSelection.range(8, 10)
    ])
    expect(formatSelection(sel)).toBe('8/13')
  })

  it('splits range into two', () => {
    // (0, 10), remove 4th position ->  (0, 4), (5, 10)
    let sel = ListSelection.create([ListSelection.range(0, 10)], 0).splitRange(4)

    expect(sel).toBeTruthy()
    expect(formatSelection(sel!)).toBe('0/4,5/10')
  })

  it('removes selection after last split', () => {
    // (0, 10), remove 4th position ->  (0, 4), (5, 10)
    let sel = ListSelection.create([ListSelection.range(0, 1)], 0).splitRange(0)

    expect(sel).toBeNull()
  })

  it('removes selection at the edge', () => {
    // (0, 10), remove 4th position ->  (0, 4), (5, 10)
    let sel = ListSelection.create([ListSelection.range(5, 10)], 0).splitRange(9)
    let sel2 = ListSelection.create([ListSelection.range(5, 10)], 0).splitRange(5)

    expect(formatSelection(sel!)).toBe('5/9')
    expect(formatSelection(sel2!)).toBe('6/10')
  })

  it('moves main selection to closest range after split', () => {
    // (0, 10), remove 4th position ->  (0, 4), (5, 10)
    let sel = ListSelection.create([
      ListSelection.range(1, 3),
      ListSelection.range(5, 6),
      ListSelection.range(10, 12)
    ]).splitRange(5)

    expect(formatSelection(sel!)).toBe('1/3,10/12')
    expect(sel?.mainIndex).toBe(0)
  })

  it('extends range when selection inverts down', () => {
    // (5, 6), extends to 2nd item -> (2, 6)
    let sel = ListSelection.create([ListSelection.range(5, 6).extend(2)])

    expect(formatSelection(sel)).toBe('6/2')

    // (5, 7), extends to 2nd item -> (2, 6)
    let sel2 = ListSelection.create([ListSelection.range(5, 7).extend(2)])
    expect(formatSelection(sel2)).toBe('6/2')
  })

  it('extends range when selection inverts up', () => {
    // (4, 6)* (anchor:6, head:4), extends to 7th item -> (5, 8)
    // (4, 6) [4, 5]
    let sel = ListSelection.create([ListSelection.range(6, 4).extend(7)])

    expect(formatSelection(sel)).toBe('5/8')

    // Test edge case when inverted pos == anchor
    let sel2 = ListSelection.create([ListSelection.range(6, 4).extend(6)])

    expect(formatSelection(sel2)).toBe('5/7')
  })

  it('replace range overwrites overlapping ranges', () => {
    let sel = ListSelection.create(
      [ListSelection.range(5, 6), ListSelection.range(10, 12)],
      1
    ).replaceRange(ListSelection.range(10, 12).extend(1))

    expect(formatSelection(sel)).toBe('11/1')

    let sel2 = ListSelection.create(
      [
        ListSelection.range(1, 2),
        ListSelection.range(5, 6),
        ListSelection.range(10, 12),
        ListSelection.range(13, 14)
      ],
      0
    ).replaceRange(ListSelection.range(1, 11))

    expect(formatSelection(sel2)).toBe('1/11,13/14')
  })

  it('preserves the direction of the main range when merging ranges', () => {
    let sel = ListSelection.create([ListSelection.range(0, 2), ListSelection.range(10, 1)])
    expect(formatSelection(sel)).toBe('10/1')

    let sel2 = ListSelection.create([ListSelection.range(3, 4), ListSelection.range(10, 1)])
    expect(formatSelection(sel2)).toBe('10/1')
  })

  it('main range overwrites overlapping', () => {
    let sel3 = ListSelection.create([ListSelection.range(3, 5), ListSelection.range(10, 4)])
    expect(formatSelection(sel3)).toBe('10/4')

    let sel4 = ListSelection.create([ListSelection.range(3, 5), ListSelection.range(10, 4)], 0)
    expect(formatSelection(sel4)).toBe('3/5')
  })

  it('merges ranges that are not main, but overwrites ranges that overlap with  main range ', () => {
    let sel5 = ListSelection.create(
      [
        ListSelection.range(3, 5),
        ListSelection.range(10, 4),
        ListSelection.range(15, 20),
        ListSelection.range(17, 25)
      ],
      2
    )
    expect(formatSelection(sel5)).toBe('3/10,15/20')
  })
})
