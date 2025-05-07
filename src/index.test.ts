import {
  ListSelection,
  SvelteList,
  SvelteListItem,
  type Content,
  SelectionRange,
} from './lib/list.js'
import { describe, it, expect } from 'vitest'

const formatSelection = (sel: ListSelection) =>
  sel.ranges.map((r) => r.anchor + '/' + r.head).join(',')

describe('ListSelection', () => {
  it('stores ranges with a primary range', () => {
    const sel = ListSelection.create(
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
    const sel = ListSelection.create([
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
    const sel = ListSelection.create([
      ListSelection.range(10, 12),
      ListSelection.range(12, 13),
      ListSelection.range(12, 13),
      ListSelection.range(10, 11),
      ListSelection.range(8, 10)
    ])
    expect(formatSelection(sel)).toBe('8/13')
  })

  it('splits range into two', () => {
    const sel = ListSelection.create([ListSelection.range(0, 10)], 0).splitRange(4)

    expect(sel).toBeTruthy()
    expect(formatSelection(sel!)).toBe('0/4,5/10')
  })

  it('removes selection after last split', () => {
    const sel = ListSelection.create([ListSelection.range(0, 1)], 0).splitRange(0)

    expect(sel).toBeNull()
  })

  it('removes selection at the edge', () => {
    const sel = ListSelection.create([ListSelection.range(5, 10)], 0).splitRange(9)
    const sel2 = ListSelection.create([ListSelection.range(5, 10)], 0).splitRange(5)

    expect(formatSelection(sel!)).toBe('5/9')
    expect(formatSelection(sel2!)).toBe('6/10')
  })

  it('moves main selection to closest range after split', () => {
    const sel = ListSelection.create([
      ListSelection.range(1, 3),
      ListSelection.range(5, 6),
      ListSelection.range(10, 12)
    ]).splitRange(5)

    expect(formatSelection(sel!)).toBe('1/3,10/12')
    expect(sel?.mainIndex).toBe(0)
  })

  it('extends range when selection inverts down', () => {
    // (5, 6), extends to 2nd item -> (2, 6)
    const sel = ListSelection.create([ListSelection.range(5, 6).extend(2)])

    expect(formatSelection(sel)).toBe('6/2')

    // (5, 7), extends to 2nd item -> (2, 6)
    const sel2 = ListSelection.create([ListSelection.range(5, 7).extend(2)])
    expect(formatSelection(sel2)).toBe('6/2')
  })

  it('extends range when selection inverts up', () => {
    // (4, 6)* (anchor:6, head:4), extends to 7th item -> (5, 8)
    // (4, 6) [4, 5]
    const sel = ListSelection.create([ListSelection.range(6, 4).extend(7)])

    expect(formatSelection(sel)).toBe('5/8')

    // Test edge case when inverted pos == anchor
    const sel2 = ListSelection.create([ListSelection.range(6, 4).extend(6)])

    expect(formatSelection(sel2)).toBe('5/7')
  })

  it('replace range overwrites overlapping ranges', () => {
    const sel = ListSelection.create(
      [ListSelection.range(5, 6), ListSelection.range(10, 12)],
      1
    ).replaceRange(ListSelection.range(10, 12).extend(1))

    expect(formatSelection(sel)).toBe('11/1')

    const sel2 = ListSelection.create(
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
    const sel = ListSelection.create([ListSelection.range(0, 2), ListSelection.range(10, 1)])
    expect(formatSelection(sel)).toBe('10/1')

    const sel2 = ListSelection.create([ListSelection.range(3, 4), ListSelection.range(10, 1)])
    expect(formatSelection(sel2)).toBe('10/1')
  })

  it('main range overwrites overlapping', () => {
    const sel3 = ListSelection.create([ListSelection.range(3, 5), ListSelection.range(10, 4)])
    expect(formatSelection(sel3)).toBe('10/4')

    const sel4 = ListSelection.create([ListSelection.range(3, 5), ListSelection.range(10, 4)], 0)
    expect(formatSelection(sel4)).toBe('3/5')
  })

  it('merges ranges that are not main, but overwrites ranges that overlap with main range', () => {
    const sel5 = ListSelection.create(
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

  it('merges touching range with main range', () => {
    const sel5 = ListSelection.create(
      [ListSelection.range(3, 5), ListSelection.range(10, 5), ListSelection.range(10, 15)],
      1
    )
    expect(formatSelection(sel5)).toBe('15/3')
  })

  it('updates selection after insert', () => {
    const data = [{ id: '1' }, { id: '2' }]

    const list = new SvelteList(data, (item) => ({ content: { id: item.id } }))
    list.select(ListSelection.single(1))
    list.insert({ id: '0' }, 0)

    expect(formatSelection(list.selection!)).toBe('2/3')
  })

  it('splits selection when inserting in the middle of selection', () => {
    const data = [{ id: '1' }, { id: '2' }]

    const list = new SvelteList(data, (item) => ({ content: { id: item.id } }))
    list.select(ListSelection.create([ListSelection.range(0, 2)]))
    list.insert({ id: '0' }, 1)

    expect(formatSelection(list.selection!)).toBe('0/1,2/3')
  })

  it('adjusts selection after remove', () => {
    const data = [{ id: '1' }, { id: '2' }, { id: '3' }]

    const list = new SvelteList(data, (item) => ({ content: { id: item.id } }))
    list.select(ListSelection.single(2))
    list.remove('2')

    expect(formatSelection(list.selection!)).toBe('1/2')
  })

  it('merges selection after remove', () => {
    const data = [{ id: '1' }, { id: '2' }, { id: '3' }]

    const list = new SvelteList(data, (item) => ({ content: { id: item.id } }))
    list.select(ListSelection.create([ListSelection.range(0, 1), ListSelection.range(2, 3)]))
    list.remove('2')

    expect(formatSelection(list.selection!)).toBe('0/2')
  })

  it('shifts selection to next item when removing from the end (single selection)', () => {
    const data = [{ id: '1' }, { id: '2' }, { id: '3' }]

    const list = new SvelteList(data, (item) => ({ content: { id: item.id } }), {
      selection: 'single'
    })
    list.select(ListSelection.create([ListSelection.range(2, 3)]))
    list.remove('3')

    expect(formatSelection(list.selection!)).toBe('1/2')
  })

  it('sets selection to null when removing last item (single selection)', () => {
    const data = [{ id: '1' }]

    const list = new SvelteList(data, (item) => ({ content: { id: item.id } }), {
      selection: 'single'
    })
    list.select(ListSelection.create([ListSelection.range(0, 1)]))
    list.remove('1')

    expect(list.selection).toBeNull()
  })

  it('throws error when selecting multiple items in single selection mode', () => {
    const data = [{ id: '1' }, { id: '2' }, { id: '3' }]
    const list = new SvelteList(data, (item) => ({ content: { id: item.id } }), {
      selection: 'single'
    })

    const multiSelection = ListSelection.create([ListSelection.range(0, 2)])
    expect(() => list.select(multiSelection)).toThrow(RangeError)
    expect(() => list.select(multiSelection)).toThrow(
      "Selection must be a single item or null when the selection option is configured as 'single'."
    )
  })

  it('keeps selection after remove (single selection)', () => {
    const data = [{ id: '1' }, { id: '2' }, { id: '3' }]

    const list = new SvelteList(data, (item) => ({ content: { id: item.id } }), {
      selection: 'single'
    })
    list.select(ListSelection.create([ListSelection.range(1, 2)]))
    list.remove('2')

    expect(formatSelection(list.selection!)).toBe('1/2')
  })

  it('moves focus to next item after removing focused item (single selection)', () => {
    // TODO: test this in Playwright
  })

  it('removes the overlapping part of the selection with removeFrom', () => {
    const data = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }]

    const list = new SvelteList(data, (item) => ({ content: { id: item.id } }))
    list.select(ListSelection.create([ListSelection.range(0, 1), ListSelection.range(3, 5)]))

    // result [1s, 2, 3, 4s, 5s]
    // result [1s, 2, *, *, 5s]
    // result [1s, 2, 5s]  -> 0/1,2/3
    list.removeFrom(2, 4)
    expect(formatSelection(list.selection!)).toBe('0/1,2/3')
    expect(list.selection!.main.anchor).toBe(2)
  })

  it('removes entire selection and sets it to null ', () => {
    const data = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }]

    const list = new SvelteList(data, (item) => ({ content: { id: item.id } }))
    list.select(ListSelection.create([ListSelection.range(0, 1), ListSelection.range(3, 5)]))

    list.removeFrom(ListSelection.create([ListSelection.range(0, 1), ListSelection.range(3, 5)])) // result [2, 3]
    expect(list.selection).toBeNull()
    expect(serializeItems(list.items)).toBe('2,3')
  })

  it('keeps main index at 0 after selection is removed', () => {
    const data = [
      { id: '1' },
      { id: '2' },
      { id: '3' },
      { id: '4' },
      { id: '5' },
      { id: '6' },
      { id: '7' },
      { id: '8' },
      { id: '9' },
      { id: '10' }
    ]

    const list = new SvelteList(data, (item) => ({ content: { id: item.id } }))
    list.select(
      ListSelection.create(
        [ListSelection.range(1, 3), ListSelection.range(4, 5), ListSelection.range(7, 8)],
        0
      )
    )

    list.removeFrom(ListSelection.create([ListSelection.range(1, 4)])) // result [0, 4s, 5, 6, 7s, 8, 9, 10]
    expect(list.selection!.mainIndex).toBe(0)
    expect(formatSelection(list.selection!)).toBe('1/2,4/5')
  })
})

const serializeItems = (items: SvelteListItem<Content>[]) => {
  return items.map((item) => item.content.id).join(',')
}

describe('SvelteList', () => {
  it('adds item', () => {
    const data = [{ id: '1' }, { id: '2' }]

    const list = new SvelteList(data, (item) => ({ content: { id: item.id } }))
    list.add({ id: '3' })

    expect(serializeItems(list.items)).toBe('1,2,3')
  })

  it('inserts item', () => {
    const data = [{ id: '1' }, { id: '2' }]

    const list = new SvelteList(data, (item) => ({ content: { id: item.id } }))
    list.insert({ id: '3' }, 1)

    expect(serializeItems(list.items)).toBe('1,3,2')
  })

  it('removes item', () => {
    const data = [{ id: '1' }, { id: '2' }]

    const list = new SvelteList(data, (item) => ({ content: { id: item.id } }))
    list.remove('2')

    expect(serializeItems(list.items)).toBe('1')
  })

  it('removes items from to', () => {
    const data = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }]

    const list = new SvelteList(data, (item) => ({ content: { id: item.id } }))
    list.removeFrom(1, 3)

    expect(serializeItems(list.items)).toBe('1,4')
  })
})

describe('ListSelection - subtract method', () => {
  it('handles case 1: cuts off the end', () => {
    const range1 = ListSelection.range(4, 10)
    const range2 = ListSelection.range(6, 12)
    const result = range1.subtract(range2)

    expect(result).toBeInstanceOf(SelectionRange)

    // Expected result is (4, 6) since the overlap cuts off the end
    expect(formatSelection(ListSelection.create([result as SelectionRange]))).toBe('4/6')
  })

  it('handles case 2: cuts off the middle and produces two ranges', () => {
    const range1 = ListSelection.range(4, 10)
    const range2 = ListSelection.range(6, 8)
    const result = range1.subtract(range2)

    // Assert that result is an array of two SelectionRange objects
    expect(Array.isArray(result)).toBe(true)
    const [r1, r2] = result as [SelectionRange, SelectionRange]
    expect(r1).toBeInstanceOf(SelectionRange)
    expect(r2).toBeInstanceOf(SelectionRange)

    // Expected result is two ranges: (4, 6) and (8, 10)
    expect(formatSelection(ListSelection.create([r1, r2]))).toBe('4/6,8/10')
  })

  it('handles case 3: cuts off the start', () => {
    const range1 = ListSelection.range(4, 10)
    const range2 = ListSelection.range(2, 6)
    const result = range1.subtract(range2)

    expect(result).toBeInstanceOf(SelectionRange)

    // Expected result is (6, 10) since the overlap removes the start
    expect(formatSelection(ListSelection.create([result as SelectionRange]))).toBe('6/10')
  })

  it('handles case 4: removes the entire range when other fully overlaps the  range', () => {
    const range1 = ListSelection.range(4, 10)
    const range2 = ListSelection.range(4, 10)
    const result = range1.subtract(range2)

    // Assert that result is null since the full range is removed
    expect(result).toBeNull()
  })

  it('handles case 5: remains unchanged when there is no overlap', () => {
    const range1 = ListSelection.range(4, 10)
    const range2 = ListSelection.range(12, 14)
    const result = range1.subtract(range2)

    // Assert that result is of type SelectionRange
    expect(result).not.toBeNull()
    expect(Array.isArray(result)).toBe(false)
    expect(result).toBeInstanceOf(SelectionRange)

    // Expected result is the original range since there is no overlap
    expect(formatSelection(ListSelection.create([result as SelectionRange]))).toBe('4/10')
  })
})

describe('SvelteList.move', () => {
  const build = (n: number) =>
    new SvelteList(
      Array.from({ length: n }, (_, i) => ({ id: String(i + 1) })),
      (item) => ({ content: { id: item.id } })
    )

  it('moves a single item downwards', () => {
    // 1,2,3,4  ->  2,3,1,4
    const list = build(4)
    list.move(0, 2)

    expect(serializeItems(list.items)).toBe('2,3,1,4')

    // 1,2,3,4,5  ->  2,3,4,5,1,6
    const list2 = build(6)
    list2.move(0, 4)

    expect(serializeItems(list2.items)).toBe('2,3,4,5,1,6')
  })

  it('moves a single item upwards', () => {
    // 1,2,3,4  ->  1,4,2,3
    const list = build(4)
    list.move(3, 1)

    expect(serializeItems(list.items)).toBe('1,4,2,3')
    expect(list.selection).toBe(null)
  })

  it('moves a contiguous block (selection) to the end', () => {
    // 1,[2,3],4,5  ->  1,4,5,[2,3]
    const list = build(5)
    const sel = ListSelection.create([ListSelection.range(1, 3)])

    list.move(sel, 4) // “to” is the last index

    expect(serializeItems(list.items)).toBe('1,4,5,2,3')
  })

  it('moves a contiguous block to the start', () => {
    // 1,2,[3,4],5  ->  [3,4],1,2,5
    const list = build(5)
    const sel = ListSelection.create([ListSelection.range(2, 4)])

    list.move(sel, 0)

    expect(serializeItems(list.items)).toBe('3,4,1,2,5')
  })

  it('throws out of bounds error', () => {
    // 1,2,[3,4],5  ->  [3,4],1,2,5
    const list = build(5)

    expect(() => list.move(0, 7)).toThrow(
      "`to` is out of bounds"
    )

    expect(() => list.move(-1, 3)).toThrow(
      "`from` is out of bounds"
    )
  })

  it('moves a contiguous block (selection) to index 6 visually', () => {
    // [1, 2], 3, 4, 5, 6, 7, 8 -> 3, 4, 5, 6, 7, [1, 2], 8
    const list = build(8)
    const sel = ListSelection.create([ListSelection.range(0, 2)])
    list.select(sel)

    list.move(sel, 6)

    expect(serializeItems(list.items)).toBe('3,4,5,6,7,1,2,8')
    expect(formatSelection(list.selection!)).toBe('5/7')
  })

  it('moves a non-contiguous selection to start', () => {
    // [1, 2] 3, [4, 5] -> [1, 2, 4, 5], 3
    const list = build(5)
    const sel = ListSelection.create([ListSelection.range(0, 2), ListSelection.range(3, 5)])
    list.select(sel)
    list.move(sel, 0)

    expect(serializeItems(list.items)).toBe('1,2,4,5,3')
    expect(formatSelection(list.selection!)).toBe('0/4')
  })

  it('moves a non-contiguous selection to end', () => {
    // [1, 2] 3, [4, 5] -> 3, [1, 2, 4, 5]
    const list = build(5)
    const sel = ListSelection.create([ListSelection.range(0, 2), ListSelection.range(3, 5)])
    list.select(sel)
    list.move(sel, 2)

    expect(serializeItems(list.items)).toBe('3,1,2,4,5')
    expect(formatSelection(list.selection!)).toBe('1/5')
  })

  it('keeps the item at the same position when moved to the same position', () => {
    // 1,2,3,4  ->  1,2,3,4
    const list = build(4)
    list.move(2, 2)

    expect(serializeItems(list.items)).toBe('1,2,3,4')

    // Same but with selection
    const list2 = build(4)
    // 1,2,[3],4  ->  1,2,[3],4
    const sel = ListSelection.create([ListSelection.range(2, 3)])
    list2.select(sel)
    list2.move(sel, 3)
    
    expect(serializeItems(list.items)).toBe('1,2,3,4')
  })
  
   it('preserves an existing single‑item selection when another item is moved', () => {
    // initial 1,2,[3],4,5  (select “3”)
    const list = build(5)
    list.select(ListSelection.single(2))

    // move first item “1” to the end → 2,3,4,5,1
    list.move(0, 5)

    expect(serializeItems(list.items)).toBe('2,3,4,5,1')
    // “3” was at index 2, now at index 1 → selection (1,2)
    expect(formatSelection(list.selection!)).toBe('1/2')
  })
})