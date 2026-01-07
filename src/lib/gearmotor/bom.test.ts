/**
 * BOM Resolver Tests
 *
 * Tests for parsing model_type strings and resolving BOM components.
 * Model type format: "SK [stages]SI[size] - [adapter_code] - [motor_frame]"
 */

import { parseModelType, resolveBomFromMetadata, ParsedModelType } from './bom';

describe('parseModelType', () => {
  // ===========================================================================
  // STANDARD PARSING TESTS
  // ===========================================================================

  describe('standard model_type formats', () => {
    it('parses standard format with 1-stage prefix', () => {
      const result = parseModelType('SK 1SI31 - 56C - 63S/4');

      expect(result).not.toBeNull();
      expect(result?.worm_stages).toBe(1);
      expect(result?.gear_unit_size).toBe('SI31');
      expect(result?.size_code).toBe('31');
      expect(result?.adapter_code).toBe('56C');
      expect(result?.motor_frame).toBe('63S/4');
    });

    it('parses 2-stage model type', () => {
      const result = parseModelType('SK 2SI50 - 140TC - 182T/4');

      expect(result).not.toBeNull();
      expect(result?.worm_stages).toBe(2);
      expect(result?.gear_unit_size).toBe('SI50');
      expect(result?.adapter_code).toBe('140TC');
      expect(result?.motor_frame).toBe('182T/4');
    });

    it('parses model type without stage number (defaults to 1)', () => {
      const result = parseModelType('SK SI63 - 56C - 80S/4');

      expect(result).not.toBeNull();
      expect(result?.worm_stages).toBe(1); // Default
      expect(result?.gear_unit_size).toBe('SI63');
      expect(result?.adapter_code).toBe('56C');
      expect(result?.motor_frame).toBe('80S/4');
    });

    it('parses larger gear unit sizes', () => {
      const result = parseModelType('SK 1SI75 - 180TC - 256T/4');

      expect(result).not.toBeNull();
      expect(result?.gear_unit_size).toBe('SI75');
      expect(result?.size_code).toBe('75');
    });
  });

  // ===========================================================================
  // VARIANT FORMATS (Real CSV data variations)
  // ===========================================================================

  describe('model_type variants from real CSV data', () => {
    it('handles model with LP motor frame', () => {
      const result = parseModelType('SK 1SI63 - 56C - 80LP/4');

      expect(result).not.toBeNull();
      expect(result?.motor_frame).toBe('80LP/4');
    });

    it('handles model with spacing variations', () => {
      // Some catalog entries may have different spacing
      const result1 = parseModelType('SK 1SI31-56C-63S/4'); // No spaces
      const result2 = parseModelType('SK  1SI31  -  56C  -  63S/4'); // Extra spaces

      expect(result1).not.toBeNull();
      expect(result1?.adapter_code).toBe('56C');

      expect(result2).not.toBeNull();
      expect(result2?.adapter_code).toBe('56C');
    });

    it('handles lowercase variant', () => {
      const result = parseModelType('sk 1si31 - 56c - 63s/4');

      expect(result).not.toBeNull();
      expect(result?.gear_unit_size).toBe('SI31');
    });
  });

  // ===========================================================================
  // GRACEFUL FAILURE / FALLBACK
  // ===========================================================================

  describe('graceful failure (no crash)', () => {
    it('returns null for null input', () => {
      expect(parseModelType(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(parseModelType(undefined)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseModelType('')).toBeNull();
    });

    it('returns null for malformed model type', () => {
      expect(parseModelType('RANDOM STRING')).toBeNull();
      expect(parseModelType('NOT A MODEL TYPE')).toBeNull();
      expect(parseModelType('12345')).toBeNull();
    });

    it('returns null for partial model type (missing adapter)', () => {
      expect(parseModelType('SK 1SI31')).toBeNull();
    });

    it('returns null for partial model type (missing motor frame)', () => {
      expect(parseModelType('SK 1SI31 - 56C')).toBeNull();
    });
  });
});

describe('resolveBomFromMetadata', () => {
  // ===========================================================================
  // SYNCHRONOUS BOM RESOLUTION (from metadata)
  // ===========================================================================

  describe('basic BOM resolution', () => {
    it('resolves BOM from parsed_model in metadata', () => {
      const metadata = {
        model_type: 'SK 1SI31 - 56C - 63S/4',
        parsed_model: {
          worm_stages: 1,
          gear_unit_size: 'SI31',
          size_code: '31',
          adapter_code: '56C',
          motor_frame: '63S/4',
        },
      };

      const result = resolveBomFromMetadata(metadata, 0.16);

      expect(result.model_type).toBe('SK 1SI31 - 56C - 63S/4');
      expect(result.parsed).not.toBeNull();
      expect(result.components).toHaveLength(3);

      // Gear unit
      const gearUnit = result.components.find(c => c.component_type === 'gear_unit');
      expect(gearUnit?.part_number).toBe('SI31-0.16HP');
      expect(gearUnit?.found).toBe(true); // Synthetic

      // Motor (needs DB lookup, so found=false)
      const motor = result.components.find(c => c.component_type === 'motor');
      expect(motor?.description).toContain('63S/4');
      expect(motor?.found).toBe(false);

      // Adapter (needs DB lookup)
      const adapter = result.components.find(c => c.component_type === 'adapter');
      expect(adapter?.description).toContain('56C');
      expect(adapter?.found).toBe(false);
    });

    it('falls back to parsing model_type when parsed_model missing', () => {
      const metadata = {
        model_type: 'SK 1SI50 - 140TC - 182T/4',
        // No parsed_model
      };

      const result = resolveBomFromMetadata(metadata, 1.0);

      expect(result.parsed).not.toBeNull();
      expect(result.parsed?.gear_unit_size).toBe('SI50');
      expect(result.parsed?.adapter_code).toBe('140TC');
    });

    it('handles null metadata gracefully', () => {
      const result = resolveBomFromMetadata(null, 1.0);

      expect(result.model_type).toBe('');
      expect(result.parsed).toBeNull();
      expect(result.components).toHaveLength(1);
      expect(result.components[0].found).toBe(false);
    });

    it('handles undefined metadata gracefully', () => {
      const result = resolveBomFromMetadata(undefined, 1.0);

      expect(result.parsed).toBeNull();
      expect(result.complete).toBe(false);
    });

    it('handles empty metadata object', () => {
      const result = resolveBomFromMetadata({}, 1.0);

      expect(result.model_type).toBe('');
      expect(result.parsed).toBeNull();
    });
  });

  // ===========================================================================
  // BOM COMPONENT PART NUMBERS
  // ===========================================================================

  describe('gear unit part number format', () => {
    it('formats gear unit part number as SIZE-HP', () => {
      const metadata = {
        model_type: 'SK 1SI63 - 56C - 80S/4',
        parsed_model: {
          worm_stages: 1,
          gear_unit_size: 'SI63',
          size_code: '63',
          adapter_code: '56C',
          motor_frame: '80S/4',
        },
      };

      const result = resolveBomFromMetadata(metadata, 0.5);

      const gearUnit = result.components.find(c => c.component_type === 'gear_unit');
      expect(gearUnit?.part_number).toBe('SI63-0.5HP');
    });

    it('handles various HP values in part number', () => {
      const metadata = {
        parsed_model: { gear_unit_size: 'SI31' } as ParsedModelType,
      };

      expect(resolveBomFromMetadata(metadata, 0.16).components[0].part_number).toBe('SI31-0.16HP');
      expect(resolveBomFromMetadata(metadata, 1.0).components[0].part_number).toBe('SI31-1HP');
      expect(resolveBomFromMetadata(metadata, 2.5).components[0].part_number).toBe('SI31-2.5HP');
    });
  });

  // ===========================================================================
  // MOTOR STD vs BRK SELECTION (future)
  // ===========================================================================

  describe('motor variant selection', () => {
    // Note: Full motor variant selection requires DB lookup.
    // These tests document expected behavior for future implementation.

    it('includes motor_frame in description', () => {
      const metadata = {
        parsed_model: {
          worm_stages: 1,
          gear_unit_size: 'SI31',
          size_code: '31',
          adapter_code: '56C',
          motor_frame: '63S/4',
        },
      };

      const result = resolveBomFromMetadata(metadata, 0.16);
      const motor = result.components.find(c => c.component_type === 'motor');

      expect(motor?.description).toContain('63S/4');
      expect(motor?.description).toContain('0.16HP');
    });
  });

  // ===========================================================================
  // ADAPTER RESOLUTION
  // ===========================================================================

  describe('adapter resolution', () => {
    it('includes adapter_code in description', () => {
      const metadata = {
        parsed_model: {
          worm_stages: 1,
          gear_unit_size: 'SI50',
          size_code: '50',
          adapter_code: '140TC',
          motor_frame: '182T/4',
        },
      };

      const result = resolveBomFromMetadata(metadata, 1.5);
      const adapter = result.components.find(c => c.component_type === 'adapter');

      expect(adapter?.description).toContain('140TC');
    });

    it('uses correct description format for adapter', () => {
      const metadata = {
        parsed_model: {
          worm_stages: 1,
          gear_unit_size: 'SI31',
          size_code: '31',
          adapter_code: '56C',
          motor_frame: '63S/4',
        },
      };

      const result = resolveBomFromMetadata(metadata, 0.16);
      const adapter = result.components.find(c => c.component_type === 'adapter');

      expect(adapter?.description).toBe('NEMA 56C Adapter');
    });
  });
});
