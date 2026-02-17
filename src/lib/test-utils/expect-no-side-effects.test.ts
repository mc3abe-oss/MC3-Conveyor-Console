import {
  createMockSupabaseClient,
  expectNoSideEffects,
  expectNoInserts,
  expectNoUpdates,
  expectNoDeletes,
} from './expect-no-side-effects';

describe('expectNoSideEffects', () => {
  describe('createMockSupabaseClient', () => {
    it('creates a mock with from(), select(), and mutation methods', () => {
      const mock = createMockSupabaseClient();
      expect(mock.from).toBeDefined();
      expect(mock._mutations.insert).toBeDefined();
      expect(mock._mutations.update).toBeDefined();
      expect(mock._mutations.delete).toBeDefined();
      expect(mock._mutations.upsert).toBeDefined();
    });

    it('supports chained query patterns', async () => {
      const mock = createMockSupabaseClient();
      const result = await mock.from('recipes').select('*').eq('id', '123').single();
      expect(result).toEqual({ data: [], error: null });
    });
  });

  describe('expectNoSideEffects', () => {
    it('passes when no mutation methods were called', () => {
      const mock = createMockSupabaseClient();
      mock.from('recipes').select('*');
      expect(() => expectNoSideEffects(mock)).not.toThrow();
    });

    it('fails when insert was called', () => {
      const mock = createMockSupabaseClient();
      mock.from('recipes').insert({ name: 'test' });
      expect(() => expectNoSideEffects(mock)).toThrow(
        /Expected no side effects.*insert/,
      );
    });

    it('fails when update was called', () => {
      const mock = createMockSupabaseClient();
      mock.from('recipes').update({ name: 'updated' });
      expect(() => expectNoSideEffects(mock)).toThrow(
        /Expected no side effects.*update/,
      );
    });

    it('fails when delete was called', () => {
      const mock = createMockSupabaseClient();
      mock.from('recipes').delete();
      expect(() => expectNoSideEffects(mock)).toThrow(
        /Expected no side effects.*delete/,
      );
    });

    it('fails when upsert was called', () => {
      const mock = createMockSupabaseClient();
      mock.from('recipes').upsert({ id: '1', name: 'test' });
      expect(() => expectNoSideEffects(mock)).toThrow(
        /Expected no side effects.*upsert/,
      );
    });

    it('reports all mutations in error message', () => {
      const mock = createMockSupabaseClient();
      mock.from('a').insert({ x: 1 });
      mock.from('b').update({ x: 2 });
      expect(() => expectNoSideEffects(mock)).toThrow(/insert.*update/);
    });

    it('includes call count in error message', () => {
      const mock = createMockSupabaseClient();
      mock.from('a').insert({ x: 1 });
      mock.from('b').insert({ x: 2 });
      expect(() => expectNoSideEffects(mock)).toThrow(/insert \(2 call\(s\)\)/);
    });
  });

  describe('targeted variants', () => {
    it('expectNoInserts passes when only update was called', () => {
      const mock = createMockSupabaseClient();
      mock.from('recipes').update({ name: 'updated' });
      expect(() => expectNoInserts(mock)).not.toThrow();
    });

    it('expectNoInserts fails when insert was called', () => {
      const mock = createMockSupabaseClient();
      mock.from('recipes').insert({ name: 'new' });
      expect(() => expectNoInserts(mock)).toThrow(/Expected no inserts/);
    });

    it('expectNoUpdates passes when only insert was called', () => {
      const mock = createMockSupabaseClient();
      mock.from('recipes').insert({ name: 'new' });
      expect(() => expectNoUpdates(mock)).not.toThrow();
    });

    it('expectNoUpdates fails when update was called', () => {
      const mock = createMockSupabaseClient();
      mock.from('recipes').update({ name: 'changed' });
      expect(() => expectNoUpdates(mock)).toThrow(/Expected no updates/);
    });

    it('expectNoDeletes passes when only insert was called', () => {
      const mock = createMockSupabaseClient();
      mock.from('recipes').insert({ name: 'new' });
      expect(() => expectNoDeletes(mock)).not.toThrow();
    });

    it('expectNoDeletes fails when delete was called', () => {
      const mock = createMockSupabaseClient();
      mock.from('recipes').delete();
      expect(() => expectNoDeletes(mock)).toThrow(/Expected no deletes/);
    });
  });
});
