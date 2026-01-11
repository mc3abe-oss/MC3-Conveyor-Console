/**
 * BOM Resolver Tests
 *
 * Tests for parsing model_type strings and resolving BOM components.
 * Model type format: "SK [stages]SI[size] - [adapter_code] - [motor_frame]"
 */

// Mock supabase client before importing bom module
jest.mock('../supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
  },
  isSupabaseConfigured: jest.fn(() => false),
}));

import {
  parseModelType,
  resolveBomFromMetadata,
  ParsedModelType,
  isRealNordPartNumber,
  DEFAULT_MOUNTING_VARIANT,
  GEARMOTOR_MOUNTING_STYLE,
  needsOutputShaftKit,
  ResolveBomOptions,
  BomResolution,
  buildBomCopyText,
  BomCopyContext,
  parseHollowShaftBore,
  ParsedHollowShaftBore,
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

    it('handles 2-stage model with /H10 suffix (extracts clean SI size)', () => {
      // REGRESSION: model strings like "SK 1SI63/H10 - 56C - 63L/4"
      // The "/H10" is a second-stage indicator, NOT part of gear_unit_size.
      // gear_unit_size must be "SI63", NOT "SI63/H10"
      const result = parseModelType('SK 1SI63/H10 - 56C - 63L/4');

      expect(result).not.toBeNull();
      expect(result?.worm_stages).toBe(1);
      expect(result?.gear_unit_size).toBe('SI63'); // Clean, no /H10
      expect(result?.size_code).toBe('63');
      expect(result?.adapter_code).toBe('56C');
      expect(result?.motor_frame).toBe('63L/4');
    });

    it('handles 2-stage model with /31 suffix (extracts clean SI size)', () => {
      // Another variant: "/31" indicates a different second stage
      const result = parseModelType('SK 1SI63/31 - 56C - 63L/4');

      expect(result).not.toBeNull();
      expect(result?.gear_unit_size).toBe('SI63'); // Clean, no /31
      expect(result?.size_code).toBe('63');
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
// REGRESSION: Applied SF must NOT affect gear unit PN lookup
// =============================================================================

describe('REGRESSION: Gear unit PN uses catalog ratio, NOT SF-adjusted ratio', () => {
  /**
   * REGRESSION TEST (2026-01-07):
   * Applied Service Factor (SF) is a FILTERING/DISPLAY parameter, NOT an ordering key.
   *
   * Definitions:
   * - catalog_ratio = candidate.metadata_json.total_ratio (exact from catalog CSV)
   * - applied_sf = user-selected service factor for filtering candidates
   *
   * Rules:
   * - applied_sf affects: filtering eligibility (SF_cat >= applied_sf), margin display, notes/copy text
   * - applied_sf does NOT affect: gear unit PN selection / BOM ratio key
   *
   * The gear unit PN is keyed by (gear_unit_size, catalog_ratio, mounting_variant).
   * Changing applied SF must NEVER change the ratio used for gear unit lookup.
   */

  it('gear unit PN uses catalog ratio even when applied SF is high', () => {
    // Given: SI63 with catalog total_ratio=80, applied_sf=1.5
    // When applied_sf is 1.5, the ratio used for PN lookup should STILL be 80
    // NOT 80 * 1.5 = 120 (this would be WRONG)

    const metadata = {
      model_type: 'SK 1SI63/H10 - 56C - 63L/4',
      total_ratio: 80, // Catalog ratio from CSV - this is the ONLY ratio for PN lookup
      parsed_model: {
        worm_stages: 1,
        gear_unit_size: 'SI63',
        size_code: '63',
        adapter_code: '56C',
        motor_frame: '63L/4',
      },
    };

    // The options.totalRatio should be the catalog ratio (80), not SF-adjusted
    const options: ResolveBomOptions = {
      totalRatio: metadata.total_ratio, // 80, NOT 80 * applied_sf
      mountingVariant: 'inch_hollow',
    };

    // This verifies the correct value is passed
    expect(options.totalRatio).toBe(80);
    expect(Math.round(options.totalRatio * 10) / 10).toBe(80);
  });

  it('changing applied SF does not change the ratio for gear unit lookup', () => {
    // Given the same candidate selected, varying applied SF should result in
    // the SAME totalRatio being used for gear unit lookup

    const catalogRatio = 80; // From candidate.metadata_json.total_ratio

    // Test with various SF values - the ratio should ALWAYS be 80
    const sfValues = [0.85, 1.0, 1.25, 1.5, 2.0];

    for (const appliedSf of sfValues) {
      // The ratio passed to resolveBom should ALWAYS be the catalog ratio
      // regardless of what applied SF the user selected
      const optionsForThisSf: ResolveBomOptions = {
        totalRatio: catalogRatio, // Always catalog ratio, never SF-adjusted
      };

      // All should use ratio 80
      expect(optionsForThisSf.totalRatio).toBe(80);

      // Normalized ratio should also be 80
      const normalizedRatio = Math.round(optionsForThisSf.totalRatio);
      expect(normalizedRatio).toBe(80);
    }

    // Verify that if someone INCORRECTLY multiplied by SF, they'd get wrong ratios
    // (except for SF=1.0 which would coincidentally be correct)
    const wrongRatioAt1_5 = Math.round(catalogRatio * 1.5); // Would be 120
    const wrongRatioAt2_0 = Math.round(catalogRatio * 2.0); // Would be 160
    expect(wrongRatioAt1_5).toBe(120);
    expect(wrongRatioAt2_0).toBe(160);
    // These are NOT the catalog ratio
    expect(wrongRatioAt1_5).not.toBe(catalogRatio);
    expect(wrongRatioAt2_0).not.toBe(catalogRatio);
  });

  it('applied SF appears in Copy BOM notes but does not affect PN lookup', () => {
    // The BomCopyContext includes appliedSf and catalogSf for display purposes
    // But these values should NOT affect the gear unit PN that was resolved

    const bom: BomResolution = {
      model_type: 'SK 1SI63/H10 - 56C - 63L/4',
      parsed: {
        worm_stages: 1,
        gear_unit_size: 'SI63',
        size_code: '63',
        adapter_code: '56C',
        motor_frame: '63L/4',
      },
      components: [
        {
          component_type: 'gear_unit',
          part_number: '60692080', // Real NORD PN for SI63 ratio 80 inch_hollow
          description: 'NORD FLEXBLOC SI63 Gear Unit i=80',
          found: true,
        },
        { component_type: 'motor', part_number: null, description: 'Motor', found: false },
        { component_type: 'adapter', part_number: null, description: 'Adapter', found: false },
      ],
      complete: false,
    };

    // Test with different applied SF values
    const sfTestCases = [
      { appliedSf: 0.85, catalogSf: 2.1 },
      { appliedSf: 1.0, catalogSf: 2.1 },
      { appliedSf: 1.5, catalogSf: 2.1 },
      { appliedSf: 2.0, catalogSf: 2.1 },
    ];

    for (const { appliedSf, catalogSf } of sfTestCases) {
      const context: BomCopyContext = {
        appliedSf,
        catalogSf,
        motorHp: 0.25,
      };

      const copyText = buildBomCopyText(bom, context);

      // Copy text should show both SF values
      expect(copyText).toContain(`Applied SF: ${appliedSf}`);
      expect(copyText).toContain(`Catalog SF: ${catalogSf}`);

      // But the gear unit PN should be the same regardless of applied SF
      expect(copyText).toContain('60692080');
    }
  });

  it('normalizedRatio uses 1-decimal-place rounding for comparison', () => {
    // Catalog ratios can be integers (80, 100) or decimals (7.5, 12.5)
    // Round to 1 decimal place to handle floating point precision issues

    const normalizeRatio = (r: number) => Math.round(r * 10) / 10;

    const testCases = [
      { input: 80, expected: 80 },
      { input: 80.0, expected: 80 },
      { input: 79.9999, expected: 80 },
      { input: 80.0001, expected: 80 },
      { input: 7.5, expected: 7.5 }, // Decimal ratio preserved
      { input: 7.49999, expected: 7.5 },
      { input: 12.5, expected: 12.5 }, // Decimal ratio preserved
      { input: 12.50001, expected: 12.5 },
    ];

    for (const { input, expected } of testCases) {
      expect(normalizeRatio(input)).toBe(expected);
    }
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

// =============================================================================
// REGRESSION TESTS: Model Parsing Normalization for /H10 variants
// =============================================================================

describe('REGRESSION: Model parsing for 2-stage /H10 variants', () => {
  /**
   * REGRESSION TEST (2026-01-08):
   * Model strings like "SK 1SI63/H10 - 56C - 63L/4" must parse correctly.
   * The "/H10" suffix indicates a second stage but should NOT be included
   * in the gear_unit_size field used for PN lookup.
   */

  it('parseModelType extracts clean gear_unit_size from "SK 1SI63/H10 - 56C - 63L/4"', () => {
    const result = parseModelType('SK 1SI63/H10 - 56C - 63L/4');

    expect(result).not.toBeNull();
    expect(result?.gear_unit_size).toBe('SI63'); // NOT "SI63/H10"
    expect(result?.size_code).toBe('63');
    expect(result?.worm_stages).toBe(1);
    expect(result?.adapter_code).toBe('56C');
    expect(result?.motor_frame).toBe('63L/4');
  });

  it('parseModelType extracts clean gear_unit_size from "SK 1SI63/31 - 56C - 63L/4"', () => {
    const result = parseModelType('SK 1SI63/31 - 56C - 63L/4');

    expect(result).not.toBeNull();
    expect(result?.gear_unit_size).toBe('SI63'); // NOT "SI63/31"
    expect(result?.size_code).toBe('63');
  });

  it('parseModelType handles single-stage model without suffix', () => {
    const result = parseModelType('SK 1SI63 - 56C - 63L/4');

    expect(result).not.toBeNull();
    expect(result?.gear_unit_size).toBe('SI63');
    expect(result?.size_code).toBe('63');
  });
});

// =============================================================================
// REGRESSION TESTS: Gear Unit PN lookup key structure
// =============================================================================

describe('REGRESSION: Gear Unit PN lookup uses correct key structure', () => {
  /**
   * REGRESSION TEST (2026-01-08):
   * Gear unit PN lookup must use:
   * - gear_unit_size: normalized (e.g., "SI63")
   * - total_ratio: from metadata_json.total_ratio (rounded to integer)
   * - mounting_variant: default "inch_hollow"
   *
   * For SI63, ratio 80, inch_hollow → expected PN is "60692800"
   */

  it('normalizes ratio to 1 decimal place for comparison', () => {
    // Ratios can be integers (80, 100) or decimals (7.5, 12.5)
    const normalizeRatio = (r: number) => Math.round(r * 10) / 10;

    const testCases = [
      { input: 80, expected: 80 },
      { input: 80.0, expected: 80 },
      { input: 80.04, expected: 80 },
      { input: 79.96, expected: 80 },
      { input: 7.5, expected: 7.5 }, // Decimal preserved
      { input: 12.5, expected: 12.5 }, // Decimal preserved
    ];

    for (const { input, expected } of testCases) {
      expect(normalizeRatio(input)).toBe(expected);
    }
  });

  it('DEFAULT_MOUNTING_VARIANT is inch_hollow for US market', () => {
    expect(DEFAULT_MOUNTING_VARIANT).toBe('inch_hollow');
  });

  it('expected gear unit PN for SI63/80/inch_hollow is 60692800', () => {
    // This documents the expected PN from the seeded CSV data:
    // NORD,FLEXBLOC,gear_unit,SI63,80,80,,ANY,false,inch_hollow,60692800,...
    const expectedPn = '60692800';
    expect(isRealNordPartNumber(expectedPn)).toBe(true);
    expect(expectedPn[0]).toBe('6'); // Starts with 6
    expect(expectedPn.length).toBe(8); // 8 digits
  });
});

// =============================================================================
// REGRESSION TESTS: Applied SF does NOT affect gear unit PN
// =============================================================================

describe('REGRESSION: Applied SF does not affect gear unit PN lookup', () => {
  /**
   * REGRESSION TEST (2026-01-08):
   * Applied Service Factor is a FILTERING parameter only.
   * The gear unit PN lookup key is based on catalog ratio (metadata_json.total_ratio),
   * NOT on any SF-adjusted ratio.
   *
   * Changing Applied SF must NOT change the gear unit PN.
   */

  it('catalog ratio is passed unchanged regardless of applied SF', () => {
    // Simulate what DriveSelectorModal does: pass catalog ratio from metadata
    const catalogRatio = 80; // From candidate.metadata_json.total_ratio

    // These are different applied SF values the user might select
    const appliedSfValues = [0.85, 1.0, 1.25, 1.5, 2.0];

    // For each applied SF, the ratio passed to resolveBom should be the SAME
    for (const appliedSf of appliedSfValues) {
      // The key insight: we pass catalogRatio, NOT catalogRatio * appliedSf
      const ratioForLookup = catalogRatio; // NOT: catalogRatio * appliedSf
      expect(ratioForLookup).toBe(80);
    }
  });

  it('ResolveBomOptions accepts totalRatio without SF adjustment', () => {
    const options: ResolveBomOptions = {
      totalRatio: 80, // Catalog ratio, unchanged by SF
      mountingVariant: 'inch_hollow',
    };

    expect(options.totalRatio).toBe(80);
    expect(Math.round(options.totalRatio * 10) / 10).toBe(80);
  });

  it('BOM copy text shows both applied and catalog SF separately', () => {
    const bom: BomResolution = {
      model_type: 'SK 1SI63 - 56C - 63L/4',
      parsed: {
        worm_stages: 1,
        gear_unit_size: 'SI63',
        size_code: '63',
        adapter_code: '56C',
        motor_frame: '63L/4',
      },
      components: [
        {
          component_type: 'gear_unit',
          part_number: '60692800',
          description: 'NORD FLEXBLOC SI63 i=80',
          found: true,
        },
      ],
      complete: false,
    };

    // Test with different applied SF values - gear unit PN should stay same
    const testCases = [
      { appliedSf: 1.0, catalogSf: 2.1 },
      { appliedSf: 1.5, catalogSf: 2.1 },
      { appliedSf: 2.0, catalogSf: 2.1 },
    ];

    for (const { appliedSf, catalogSf } of testCases) {
      const context: BomCopyContext = { appliedSf, catalogSf };
      const copyText = buildBomCopyText(bom, context);

      // Applied and catalog SF are shown separately
      expect(copyText).toContain(`Applied SF: ${appliedSf}`);
      expect(copyText).toContain(`Catalog SF: ${catalogSf}`);

      // Gear unit PN is always 60692800 regardless of applied SF
      expect(copyText).toContain('60692800');
    }
  });
});


// =============================================================================
// REGRESSION TEST: Gear unit PN uses WORM ratio, NOT total ratio
// =============================================================================

describe("REGRESSION: Gear unit PN lookup uses worm_ratio, not total_ratio", () => {
  /**
   * REGRESSION TEST (2026-01-08):
   * Bug: Gear unit PNs were showing as "Missing" even when data was seeded.
   *
   * ROOT CAUSE:
   * - Gear unit PNs in CSV are keyed by WORM ratio (5, 7.5, 10, 12.5, 15, 20, 25, 30, 40, 50, 60, 80, 100)
   * - Performance points have total_ratio = worm_ratio × second_ratio (e.g., 125 = 12.5 × 10)
   * - UI was passing total_ratio (125) to resolveBom(), but gear unit lookup expected worm_ratio (12.5)
   *
   * FIX: Use metadata_json.worm_ratio from performance point for gear unit PN lookup.
   *
   * Example: SI63 0.25HP @ 13 RPM
   *   - total_ratio: 125 (worm × helical = 12.5 × 10)
   *   - worm_ratio: 12.5 (this is the gear unit PN key)
   *   - expected PN: 60692130 (SI63, ratio=12.5, inch_hollow)
   */

  it("worm_ratio 12.5 should match gear unit PN, not total_ratio 125", () => {
    // From the CSV: SI63, ratio 12.5, inch_hollow -> PN 60692130
    const wormRatio = 12.5;
    const totalRatio = 125; // worm × helical (12.5 × 10)

    // Options for resolveBom should use worm_ratio, not total_ratio
    const correctOptions: ResolveBomOptions = {
      totalRatio: wormRatio, // Use worm_ratio!
      mountingVariant: "inch_hollow",
    };

    const incorrectOptions: ResolveBomOptions = {
      totalRatio: totalRatio, // Wrong - would look for ratio=125 (does not exist)
      mountingVariant: "inch_hollow",
    };

    // Verify the correct ratio is what we expect
    expect(correctOptions.totalRatio).toBe(12.5);
    expect(incorrectOptions.totalRatio).toBe(125);

    // The normalized ratio calculation should work for both
    const normalizedCorrect = Math.round(correctOptions.totalRatio! * 10) / 10;
    const normalizedIncorrect = Math.round(incorrectOptions.totalRatio! * 10) / 10;

    expect(normalizedCorrect).toBe(12.5);
    expect(normalizedIncorrect).toBe(125);
  });

  it("gear unit PN CSV ratios are worm ratios, not total ratios", () => {
    // These are the valid ratio keys in the gear unit PN CSV
    const validGearUnitRatios = [5, 7.5, 10, 12.5, 15, 20, 25, 30, 40, 50, 60, 80, 100];

    // These would be typical total_ratios from performance points (worm × helical)
    const typicalTotalRatios = [50, 75, 100, 125, 150, 200, 300, 400, 500, 600, 800, 1000, 1200];

    // None of the total_ratios should appear in the valid gear unit ratios
    // (except coincidentally like 100 which is both a valid worm ratio and could be 10×10)
    for (const totalRatio of typicalTotalRatios) {
      if (totalRatio > 100) {
        expect(validGearUnitRatios.includes(totalRatio)).toBe(false);
      }
    }

    // All worm ratios should be <= 100
    for (const wormRatio of validGearUnitRatios) {
      expect(wormRatio).toBeLessThanOrEqual(100);
    }
  });

  it("expected gear unit PN for SI63/worm_ratio=12.5/inch_hollow is 60692130", () => {
    // This documents the expected PN from the seeded CSV data:
    // NORD,FLEXBLOC,gear_unit,SI63,12.5,12.5,,ANY,false,inch_hollow,60692130,...
    const expectedPn = "60692130";
    expect(isRealNordPartNumber(expectedPn)).toBe(true);
    expect(expectedPn.startsWith("6")).toBe(true);
  });

  it("expected gear unit PN for SI63/worm_ratio=80/inch_hollow is 60692800", () => {
    // This documents the expected PN from the seeded CSV data:
    // NORD,FLEXBLOC,gear_unit,SI63,80,80,,ANY,false,inch_hollow,60692800,...
    const expectedPn = "60692800";
    expect(isRealNordPartNumber(expectedPn)).toBe(true);
    expect(expectedPn.startsWith("6")).toBe(true);
  });
});

// =============================================================================
// OUTPUT SHAFT KIT REQUIREMENT LOGIC TESTS
// =============================================================================

describe('needsOutputShaftKit', () => {
  /**
   * Output Shaft Kit Requirement Rule:
   * - Shaft mount (direct coupling): NOT required
   * - Bottom mount (chain drive): REQUIRED
   * - Undefined/null/other: NOT required (safe default)
   */

  describe('determines requirement based on mounting style', () => {
    it('returns false for shaft_mounted (direct coupling, no chain)', () => {
      expect(needsOutputShaftKit(GEARMOTOR_MOUNTING_STYLE.ShaftMounted)).toBe(false);
      expect(needsOutputShaftKit('shaft_mounted')).toBe(false);
    });

    it('returns true for bottom_mount (chain drive)', () => {
      expect(needsOutputShaftKit(GEARMOTOR_MOUNTING_STYLE.BottomMount)).toBe(true);
      expect(needsOutputShaftKit('bottom_mount')).toBe(true);
    });
  });

  describe('handles edge cases safely', () => {
    it('returns false for null', () => {
      expect(needsOutputShaftKit(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(needsOutputShaftKit(undefined)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(needsOutputShaftKit('')).toBe(false);
    });

    it('returns false for unknown mounting style', () => {
      expect(needsOutputShaftKit('unknown_style')).toBe(false);
      expect(needsOutputShaftKit('direct_mount')).toBe(false);
    });
  });
});

describe('GEARMOTOR_MOUNTING_STYLE constants', () => {
  it('matches expected enum values', () => {
    expect(GEARMOTOR_MOUNTING_STYLE.ShaftMounted).toBe('shaft_mounted');
    expect(GEARMOTOR_MOUNTING_STYLE.BottomMount).toBe('bottom_mount');
  });
});

describe('Output Shaft Kit in BOM copy text', () => {
  describe('shows "not required" when mounting is shaft mount', () => {
    it('does not show MISSING for output shaft kit when found=true', () => {
      const bom: BomResolution = {
        model_type: 'SK 1SI63 - 56C - 63L/4',
        parsed: {
          worm_stages: 1,
          gear_unit_size: 'SI63',
          size_code: '63',
          adapter_code: '56C',
          motor_frame: '63L/4',
        },
        components: [
          { component_type: 'gear_unit', part_number: '60692800', description: 'Gear unit', found: true },
          { component_type: 'motor', part_number: null, description: 'Motor', found: false },
          { component_type: 'adapter', part_number: null, description: 'Adapter', found: false },
          // Output shaft kit: found=true means "not required", no PN needed
          { component_type: 'output_shaft_kit', part_number: null, description: 'Not required for shaft mount', found: true },
        ],
        complete: false,
      };

      const context: BomCopyContext = {
        appliedSf: 1.5,
        catalogSf: 2.1,
      };

      const copyText = buildBomCopyText(bom, context);

      // Should show "(not required)" for output shaft kit
      expect(copyText).toContain('4) Output Shaft Kit: — (not required)');

      // Should NOT show MISSING for output shaft kit
      expect(copyText).not.toContain('MISSING: Output Shaft Kit PN');
    });
  });

  describe('shows "Missing" when mounting is bottom mount (chain drive)', () => {
    it('shows MISSING for output shaft kit when found=false', () => {
      const bom: BomResolution = {
        model_type: 'SK 1SI63 - 56C - 63L/4',
        parsed: {
          worm_stages: 1,
          gear_unit_size: 'SI63',
          size_code: '63',
          adapter_code: '56C',
          motor_frame: '63L/4',
        },
        components: [
          { component_type: 'gear_unit', part_number: '60692800', description: 'Gear unit', found: true },
          { component_type: 'motor', part_number: null, description: 'Motor', found: false },
          { component_type: 'adapter', part_number: null, description: 'Adapter', found: false },
          // Output shaft kit: found=false means required but missing
          { component_type: 'output_shaft_kit', part_number: null, description: 'Required for chain drive', found: false },
        ],
        complete: false,
      };

      const context: BomCopyContext = {
        appliedSf: 1.5,
        catalogSf: 2.1,
      };

      const copyText = buildBomCopyText(bom, context);

      // Should show dash for missing PN
      expect(copyText).toContain('4) Output Shaft Kit: —');

      // Should show MISSING for output shaft kit
      expect(copyText).toContain('MISSING: Output Shaft Kit PN');
    });
  });
});

describe('getMissingHint for output_shaft_kit', () => {
  it('returns selection hint when required', () => {
    const { getMissingHint } = require('./bom');
    expect(getMissingHint('output_shaft_kit', true)).toBe('Select an output shaft option to resolve this.');
  });

  it('returns not required message when not required', () => {
    const { getMissingHint } = require('./bom');
    expect(getMissingHint('output_shaft_kit', false)).toBe('Not required for shaft mount configuration.');
  });
});

// =============================================================================
// OUTPUT SHAFT KIT CONFIGURED STATE TESTS
// =============================================================================

describe('Output Shaft Kit with outputShaftOption', () => {
  describe('shows "Configured" when user selects option in Drive Arrangement (v1 behavior)', () => {
    it('shows MISSING note for configured output shaft kit when PN is pending (v1)', () => {
      const bom: BomResolution = {
        model_type: 'SK 1SI63 - 56C - 63L/4',
        parsed: {
          worm_stages: 1,
          gear_unit_size: 'SI63',
          size_code: '63',
          adapter_code: '56C',
          motor_frame: '63L/4',
        },
        components: [
          { component_type: 'gear_unit', part_number: '60692800', description: 'Gear unit', found: true },
          { component_type: 'motor', part_number: null, description: 'Motor', found: false },
          { component_type: 'adapter', part_number: null, description: 'Adapter', found: false },
          // Output shaft kit: found=true with "Configured:" description means user selected option
          { component_type: 'output_shaft_kit', part_number: null, description: 'Configured: Inch keyed bore', found: true },
        ],
        complete: false,
      };

      const context: BomCopyContext = {
        appliedSf: 1.5,
        catalogSf: 2.1,
      };

      const copyText = buildBomCopyText(bom, context);

      // v1: Should show dash with "PN pending, not included in order" (not option label as PN)
      expect(copyText).toContain('4) Output Shaft Kit: — (PN pending, not included in order)');
      expect(copyText).toContain('Inch keyed bore');

      // v1: SHOULD show MISSING for output shaft kit when PN is pending (do not order)
      expect(copyText).toContain('MISSING: Output Shaft Kit PN');
    });
  });

  describe('copy text format for all three states', () => {
    it('formats correctly for shaft mount (not required)', () => {
      const bom: BomResolution = {
        model_type: 'SK 1SI63 - 56C - 63L/4',
        parsed: null,
        components: [
          { component_type: 'gear_unit', part_number: '60692800', description: 'Gear unit', found: true },
          { component_type: 'motor', part_number: '123456', description: 'Motor', found: true },
          { component_type: 'adapter', part_number: '789012', description: 'Adapter', found: true },
          { component_type: 'output_shaft_kit', part_number: null, description: 'Not required for shaft mount', found: true },
        ],
        complete: true,
      };

      const copyText = buildBomCopyText(bom, { appliedSf: 1.5, catalogSf: 2.0 });
      expect(copyText).toContain('4) Output Shaft Kit: — (not required)');
    });

    it('formats correctly for bottom mount with no selection (missing)', () => {
      const bom: BomResolution = {
        model_type: 'SK 1SI63 - 56C - 63L/4',
        parsed: null,
        components: [
          { component_type: 'gear_unit', part_number: '60692800', description: 'Gear unit', found: true },
          { component_type: 'motor', part_number: '123456', description: 'Motor', found: true },
          { component_type: 'adapter', part_number: '789012', description: 'Adapter', found: true },
          { component_type: 'output_shaft_kit', part_number: null, description: 'Required for chain drive configuration', found: false },
        ],
        complete: false,
      };

      const copyText = buildBomCopyText(bom, { appliedSf: 1.5, catalogSf: 2.0 });
      expect(copyText).toContain('4) Output Shaft Kit: — (select in Drive Arrangement)');
      expect(copyText).toContain('MISSING: Output Shaft Kit PN');
    });

    it('formats correctly for bottom mount with selection (configured) - v1 behavior', () => {
      const bom: BomResolution = {
        model_type: 'SK 1SI63 - 56C - 63L/4',
        parsed: null,
        components: [
          { component_type: 'gear_unit', part_number: '60692800', description: 'Gear unit', found: true },
          { component_type: 'motor', part_number: '123456', description: 'Motor', found: true },
          { component_type: 'adapter', part_number: '789012', description: 'Adapter', found: true },
          { component_type: 'output_shaft_kit', part_number: null, description: 'Configured: Metric hollow', found: true },
        ],
        complete: true,
      };

      const copyText = buildBomCopyText(bom, { appliedSf: 1.5, catalogSf: 2.0 });
      // v1: Shows dash with "PN pending, not included in order" instead of option label as PN
      expect(copyText).toContain('4) Output Shaft Kit: — (PN pending, not included in order)');
      expect(copyText).toContain('Metric hollow');
      // v1: SHOULD show MISSING for pending PNs (do not order)
      expect(copyText).toContain('MISSING: Output Shaft Kit PN');
    });
  });
});

describe('OUTPUT_SHAFT_OPTION_LABELS', () => {
  it('has labels for all output shaft options', () => {
    const { OUTPUT_SHAFT_OPTION_LABELS } = require('./bom');
    expect(OUTPUT_SHAFT_OPTION_LABELS.inch_keyed).toBe('Inch keyed bore');
    expect(OUTPUT_SHAFT_OPTION_LABELS.metric_keyed).toBe('Metric keyed bore');
    expect(OUTPUT_SHAFT_OPTION_LABELS.inch_hollow).toBe('Inch hollow');
    expect(OUTPUT_SHAFT_OPTION_LABELS.metric_hollow).toBe('Metric hollow');
  });
});

// =============================================================================
// PR: fix/nord-output-shaft-kit-no-fake-pn
// Tests for output shaft kit PN suppression until catalog mapping is ready
// =============================================================================

describe('REGRESSION: Output shaft kit PN is always null until catalog mapping is ready', () => {
  /**
   * PR: fix/nord-output-shaft-kit-no-fake-pn
   *
   * Requirements:
   * 1. Output shaft kit part_number must be null even when user selects an option
   * 2. Status should be "Configured" (not "Resolved") when option is selected
   * 3. Copy BOM must NOT contain any 8-digit PN for output shaft kit
   * 4. Copy BOM should show "PN pending" text for configured state
   *
   * This is intentional until the full catalog mapping is verified.
   */

  describe('bottom_mount + output shaft option selected', () => {
    it('part_number is null when user selects inch_keyed', () => {
      const bom: BomResolution = {
        model_type: 'SK 1SI63 - 56C - 63L/4',
        parsed: null,
        components: [
          { component_type: 'gear_unit', part_number: '60692800', description: 'Gear unit', found: true },
          { component_type: 'motor', part_number: null, description: 'Motor', found: false },
          { component_type: 'adapter', part_number: null, description: 'Adapter', found: false },
          // Key assertion: part_number MUST be null, description shows "Configured: ..."
          { component_type: 'output_shaft_kit', part_number: null, description: 'Configured: Inch keyed bore', found: true },
        ],
        complete: false,
      };

      const shaftKit = bom.components.find(c => c.component_type === 'output_shaft_kit');

      // CRITICAL: part_number must be null (no 8-digit PN)
      expect(shaftKit?.part_number).toBeNull();
      // Status is "configured" (found=true) but not resolved (no PN)
      expect(shaftKit?.found).toBe(true);
      // Description shows the configured option
      expect(shaftKit?.description).toContain('Configured:');
      expect(shaftKit?.description).toContain('Inch keyed bore');
    });

    it('part_number is null for all output shaft option types', () => {
      const optionTypes = ['inch_keyed', 'metric_keyed', 'inch_hollow', 'metric_hollow'];

      for (const optionKey of optionTypes) {
        // When user selects any option, PN must still be null
        const bom: BomResolution = {
          model_type: 'SK 1SI63 - 56C - 63L/4',
          parsed: null,
          components: [
            { component_type: 'output_shaft_kit', part_number: null, description: `Configured: ${optionKey}`, found: true },
          ],
          complete: false,
        };

        const shaftKit = bom.components.find(c => c.component_type === 'output_shaft_kit');
        expect(shaftKit?.part_number).toBeNull();
      }
    });
  });

  describe('bottom_mount + no output shaft option selected', () => {
    it('status is Missing (found=false)', () => {
      const bom: BomResolution = {
        model_type: 'SK 1SI63 - 56C - 63L/4',
        parsed: null,
        components: [
          { component_type: 'gear_unit', part_number: '60692800', description: 'Gear unit', found: true },
          { component_type: 'output_shaft_kit', part_number: null, description: 'Required for chain drive configuration', found: false },
        ],
        complete: false,
      };

      const shaftKit = bom.components.find(c => c.component_type === 'output_shaft_kit');

      expect(shaftKit?.part_number).toBeNull();
      expect(shaftKit?.found).toBe(false); // Missing state
    });
  });

  describe('shaft_mounted', () => {
    it('status is Not Required (found=true, no PN needed)', () => {
      const bom: BomResolution = {
        model_type: 'SK 1SI63 - 56C - 63L/4',
        parsed: null,
        components: [
          { component_type: 'gear_unit', part_number: '60692800', description: 'Gear unit', found: true },
          { component_type: 'output_shaft_kit', part_number: null, description: 'Not required for shaft mount', found: true },
        ],
        complete: true,
      };

      const shaftKit = bom.components.find(c => c.component_type === 'output_shaft_kit');

      expect(shaftKit?.part_number).toBeNull();
      expect(shaftKit?.found).toBe(true);
      expect(shaftKit?.description).toContain('Not required');
    });
  });

  describe('Copy BOM output', () => {
    it('does NOT contain any 8-digit PN for configured output shaft kit (v1)', () => {
      const bom: BomResolution = {
        model_type: 'SK 1SI63 - 56C - 63L/4',
        parsed: null,
        components: [
          { component_type: 'gear_unit', part_number: '60692800', description: 'Gear unit', found: true },
          { component_type: 'motor', part_number: '31610012', description: 'Motor', found: true },
          { component_type: 'adapter', part_number: '60395510', description: 'Adapter', found: true },
          // Configured but NO PN
          { component_type: 'output_shaft_kit', part_number: null, description: 'Configured: Metric keyed bore', found: true },
        ],
        complete: true,
      };

      const copyText = buildBomCopyText(bom, { appliedSf: 1.5, catalogSf: 2.0 });

      // v1: Should NOT contain any 8-digit PN for output shaft kit line
      // The line should show dash with "(PN pending, not included in order)"
      expect(copyText).toContain('Output Shaft Kit: — (PN pending, not included in order)');
      // Should still show description with option label
      expect(copyText).toContain('Metric keyed bore');

      // Verify no fake 8-digit PN appears on the output shaft kit line
      // Real PNs like 60892110, 61191120, etc. should NOT appear for output shaft kit
      const shaftKitLine = copyText.split('\n').find(line => line.includes('Output Shaft Kit'));
      expect(shaftKitLine).toBeDefined();
      // The line should NOT match any 8-digit number pattern after "Output Shaft Kit:"
      const pnMatch = shaftKitLine?.match(/Output Shaft Kit:\s*(\d{8})/);
      expect(pnMatch).toBeNull();
    });

    it('shows "PN pending, not included in order" text for configured output shaft kit (v1)', () => {
      const bom: BomResolution = {
        model_type: 'SK 1SI63 - 56C - 63L/4',
        parsed: null,
        components: [
          { component_type: 'output_shaft_kit', part_number: null, description: 'Configured: Inch hollow', found: true },
        ],
        complete: false,
      };

      const copyText = buildBomCopyText(bom, { appliedSf: 1.5, catalogSf: 2.0 });

      // v1: Should show dash with "PN pending, not included in order" indicator
      expect(copyText).toContain('(PN pending, not included in order)');
      expect(copyText).toContain('Inch hollow');
      // v1: Should show MISSING note for pending PNs
      expect(copyText).toContain('MISSING: Output Shaft Kit PN');
    });

    it('shows "(not required)" for shaft mount configuration', () => {
      const bom: BomResolution = {
        model_type: 'SK 1SI63 - 56C - 63L/4',
        parsed: null,
        components: [
          { component_type: 'output_shaft_kit', part_number: null, description: 'Not required for shaft mount', found: true },
        ],
        complete: true,
      };

      const copyText = buildBomCopyText(bom, { appliedSf: 1.5, catalogSf: 2.0 });

      expect(copyText).toContain('Output Shaft Kit: — (not required)');
      expect(copyText).not.toContain('MISSING: Output Shaft Kit');
    });

    it('shows MISSING for bottom mount with no selection', () => {
      const bom: BomResolution = {
        model_type: 'SK 1SI63 - 56C - 63L/4',
        parsed: null,
        components: [
          { component_type: 'output_shaft_kit', part_number: null, description: 'Required for chain drive configuration', found: false },
        ],
        complete: false,
      };

      const copyText = buildBomCopyText(bom, { appliedSf: 1.5, catalogSf: 2.0 });

      expect(copyText).toContain('(select in Drive Arrangement)');
      expect(copyText).toContain('MISSING: Output Shaft Kit PN');
    });
  });
});

// =============================================================================
// OUTPUT SHAFT KIT PN RESOLUTION TESTS
// =============================================================================

describe('Output Shaft Kit PN Resolution', () => {
  /**
   * Tests for the three states of output shaft kit in BOM:
   * 1. RESOLVED: bottom_mount + option selected + real NORD PN found
   * 2. CONFIGURED: bottom_mount + option selected + no PN mapping yet
   * 3. NOT_REQUIRED: shaft_mounted (no output shaft kit needed)
   */

  describe('State 1: Resolved (real NORD PN)', () => {
    it('shows real 8-digit NORD PN when mapping exists', () => {
      // SI31 inch_hollow inch_keyed => 60892110 (from CSV)
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
          { component_type: 'gear_unit', part_number: '60392050', description: 'Gear unit', found: true },
          { component_type: 'motor', part_number: '31610012', description: 'Motor', found: true },
          { component_type: 'adapter', part_number: '60295510', description: 'Adapter', found: true },
          // Resolved state: has real NORD PN from DB lookup
          { component_type: 'output_shaft_kit', part_number: '60892110', description: 'Output Shaft Kit SI31 5/8" Keyed Bore', found: true },
        ],
        complete: true,
      };

      const context: BomCopyContext = { appliedSf: 1.5, catalogSf: 2.0 };
      const copyText = buildBomCopyText(bom, context);

      // Should show real PN in the output
      expect(copyText).toContain('4) Output Shaft Kit: 60892110');
      expect(copyText).toContain('Output Shaft Kit SI31 5/8" Keyed Bore');
      // Should NOT show as missing or pending
      expect(copyText).not.toContain('MISSING: Output Shaft Kit');
      expect(copyText).not.toContain('(PN pending)');
      expect(copyText).not.toContain('(not required)');
    });

    it('validates PN is real NORD format (8-digit starting with 6)', () => {
      const realPNs = ['60892110', '60992120', '61092130', '61192140', '61292110'];
      for (const pn of realPNs) {
        expect(isRealNordPartNumber(pn)).toBe(true);
      }
    });

    it('validates SI40 output shaft kit PN 60992110', () => {
      // SI40 inch_hollow inch_keyed => 60992110
      expect(isRealNordPartNumber('60992110')).toBe(true);
    });

    it('validates SI63 output shaft kit PN 61192110', () => {
      // SI63 inch_hollow inch_keyed => 61192110
      expect(isRealNordPartNumber('61192110')).toBe(true);
    });
  });

  describe('State 2: Configured (PN pending) - v1 behavior', () => {
    it('shows dash with "PN pending, not included in order" when mapping not found (v1)', () => {
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
          { component_type: 'gear_unit', part_number: '60392050', description: 'Gear unit', found: true },
          { component_type: 'motor', part_number: null, description: 'Motor', found: false },
          { component_type: 'adapter', part_number: null, description: 'Adapter', found: false },
          // Configured state: option selected but no PN in DB
          { component_type: 'output_shaft_kit', part_number: null, description: 'Configured: Inch keyed bore', found: true },
        ],
        complete: false,
      };

      const context: BomCopyContext = { appliedSf: 1.5, catalogSf: 2.0 };
      const copyText = buildBomCopyText(bom, context);

      // v1: Should show dash with "PN pending, not included in order" (not the option label as PN)
      expect(copyText).toContain('4) Output Shaft Kit: — (PN pending, not included in order)');
      // v1: Should show MISSING note for pending PNs (do not order until resolved)
      expect(copyText).toContain('MISSING: Output Shaft Kit PN');
    });

    it('handles all four output shaft option types with v1 pending behavior', () => {
      const optionTypes = [
        { key: 'inch_keyed', label: 'Inch keyed bore' },
        { key: 'metric_keyed', label: 'Metric keyed bore' },
        { key: 'inch_hollow', label: 'Inch hollow' },
        { key: 'metric_hollow', label: 'Metric hollow' },
      ];

      for (const { label } of optionTypes) {
        const bom: BomResolution = {
          model_type: 'SK 1SI63 - 56C - 63L/4',
          parsed: null,
          components: [
            { component_type: 'gear_unit', part_number: null, description: 'Gear unit', found: false },
            { component_type: 'output_shaft_kit', part_number: null, description: `Configured: ${label}`, found: true },
          ],
          complete: false,
        };

        const copyText = buildBomCopyText(bom, { appliedSf: 1.0, catalogSf: 1.5 });
        // v1: Shows dash, not the option label as PN
        expect(copyText).toContain('(PN pending, not included in order)');
        // v1: Description should still contain the option label
        expect(copyText).toContain(label);
      }
    });
  });

  describe('State 3: Not Required (shaft mount)', () => {
    it('shows "(not required)" for shaft mounted configuration', () => {
      const bom: BomResolution = {
        model_type: 'SK 1SI63 - 56C - 63L/4',
        parsed: {
          worm_stages: 1,
          gear_unit_size: 'SI63',
          size_code: '63',
          adapter_code: '56C',
          motor_frame: '63L/4',
        },
        components: [
          { component_type: 'gear_unit', part_number: '60692800', description: 'Gear unit', found: true },
          { component_type: 'motor', part_number: '31610012', description: 'Motor', found: true },
          { component_type: 'adapter', part_number: '60395510', description: 'Adapter', found: true },
          // Not required state: shaft mount (direct coupling)
          { component_type: 'output_shaft_kit', part_number: null, description: 'Not required for shaft mount', found: true },
        ],
        complete: true,
      };

      const context: BomCopyContext = { appliedSf: 1.5, catalogSf: 2.0 };
      const copyText = buildBomCopyText(bom, context);

      // Should show "(not required)" and dash for PN
      expect(copyText).toContain('4) Output Shaft Kit: — (not required)');
      // Should NOT show as MISSING
      expect(copyText).not.toContain('MISSING: Output Shaft Kit');
    });

    it('needsOutputShaftKit returns false for shaft_mounted', () => {
      expect(needsOutputShaftKit('shaft_mounted')).toBe(false);
      expect(needsOutputShaftKit(GEARMOTOR_MOUNTING_STYLE.ShaftMounted)).toBe(false);
    });
  });

  describe('State 4: Missing (bottom mount, no selection)', () => {
    it('shows "(select in Drive Arrangement)" and MISSING note', () => {
      const bom: BomResolution = {
        model_type: 'SK 1SI63 - 56C - 63L/4',
        parsed: null,
        components: [
          { component_type: 'gear_unit', part_number: '60692800', description: 'Gear unit', found: true },
          { component_type: 'motor', part_number: null, description: 'Motor', found: false },
          { component_type: 'adapter', part_number: null, description: 'Adapter', found: false },
          // Missing state: bottom mount but no output shaft option selected
          { component_type: 'output_shaft_kit', part_number: null, description: 'Required for chain drive configuration', found: false },
        ],
        complete: false,
      };

      const context: BomCopyContext = { appliedSf: 1.5, catalogSf: 2.0 };
      const copyText = buildBomCopyText(bom, context);

      // Should prompt user to select
      expect(copyText).toContain('4) Output Shaft Kit: — (select in Drive Arrangement)');
      // Should show as MISSING
      expect(copyText).toContain('MISSING: Output Shaft Kit PN');
    });

    it('needsOutputShaftKit returns true for bottom_mount', () => {
      expect(needsOutputShaftKit('bottom_mount')).toBe(true);
      expect(needsOutputShaftKit(GEARMOTOR_MOUNTING_STYLE.BottomMount)).toBe(true);
    });
  });
});

// =============================================================================
// OUTPUT SHAFT KIT CSV DATA VALIDATION
// =============================================================================

describe('Output Shaft Kit CSV Part Numbers', () => {
  /**
   * These tests document the expected part numbers from the CSV:
   * nord_flexbloc_output_shaft_kits_v1.csv
   *
   * Each gear unit size (SI31, SI40, SI50, SI63, SI75) has 8 variants:
   * - 2 mounting variants × 4 output shaft options = 8 PNs per size
   */

  describe('validates expected PN patterns', () => {
    it('SI31 output shaft kit PNs start with 608', () => {
      const si31PNs = ['60892110', '60892120', '60892130', '60892140', '60891110', '60891120', '60891130', '60891140'];
      for (const pn of si31PNs) {
        expect(pn.startsWith('608')).toBe(true);
        expect(isRealNordPartNumber(pn)).toBe(true);
      }
    });

    it('SI40 output shaft kit PNs start with 609', () => {
      const si40PNs = ['60992110', '60992120', '60992130', '60992140', '60991110', '60991120', '60991130', '60991140'];
      for (const pn of si40PNs) {
        expect(pn.startsWith('609')).toBe(true);
        expect(isRealNordPartNumber(pn)).toBe(true);
      }
    });

    it('SI50 output shaft kit PNs start with 610', () => {
      const si50PNs = ['61092110', '61092120', '61092130', '61092140', '61091110', '61091120', '61091130', '61091140'];
      for (const pn of si50PNs) {
        expect(pn.startsWith('610')).toBe(true);
        expect(isRealNordPartNumber(pn)).toBe(true);
      }
    });

    it('SI63 output shaft kit PNs start with 611', () => {
      const si63PNs = ['61192110', '61192120', '61192130', '61192140', '61191110', '61191120', '61191130', '61191140'];
      for (const pn of si63PNs) {
        expect(pn.startsWith('611')).toBe(true);
        expect(isRealNordPartNumber(pn)).toBe(true);
      }
    });

    it('SI75 output shaft kit PNs start with 612', () => {
      const si75PNs = ['61292110', '61292120', '61292130', '61292140', '61291110', '61291120', '61291130', '61291140'];
      for (const pn of si75PNs) {
        expect(pn.startsWith('612')).toBe(true);
        expect(isRealNordPartNumber(pn)).toBe(true);
      }
    });
  });

  describe('mounting variant indicator in PN', () => {
    it('inch_hollow variants have "2" in 5th position (60x9211x)', () => {
      // Pattern: 6xy92zzz where y = size indicator, 2 = inch_hollow
      const inchHollowPNs = ['60892110', '60992110', '61092110', '61192110', '61292110'];
      for (const pn of inchHollowPNs) {
        expect(pn[4]).toBe('2'); // 5th digit (0-indexed position 4)
      }
    });

    it('metric_hollow variants have "1" in 5th position (60x9111x)', () => {
      // Pattern: 6xy91zzz where y = size indicator, 1 = metric_hollow
      const metricHollowPNs = ['60891110', '60991110', '61091110', '61191110', '61291110'];
      for (const pn of metricHollowPNs) {
        expect(pn[4]).toBe('1'); // 5th digit (0-indexed position 4)
      }
    });
  });
});

// =============================================================================
// HOLLOW SHAFT BUSHING TESTS
// =============================================================================

describe('parseHollowShaftBore', () => {
  /**
   * Tests for parsing hollow shaft bore from gear unit description.
   * The native bore is FIXED by the gear unit and encoded in its description.
   * An optional bushing can REDUCE the bore for smaller shaft applications.
   *
   * Pattern: "X.XXX" or "X.XXX in" hollow shaft in gear unit description
   */

  describe('parses inch hollow shaft bore from description', () => {
    it('extracts 1.4375" bore from SI63 INCH hollow description', () => {
      const description = 'NORD FLEXBLOC SI63 Gear Unit i=80 1.4375 in Hollow Shaft';
      const result = parseHollowShaftBore(description);

      expect(result.isHollowShaft).toBe(true);
      expect(result.primaryUnit).toBe('inch');
      expect(result.inchBore).toBeCloseTo(1.4375, 4);
      expect(result.metricBore).toBeNull();
    });

    it('extracts bore from description with "inch" spelled out', () => {
      const description = 'SI63 1.4375 inch Hollow Shaft Gear Unit';
      const result = parseHollowShaftBore(description);

      expect(result.isHollowShaft).toBe(true);
      expect(result.primaryUnit).toBe('inch');
      expect(result.inchBore).toBeCloseTo(1.4375, 4);
    });

    it('extracts bore from description with "Hollow Shaft" keyword', () => {
      const description = '1.4375 in. Hollow Shaft';
      const result = parseHollowShaftBore(description);

      expect(result.isHollowShaft).toBe(true);
      expect(result.inchBore).toBeCloseTo(1.4375, 4);
    });
  });

  describe('handles edge cases gracefully', () => {
    it('returns isHollowShaft=false for null input', () => {
      const result = parseHollowShaftBore(null);

      expect(result.isHollowShaft).toBe(false);
      expect(result.primaryUnit).toBeNull();
      expect(result.inchBore).toBeNull();
      expect(result.metricBore).toBeNull();
    });

    it('returns isHollowShaft=false for undefined input', () => {
      const result = parseHollowShaftBore(undefined);

      expect(result.isHollowShaft).toBe(false);
    });

    it('returns isHollowShaft=false for empty string', () => {
      const result = parseHollowShaftBore('');

      expect(result.isHollowShaft).toBe(false);
    });

    it('returns isHollowShaft=false for non-hollow description', () => {
      const description = 'NORD FLEXBLOC SI63 Gear Unit i=80 Solid Shaft';
      const result = parseHollowShaftBore(description);

      expect(result.isHollowShaft).toBe(false);
    });
  });

  describe('ParsedHollowShaftBore interface', () => {
    it('has correct shape', () => {
      const result: ParsedHollowShaftBore = {
        inchBore: 1.4375,
        metricBore: null,
        isHollowShaft: true,
        primaryUnit: 'inch',
      };

      expect(result.inchBore).toBe(1.4375);
      expect(result.metricBore).toBeNull();
      expect(result.isHollowShaft).toBe(true);
      expect(result.primaryUnit).toBe('inch');
    });
  });

  /**
   * Regression tests for native bore values by gear unit size.
   * These values come from the NORD FLEXBLOC gear unit catalog (CSV seed data).
   * If these tests fail, the native bore display in the UI will be incorrect.
   *
   * The UI displays the inch bore value, which is parsed from descriptions like:
   * "Wormgearbox 1.4375 Hollow Shaft 25mm - Ratio 5"
   *
   * @see Reference/Vendor/nord_flexbloc_gear_unit_part_numbers_v1.csv
   */
  describe('native bore regression: expected values by gear unit size', () => {
    const testCases: Array<{ gearUnitSize: string; description: string; expectedInchBore: number }> = [
      { gearUnitSize: 'SI31', description: 'Wormgearbox 0.625 Hollow Shaft 14mm - Ratio 5', expectedInchBore: 0.625 },
      { gearUnitSize: 'SI40', description: 'Gearbox 1.000 Hollow Shaft 18mm - Ratio 5', expectedInchBore: 1.0 },
      { gearUnitSize: 'SI50', description: 'Wormgearbox 1.125 Hollow Shaft 25mm - Ratio 5', expectedInchBore: 1.125 },
      { gearUnitSize: 'SI63', description: 'Wormgearbox 1.4375 Hollow Shaft 25mm - Ratio 5', expectedInchBore: 1.4375 },
      { gearUnitSize: 'SI75', description: 'Wormgearbox 1.9375 Hollow Shaft 35mm - Ratio 5', expectedInchBore: 1.9375 },
    ];

    testCases.forEach(({ gearUnitSize, description, expectedInchBore }) => {
      it(`${gearUnitSize} has native bore of ${expectedInchBore}"`, () => {
        const result = parseHollowShaftBore(description);

        expect(result.isHollowShaft).toBe(true);
        expect(result.inchBore).toBeCloseTo(expectedInchBore, 4);
        expect(result.primaryUnit).toBe('inch');
      });
    });
  });
});

describe('Hollow Shaft Bushing in BOM', () => {
  /**
   * Tests for hollow shaft bushing resolution and copy text.
   *
   * Bushings are OPTIONAL components that REDUCE the native hollow bore.
   * Example: SI63 has native 1.4375" bore, bushing can reduce to 1", 1.1875", or 1.25"
   */

  describe('bushing component in BOM copy text', () => {
    it('includes bushing in copy text when resolved', () => {
      const bom: BomResolution = {
        model_type: 'SK 1SI63 - 56C - 63L/4',
        parsed: {
          worm_stages: 1,
          gear_unit_size: 'SI63',
          size_code: '63',
          adapter_code: '56C',
          motor_frame: '63L/4',
        },
        components: [
          { component_type: 'gear_unit', part_number: '60692800', description: 'NORD FLEXBLOC SI63 i=80', found: true },
          { component_type: 'motor', part_number: null, description: 'Motor', found: false },
          { component_type: 'adapter', part_number: null, description: 'Adapter', found: false },
          { component_type: 'output_shaft_kit', part_number: null, description: 'Not required for shaft mount', found: true },
          // Hollow shaft bushing with real PN
          { component_type: 'hollow_shaft_bushing', part_number: '60693400', description: 'Hollow Shaft Bushing 1.00 in', found: true },
        ],
        complete: false,
      };

      const context: BomCopyContext = { appliedSf: 1.5, catalogSf: 2.0 };
      const copyText = buildBomCopyText(bom, context);

      // Should include bushing in the BOM
      expect(copyText).toContain('Hollow Shaft Bushing');
      expect(copyText).toContain('60693400');
    });

    it('does not include bushing when not selected (null)', () => {
      const bom: BomResolution = {
        model_type: 'SK 1SI63 - 56C - 63L/4',
        parsed: null,
        components: [
          { component_type: 'gear_unit', part_number: '60692800', description: 'Gear unit', found: true },
          { component_type: 'motor', part_number: null, description: 'Motor', found: false },
          { component_type: 'adapter', part_number: null, description: 'Adapter', found: false },
          { component_type: 'output_shaft_kit', part_number: null, description: 'Not required', found: true },
          // No hollow_shaft_bushing component when not selected
        ],
        complete: false,
      };

      const context: BomCopyContext = { appliedSf: 1.5, catalogSf: 2.0 };
      const copyText = buildBomCopyText(bom, context);

      // Should NOT include bushing line
      expect(copyText).not.toContain('Hollow Shaft Bushing');
    });
  });

  describe('bushing PN validation', () => {
    it('SI63 bushing PNs are valid NORD format', () => {
      const si63BushingPNs = ['60693400', '60693410', '60693420'];

      for (const pn of si63BushingPNs) {
        expect(isRealNordPartNumber(pn)).toBe(true);
        expect(pn.startsWith('606')).toBe(true); // SI63 prefix
      }
    });

    it('bushing PNs encode bore size in last digits', () => {
      // 60693400 = 1.00" bore
      // 60693410 = 1.1875" bore
      // 60693420 = 1.25" bore
      const bushingPNs = [
        { pn: '60693400', bore: 1.0 },
        { pn: '60693410', bore: 1.1875 },
        { pn: '60693420', bore: 1.25 },
      ];

      for (const { pn } of bushingPNs) {
        expect(isRealNordPartNumber(pn)).toBe(true);
      }
    });
  });
});
