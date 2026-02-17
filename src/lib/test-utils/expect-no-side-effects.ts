/**
 * Test assertions for verifying no downstream Supabase mutations occurred.
 *
 * Works with the project's manual jest.mock() chained-stub pattern:
 *
 *   jest.mock('../supabase/client', () => ({
 *     supabase: { from: jest.fn(() => ({ select: jest.fn(...) })) },
 *   }));
 *
 * createMockSupabaseClient() provides a mock that tracks mutation calls
 * so expectNoSideEffects / expectNoInserts / etc. can verify nothing leaked.
 */

type MockFn = jest.Mock;

export interface MockSupabaseClient {
  from: MockFn;
  _mutations: {
    insert: MockFn;
    update: MockFn;
    delete: MockFn;
    upsert: MockFn;
  };
  _chainMethods: {
    select: MockFn;
    eq: MockFn;
    single: MockFn;
    maybeSingle: MockFn;
    order: MockFn;
    limit: MockFn;
    match: MockFn;
  };
}

/**
 * Creates a mock Supabase client that tracks all mutation calls.
 * Compatible with the project's existing chained-method mock pattern.
 */
export function createMockSupabaseClient(): MockSupabaseClient {
  const resolvedData = { data: [], error: null };

  const chainResult = {
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(resolvedData),
    maybeSingle: jest.fn().mockResolvedValue(resolvedData),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    then: jest.fn((cb: (v: unknown) => unknown) => Promise.resolve(cb(resolvedData))),
  };

  // Make all chain methods return the chain for arbitrary chaining
  chainResult.eq.mockReturnValue(chainResult);
  chainResult.order.mockReturnValue(chainResult);
  chainResult.limit.mockReturnValue(chainResult);
  chainResult.match.mockReturnValue(chainResult);
  chainResult.select.mockReturnValue(chainResult);

  const mutations = {
    insert: jest.fn().mockReturnValue(chainResult),
    update: jest.fn().mockReturnValue(chainResult),
    delete: jest.fn().mockReturnValue(chainResult),
    upsert: jest.fn().mockReturnValue(chainResult),
  };

  const tableResult = {
    select: jest.fn().mockReturnValue(chainResult),
    ...mutations,
  };

  return {
    from: jest.fn().mockReturnValue(tableResult),
    _mutations: mutations,
    _chainMethods: {
      select: tableResult.select,
      eq: chainResult.eq,
      single: chainResult.single,
      maybeSingle: chainResult.maybeSingle,
      order: chainResult.order,
      limit: chainResult.limit,
      match: chainResult.match,
    },
  };
}

/**
 * Assert that no mutation methods (.insert, .update, .delete, .upsert)
 * were called on the mock client.
 */
export function expectNoSideEffects(mock: MockSupabaseClient): void {
  const { insert, update, delete: del, upsert } = mock._mutations;
  const called: string[] = [];

  if (insert.mock.calls.length > 0) called.push(`insert (${insert.mock.calls.length} call(s))`);
  if (update.mock.calls.length > 0) called.push(`update (${update.mock.calls.length} call(s))`);
  if (del.mock.calls.length > 0) called.push(`delete (${del.mock.calls.length} call(s))`);
  if (upsert.mock.calls.length > 0) called.push(`upsert (${upsert.mock.calls.length} call(s))`);

  if (called.length > 0) {
    throw new Error(
      `Expected no side effects, but found mutations: ${called.join(', ')}`,
    );
  }
}

/** Assert that no .insert() calls were made. */
export function expectNoInserts(mock: MockSupabaseClient): void {
  const { insert } = mock._mutations;
  if (insert.mock.calls.length > 0) {
    throw new Error(
      `Expected no inserts, but insert was called ${insert.mock.calls.length} time(s)`,
    );
  }
}

/** Assert that no .update() calls were made. */
export function expectNoUpdates(mock: MockSupabaseClient): void {
  const { update } = mock._mutations;
  if (update.mock.calls.length > 0) {
    throw new Error(
      `Expected no updates, but update was called ${update.mock.calls.length} time(s)`,
    );
  }
}

/** Assert that no .delete() calls were made. */
export function expectNoDeletes(mock: MockSupabaseClient): void {
  const { delete: del } = mock._mutations;
  if (del.mock.calls.length > 0) {
    throw new Error(
      `Expected no deletes, but delete was called ${del.mock.calls.length} time(s)`,
    );
  }
}
