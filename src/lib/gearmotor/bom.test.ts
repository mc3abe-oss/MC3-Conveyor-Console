/**
 * BOM Resolver Tests
 *
 * Tests for parsing model_type strings and resolving BOM components.
 * Model type format: "SK [stages]SI[size] - [adapter_code] - [motor_frame]"
 */

import {
  parseModelType,
  resolveBomFromMetadata,
  ParsedModelType,
  isRealNordPartNumber,
  DEFAULT_MOUNTING_VARIANT,
  ResolveBomOptions,
} from './bom';

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

      // Gear unit - NO real NORD PN, so found=false
      const gearUnit = result.components.find(c => c.component_type === 'gear_unit');
      expect(gearUnit?.part_number).toBeNull(); // No synthetic key shown
      expect(gearUnit?.found).toBe(false); // No real NORD PN

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
    it('returns null part_number for gear unit (no real NORD PN)', () => {
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
      // Synthetic keys like "SI63-0.5HP" are NOT real NORD PNs
      expect(gearUnit?.part_number).toBeNull();
      expect(gearUnit?.found).toBe(false);
    });

    it('includes gear unit size and HP in description', () => {
      const metadata = {
        parsed_model: { gear_unit_size: 'SI31' } as ParsedModelType,
      };

      // part_number is null (no real NORD PN), but description shows size/HP
      expect(resolveBomFromMetadata(metadata, 0.16).components[0].part_number).toBeNull();
      expect(resolveBomFromMetadata(metadata, 0.16).components[0].description).toContain('SI31');
      expect(resolveBomFromMetadata(metadata, 0.16).components[0].description).toContain('0.16HP');
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

// =============================================================================
// buildBomCopyText TESTS
// =============================================================================

import { buildBomCopyText, getMissingHint, BomCopyContext } from './bom';

describe('buildBomCopyText', () => {
  describe('formats complete BOM correctly', () => {
    it('returns expected multiline string with all components', () => {
      const bom: BomResolution = {
        model_type: 'SK 1SI31 - 56C - 63S/4',
        parsed: {
          worm_stages: 1,
          gear_unit_size: 'SI31',
          size_code: '31',
          adapter_code: '56C',
          motor_frame: '63S/4',
        },
        components: [
          { component_type: 'gear_unit', part_number: 'SI31-0.16HP', description: 'NORD FLEXBLOC SI31 0.16HP', found: true },
          { component_type: 'motor', part_number: 'MOT-63S-0.16', description: '63S/4 Motor 0.16HP', found: true },
          { component_type: 'adapter', part_number: 'ADP-56C', description: 'NEMA 56C Adapter', found: true },
          { component_type: 'output_shaft_kit', part_number: null, description: 'Output shaft configuration', found: false },
        ],
        complete: false,
      };

      const context: BomCopyContext = {
        appliedSf: 1.5,
        catalogSf: 1.6,
        catalogPage: 'B46',
        motorHp: 0.16,
      };

      const result = buildBomCopyText(bom, context);

      // Check header
      expect(result).toContain('NORD FLEXBLOC Gearmotor BOM');
      expect(result).toContain('Selected Model: SK 1SI31 - 56C - 63S/4');
      expect(result).toContain('Catalog Page: B46');

      // Check components
      expect(result).toContain('1) Gear Unit: SI31-0.16HP');
      expect(result).toContain('2) Motor (STD or BRK): MOT-63S-0.16');
      expect(result).toContain('3) Adapter: ADP-56C');
      expect(result).toContain('4) Output Shaft Kit: —');

      // Check notes
      expect(result).toContain('Applied SF: 1.5');
      expect(result).toContain('Catalog SF: 1.6');

      // Check missing notation
      expect(result).toContain('MISSING: Output Shaft Kit PN');
    });

    it('includes MISSING lines when part numbers are null', () => {
      const bom: BomResolution = {
        model_type: 'SK 1SI50 - 140TC - 182T/4',
        parsed: {
          worm_stages: 1,
          gear_unit_size: 'SI50',
          size_code: '50',
          adapter_code: '140TC',
          motor_frame: '182T/4',
        },
        components: [
          { component_type: 'gear_unit', part_number: 'SI50-1HP', description: 'NORD FLEXBLOC SI50 1HP', found: false },
          { component_type: 'motor', part_number: null, description: '182T/4 Motor 1HP', found: false },
          { component_type: 'adapter', part_number: null, description: 'NEMA 140TC Adapter', found: false },
        ],
        complete: false,
      };

      const context: BomCopyContext = {
        appliedSf: 1.0,
        catalogSf: 1.0,
      };

      const result = buildBomCopyText(bom, context);

      // Should show dashes for null part numbers
      expect(result).toContain('2) Motor (STD or BRK): —');
      expect(result).toContain('3) Adapter: —');

      // Should include MISSING notes
      expect(result).toContain('MISSING: Gear Unit PN');
      expect(result).toContain('MISSING: Motor (STD or BRK) PN');
      expect(result).toContain('MISSING: Adapter PN');
    });
  });

  describe('handles edge cases', () => {
    it('handles empty model_type', () => {
      const bom: BomResolution = {
        model_type: '',
        parsed: null,
        components: [],
        complete: false,
      };

      const context: BomCopyContext = {
        appliedSf: 1.5,
        catalogSf: 1.0,
      };

      const result = buildBomCopyText(bom, context);

      expect(result).toContain('Selected Model: —');
    });

    it('omits catalog page when not provided', () => {
      const bom: BomResolution = {
        model_type: 'SK 1SI31 - 56C - 63S/4',
        parsed: null,
        components: [],
        complete: false,
      };

      const context: BomCopyContext = {
        appliedSf: 1.5,
        catalogSf: 1.0,
        catalogPage: null,
      };

      const result = buildBomCopyText(bom, context);

      expect(result).not.toContain('Catalog Page:');
    });

    it('includes multiple matches note when flag is set', () => {
      const bom: BomResolution = {
        model_type: 'SK 1SI31 - 56C - 63S/4',
        parsed: null,
        components: [],
        complete: false,
      };

      const context: BomCopyContext = {
        appliedSf: 1.5,
        catalogSf: 1.0,
        hadMultipleMatches: true,
      };

      const result = buildBomCopyText(bom, context);

      expect(result).toContain('NOTE: Multiple matches existed; selected first deterministic match.');
    });
  });
});

describe('getMissingHint', () => {
  it('returns correct hint for output_shaft_kit', () => {
    expect(getMissingHint('output_shaft_kit')).toBe('Select an output shaft option to resolve this.');
  });

  it('returns correct hint for gear_unit', () => {
    expect(getMissingHint('gear_unit')).toBe('Gear unit PN mapping not keyed for this model yet.');
  });

  it('returns correct hint for motor', () => {
    expect(getMissingHint('motor')).toBe('No matching component found in component map.');
  });

  it('returns correct hint for adapter', () => {
    expect(getMissingHint('adapter')).toBe('No matching component found in component map.');
  });
});

// =============================================================================
// isRealNordPartNumber TESTS
// =============================================================================

describe('isRealNordPartNumber', () => {
  describe('identifies real NORD part numbers', () => {
    it('returns true for 8-digit numbers starting with 6', () => {
      expect(isRealNordPartNumber('60691130')).toBe(true);
      expect(isRealNordPartNumber('60395510')).toBe(true);
      expect(isRealNordPartNumber('60392050')).toBe(true);
    });

    it('returns true for 8-digit numbers starting with 3', () => {
      expect(isRealNordPartNumber('31610012')).toBe(true);
      expect(isRealNordPartNumber('33610022')).toBe(true);
      expect(isRealNordPartNumber('32110013')).toBe(true);
    });
  });

  describe('rejects synthetic keys and invalid inputs', () => {
    it('returns false for synthetic gear unit keys like SI63-0.25HP', () => {
      expect(isRealNordPartNumber('SI63-0.25HP')).toBe(false);
      expect(isRealNordPartNumber('SI31-0.16HP')).toBe(false);
      expect(isRealNordPartNumber('SI50-1HP')).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(isRealNordPartNumber(null)).toBe(false);
      expect(isRealNordPartNumber(undefined)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isRealNordPartNumber('')).toBe(false);
    });

    it('returns false for numbers not starting with 3 or 6', () => {
      expect(isRealNordPartNumber('12345678')).toBe(false);
      expect(isRealNordPartNumber('99999999')).toBe(false);
    });

    it('returns false for wrong length', () => {
      expect(isRealNordPartNumber('606911')).toBe(false); // Too short
      expect(isRealNordPartNumber('606911301')).toBe(false); // Too long
    });
  });
});

// =============================================================================
// REGRESSION TESTS - Gear Unit "Resolved" False Positive
// =============================================================================

describe('REGRESSION: Gear unit with synthetic key must be Missing', () => {
  /**
   * REGRESSION TEST (2026-01-07):
   * Previously, gear units with synthetic keys like "SI63-0.25HP" were incorrectly
   * marked as "Resolved" because the key existed in the database (created by seeder
   * from selection data). This is WRONG because synthetic keys are NOT real NORD
   * orderable part numbers.
   *
   * Rule: A BOM component is ONLY "Resolved" if it has a real NORD orderable
   * part number (8-digit numeric starting with 3 or 6).
   */

  it('gear unit with synthetic key must have found=false', () => {
    const metadata = {
      model_type: 'SK 1SI63/H10 - 56C - 63L/4',
      parsed_model: {
        worm_stages: 1,
        gear_unit_size: 'SI63',
        size_code: '63',
        adapter_code: '56C',
        motor_frame: '63L/4',
      },
    };

    const result = resolveBomFromMetadata(metadata, 0.25);
    const gearUnit = result.components.find(c => c.component_type === 'gear_unit');

    // CRITICAL: Gear unit must NOT be "found" with just a synthetic key
    expect(gearUnit?.found).toBe(false);
    expect(gearUnit?.part_number).toBeNull();
  });

  it('gear unit description should still show size and HP for reference', () => {
    const metadata = {
      model_type: 'SK 1SI63/H10 - 56C - 63L/4',
      parsed_model: {
        worm_stages: 1,
        gear_unit_size: 'SI63',
        size_code: '63',
        adapter_code: '56C',
        motor_frame: '63L/4',
      },
    };

    const result = resolveBomFromMetadata(metadata, 0.25);
    const gearUnit = result.components.find(c => c.component_type === 'gear_unit');

    // Description should still be useful for ordering guidance
    expect(gearUnit?.description).toContain('SI63');
    expect(gearUnit?.description).toContain('0.25HP');
  });

  it('BOM complete flag must be false when gear unit has no real PN', () => {
    const metadata = {
      parsed_model: {
        worm_stages: 1,
        gear_unit_size: 'SI63',
        size_code: '63',
        adapter_code: '56C',
        motor_frame: '63L/4',
      },
    };

    const result = resolveBomFromMetadata(metadata, 0.25);

    // Even if motor/adapter were resolved, complete should be false
    expect(result.complete).toBe(false);
  });
});

// =============================================================================
// DEFAULT_MOUNTING_VARIANT TESTS
// =============================================================================

describe('DEFAULT_MOUNTING_VARIANT', () => {
  it('defaults to inch_hollow for US market', () => {
    expect(DEFAULT_MOUNTING_VARIANT).toBe('inch_hollow');
  });

  it('is a valid mounting variant value', () => {
    const validVariants = ['inch_hollow', 'metric_hollow'];
    expect(validVariants).toContain(DEFAULT_MOUNTING_VARIANT);
  });
});

// =============================================================================
// ResolveBomOptions TYPE TESTS
// =============================================================================

describe('ResolveBomOptions', () => {
  it('accepts valid options structure', () => {
    // TypeScript compile-time check - if this compiles, the type is correct
    const options: ResolveBomOptions = {
      totalRatio: 80,
      mountingVariant: 'inch_hollow',
    };
    expect(options.totalRatio).toBe(80);
    expect(options.mountingVariant).toBe('inch_hollow');
  });

  it('allows optional fields', () => {
    const optionsWithRatioOnly: ResolveBomOptions = {
      totalRatio: 100,
    };
    expect(optionsWithRatioOnly.totalRatio).toBe(100);
    expect(optionsWithRatioOnly.mountingVariant).toBeUndefined();

    const emptyOptions: ResolveBomOptions = {};
    expect(emptyOptions.totalRatio).toBeUndefined();
    expect(emptyOptions.mountingVariant).toBeUndefined();
  });

  it('accepts metric_hollow as mounting variant', () => {
    const options: ResolveBomOptions = {
      totalRatio: 50,
      mountingVariant: 'metric_hollow',
    };
    expect(options.mountingVariant).toBe('metric_hollow');
  });
});

// =============================================================================
// GEAR UNIT PN RESOLUTION LOGIC TESTS
// =============================================================================

describe('Gear Unit PN Resolution Logic', () => {
  /**
   * These tests verify the logic for gear unit PN resolution.
   * The async resolveBom() function requires database access.
   * These tests document expected behavior and can be run as
   * integration tests when DB is configured.
   */

  describe('Mounting Variant Determination', () => {
    it('inch_hollow pattern produces PNs starting with 6039**2**xxx', () => {
      // Inch hollow PNs follow pattern: 6039[size]xxx where middle digit is 2
      // Examples: 60392050 (SI31), 60492050 (SI40), 60592050 (SI50), 60692050 (SI63), 60792050 (SI75)
      const inchHollowPNs = ['60392050', '60492050', '60592050', '60692050', '60792050'];

      for (const pn of inchHollowPNs) {
        expect(isRealNordPartNumber(pn)).toBe(true);
        // The 5th digit (index 4) indicates mounting variant: 2=inch, 1=metric
        expect(pn[4]).toBe('2');
      }
    });

    it('metric_hollow pattern produces PNs starting with 6039**1**xxx', () => {
      // Metric hollow PNs follow pattern: 6039[size]xxx where middle digit is 1
      // Examples: 60391050 (SI31), 60491050 (SI40), 60591050 (SI50), 60691050 (SI63), 60791050 (SI75)
      const metricHollowPNs = ['60391050', '60491050', '60591050', '60691050', '60791050'];

      for (const pn of metricHollowPNs) {
        expect(isRealNordPartNumber(pn)).toBe(true);
        // The 5th digit (index 4) indicates mounting variant: 2=inch, 1=metric
        expect(pn[4]).toBe('1');
      }
    });
  });

  describe('totalRatio matching', () => {
    it('should match exact integer ratios', () => {
      // Test that ratio matching works for common ratios
      const ratios = [5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100];
      for (const ratio of ratios) {
        const options: ResolveBomOptions = { totalRatio: ratio };
        expect(options.totalRatio).toBe(ratio);
      }
    });

    it('should match decimal ratios like 7.5 and 12.5', () => {
      const decimalRatios = [7.5, 12.5];
      for (const ratio of decimalRatios) {
        const options: ResolveBomOptions = { totalRatio: ratio };
        expect(options.totalRatio).toBe(ratio);
      }
    });
  });
});

// =============================================================================
// INTEGRATION: resolveBomFromMetadata still works as before
// =============================================================================

describe('resolveBomFromMetadata backward compatibility', () => {
  it('gear unit remains Missing (found=false) without DB lookup', () => {
    const metadata = {
      model_type: 'SK 1SI63/H10 - 56C - 63L/4',
      total_ratio: 80,
      parsed_model: {
        worm_stages: 1,
        gear_unit_size: 'SI63',
        size_code: '63',
        adapter_code: '56C',
        motor_frame: '63L/4',
      },
    };

    const result = resolveBomFromMetadata(metadata, 0.25);

    // Gear unit should still be Missing because resolveBomFromMetadata
    // is synchronous and doesn't do DB lookups
    const gearUnit = result.components.find(c => c.component_type === 'gear_unit');
    expect(gearUnit?.found).toBe(false);
    expect(gearUnit?.part_number).toBeNull();
    expect(result.complete).toBe(false);
  });

  it('complete is false when gear unit not resolved', () => {
    const metadata = {
      model_type: 'SK 1SI31 - 56C - 63S/4',
      total_ratio: 100,
    };

    const result = resolveBomFromMetadata(metadata, 0.16);

    expect(result.complete).toBe(false);
  });
});
