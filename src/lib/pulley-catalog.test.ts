/**
 * Pulley Catalog Tests (v1.15)
 *
 * Tests for pulley catalog types, filtering, and validation.
 * Critical tests for INTERNAL_BEARINGS tail-only constraint.
 */

import {
  getEffectiveDiameter,
  isStationCompatible,
  hasInternalBearings,
  filterPulleys,
  getCompatiblePulleys,
  selectBestPulley,
  validatePulleyCatalogItem,
  PulleyCatalogItem,
  PulleyFilterCriteria,
} from './pulley-catalog';

// =============================================================================
// TEST DATA
// =============================================================================

const STANDARD_DRUM_4: PulleyCatalogItem = {
  id: '1',
  catalog_key: 'STD_DRUM_4_STEEL',
  display_name: 'Standard 4" Steel Drum',
  manufacturer: 'Generic',
  part_number: null,
  diameter_in: 4,
  face_width_max_in: 24,
  face_width_min_in: 6,
  crown_height_in: 0.0625,
  construction: 'DRUM',
  shell_material: 'steel',
  is_lagged: false,
  lagging_type: null,
  lagging_thickness_in: null,
  shaft_arrangement: 'THROUGH_SHAFT_EXTERNAL_BEARINGS',
  hub_connection: 'KEYED',
  allow_head_drive: true,
  allow_tail: true,
  allow_snub: true,
  allow_bend: true,
  allow_takeup: true,
  dirty_side_ok: true,
  max_shaft_rpm: null,
  max_belt_speed_fpm: 800,
  max_tension_pli: null,
  is_preferred: true,
  is_active: true,
  notes: null,
  tags: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const INTERNAL_BEARING_TAIL: PulleyCatalogItem = {
  ...STANDARD_DRUM_4,
  id: '2',
  catalog_key: 'INTERNAL_BEARING_TAIL_4',
  display_name: 'Internal Bearing Tail 4"',
  shaft_arrangement: 'INTERNAL_BEARINGS',
  hub_connection: 'SET_SCREW',
  allow_head_drive: false,
  allow_tail: true,
  allow_snub: false,
  allow_bend: false,
  allow_takeup: false,
  face_width_max_in: 18,
  max_belt_speed_fpm: 500,
  is_preferred: false,
};

const LAGGED_DRUM_4: PulleyCatalogItem = {
  ...STANDARD_DRUM_4,
  id: '3',
  catalog_key: 'LAGGED_DRUM_4_RUBBER',
  display_name: 'Lagged 4" Drum',
  is_lagged: true,
  lagging_type: 'rubber',
  lagging_thickness_in: 0.25,
  allow_snub: false,
  allow_bend: false,
  allow_takeup: false,
  is_preferred: false,
};

const WING_TAIL: PulleyCatalogItem = {
  ...STANDARD_DRUM_4,
  id: '4',
  catalog_key: 'WING_TAIL_4',
  display_name: 'Wing Tail Pulley 4"',
  construction: 'WING',
  crown_height_in: 0,
  face_width_max_in: 18,
  allow_head_drive: false,
  allow_tail: true,
  allow_snub: false,
  allow_bend: false,
  allow_takeup: false,
  max_belt_speed_fpm: 600,
  is_preferred: false,
};

const STANDARD_DRUM_6: PulleyCatalogItem = {
  ...STANDARD_DRUM_4,
  id: '5',
  catalog_key: 'STD_DRUM_6_STEEL',
  display_name: 'Standard 6" Steel Drum',
  diameter_in: 6,
  face_width_max_in: 36,
  face_width_min_in: 8,
  hub_connection: 'TAPER_LOCK',
  is_preferred: true,
};

const ALL_PULLEYS = [
  STANDARD_DRUM_4,
  INTERNAL_BEARING_TAIL,
  LAGGED_DRUM_4,
  WING_TAIL,
  STANDARD_DRUM_6,
];

// =============================================================================
// TESTS: Effective Diameter
// =============================================================================

describe('getEffectiveDiameter', () => {
  it('returns base diameter for non-lagged pulley', () => {
    expect(getEffectiveDiameter(STANDARD_DRUM_4)).toBe(4);
  });

  it('returns base diameter for 6" pulley', () => {
    expect(getEffectiveDiameter(STANDARD_DRUM_6)).toBe(6);
  });

  it('adds 2x lagging thickness for lagged pulley', () => {
    // 4" + 0.25" * 2 = 4.5"
    expect(getEffectiveDiameter(LAGGED_DRUM_4)).toBe(4.5);
  });

  it('handles null lagging thickness', () => {
    const pulley = { ...STANDARD_DRUM_4, is_lagged: true, lagging_thickness_in: null };
    expect(getEffectiveDiameter(pulley)).toBe(4);
  });
});

// =============================================================================
// TESTS: Station Compatibility
// =============================================================================

describe('isStationCompatible', () => {
  describe('standard drum (all stations)', () => {
    it('allows head_drive', () => {
      expect(isStationCompatible(STANDARD_DRUM_4, 'head_drive')).toBe(true);
    });

    it('allows tail', () => {
      expect(isStationCompatible(STANDARD_DRUM_4, 'tail')).toBe(true);
    });

    it('allows snub', () => {
      expect(isStationCompatible(STANDARD_DRUM_4, 'snub')).toBe(true);
    });

    it('allows bend', () => {
      expect(isStationCompatible(STANDARD_DRUM_4, 'bend')).toBe(true);
    });

    it('allows takeup', () => {
      expect(isStationCompatible(STANDARD_DRUM_4, 'takeup')).toBe(true);
    });
  });

  describe('internal bearing (tail only)', () => {
    it('does NOT allow head_drive', () => {
      expect(isStationCompatible(INTERNAL_BEARING_TAIL, 'head_drive')).toBe(false);
    });

    it('allows tail', () => {
      expect(isStationCompatible(INTERNAL_BEARING_TAIL, 'tail')).toBe(true);
    });

    it('does NOT allow snub', () => {
      expect(isStationCompatible(INTERNAL_BEARING_TAIL, 'snub')).toBe(false);
    });

    it('does NOT allow bend', () => {
      expect(isStationCompatible(INTERNAL_BEARING_TAIL, 'bend')).toBe(false);
    });

    it('does NOT allow takeup', () => {
      expect(isStationCompatible(INTERNAL_BEARING_TAIL, 'takeup')).toBe(false);
    });
  });

  describe('wing pulley (tail only)', () => {
    it('does NOT allow head_drive', () => {
      expect(isStationCompatible(WING_TAIL, 'head_drive')).toBe(false);
    });

    it('allows tail', () => {
      expect(isStationCompatible(WING_TAIL, 'tail')).toBe(true);
    });
  });
});

// =============================================================================
// TESTS: hasInternalBearings
// =============================================================================

describe('hasInternalBearings', () => {
  it('returns true for INTERNAL_BEARINGS shaft arrangement', () => {
    expect(hasInternalBearings(INTERNAL_BEARING_TAIL)).toBe(true);
  });

  it('returns false for THROUGH_SHAFT_EXTERNAL_BEARINGS', () => {
    expect(hasInternalBearings(STANDARD_DRUM_4)).toBe(false);
  });

  it('returns false for STUB_SHAFT_EXTERNAL_BEARINGS', () => {
    const stubShaft = {
      ...STANDARD_DRUM_4,
      shaft_arrangement: 'STUB_SHAFT_EXTERNAL_BEARINGS' as const,
    };
    expect(hasInternalBearings(stubShaft)).toBe(false);
  });
});

// =============================================================================
// TESTS: INTERNAL_BEARINGS Constraint (CRITICAL)
// =============================================================================

describe('INTERNAL_BEARINGS constraint', () => {
  it('returns error when internal bearing used at head_drive', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'head_drive',
      face_width_required_in: 12,
    };

    const results = filterPulleys([INTERNAL_BEARING_TAIL], criteria);
    expect(results.length).toBe(1);

    const issues = results[0].issues;
    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'INTERNAL_BEARINGS_TAIL_ONLY',
        severity: 'error',
      })
    );
  });

  it('returns error when internal bearing used at snub', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'snub',
      face_width_required_in: 12,
    };

    const results = filterPulleys([INTERNAL_BEARING_TAIL], criteria);
    expect(results[0].issues.some((i) => i.code === 'INTERNAL_BEARINGS_TAIL_ONLY')).toBe(
      true
    );
  });

  it('returns error when internal bearing used at bend', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'bend',
      face_width_required_in: 12,
    };

    const results = filterPulleys([INTERNAL_BEARING_TAIL], criteria);
    expect(results[0].issues.some((i) => i.code === 'INTERNAL_BEARINGS_TAIL_ONLY')).toBe(
      true
    );
  });

  it('returns error when internal bearing used at takeup', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'takeup',
      face_width_required_in: 12,
    };

    const results = filterPulleys([INTERNAL_BEARING_TAIL], criteria);
    expect(results[0].issues.some((i) => i.code === 'INTERNAL_BEARINGS_TAIL_ONLY')).toBe(
      true
    );
  });

  it('allows internal bearing at tail with NO internal bearing error', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'tail',
      face_width_required_in: 12,
    };

    const results = filterPulleys([INTERNAL_BEARING_TAIL], criteria);
    const internalBearingErrors = results[0].issues.filter(
      (i) => i.code === 'INTERNAL_BEARINGS_TAIL_ONLY'
    );

    expect(internalBearingErrors).toHaveLength(0);
  });

  it('internal bearing at tail passes with no hard errors', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'tail',
      face_width_required_in: 12,
    };

    const results = filterPulleys([INTERNAL_BEARING_TAIL], criteria);
    const errors = results[0].issues.filter((i) => i.severity === 'error');

    expect(errors).toHaveLength(0);
  });
});

// =============================================================================
// TESTS: Face Width Constraint
// =============================================================================

describe('Face width constraint', () => {
  it('returns error when face width exceeds max', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'head_drive',
      face_width_required_in: 30, // Exceeds 24" max
    };

    const results = filterPulleys([STANDARD_DRUM_4], criteria);

    expect(results[0].issues).toContainEqual(
      expect.objectContaining({
        code: 'FACE_WIDTH_EXCEEDED',
        severity: 'error',
      })
    );
  });

  it('allows face width within max', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'head_drive',
      face_width_required_in: 18,
    };

    const results = filterPulleys([STANDARD_DRUM_4], criteria);
    const faceWidthErrors = results[0].issues.filter(
      (i) => i.code === 'FACE_WIDTH_EXCEEDED'
    );

    expect(faceWidthErrors).toHaveLength(0);
  });

  it('returns error when face width below min', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'head_drive',
      face_width_required_in: 4, // Below 6" min
    };

    const results = filterPulleys([STANDARD_DRUM_4], criteria);

    expect(results[0].issues).toContainEqual(
      expect.objectContaining({
        code: 'FACE_WIDTH_BELOW_MIN',
        severity: 'error',
      })
    );
  });

  it('blocks wing pulley when face width exceeds its limit', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'tail',
      face_width_required_in: 20, // Exceeds wing's 18" max
    };

    const results = filterPulleys([WING_TAIL], criteria);

    expect(results[0].issues).toContainEqual(
      expect.objectContaining({
        code: 'FACE_WIDTH_EXCEEDED',
        severity: 'error',
      })
    );
  });
});

// =============================================================================
// TESTS: Diameter Constraint (Belt Minimum)
// =============================================================================

describe('Diameter constraint (belt minimum)', () => {
  it('returns error when diameter below belt minimum', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'head_drive',
      face_width_required_in: 12,
      min_diameter_in: 5, // 4" pulley is too small
    };

    const results = filterPulleys([STANDARD_DRUM_4], criteria);

    expect(results[0].issues).toContainEqual(
      expect.objectContaining({
        code: 'DIAMETER_TOO_SMALL',
        severity: 'error',
      })
    );
  });

  it('allows diameter at or above belt minimum', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'head_drive',
      face_width_required_in: 12,
      min_diameter_in: 4,
    };

    const results = filterPulleys([STANDARD_DRUM_4], criteria);
    const diameterErrors = results[0].issues.filter(
      (i) => i.code === 'DIAMETER_TOO_SMALL'
    );

    expect(diameterErrors).toHaveLength(0);
  });

  it('lagged pulley effective diameter counts for minimum', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'head_drive',
      face_width_required_in: 12,
      min_diameter_in: 4.5, // Lagged 4" = 4.5" effective
    };

    const results = filterPulleys([LAGGED_DRUM_4], criteria);
    const diameterErrors = results[0].issues.filter(
      (i) => i.code === 'DIAMETER_TOO_SMALL'
    );

    expect(diameterErrors).toHaveLength(0);
  });
});

// =============================================================================
// TESTS: Speed Limit (B105.1)
// =============================================================================

describe('B105.1 speed limit', () => {
  it('warns when belt speed exceeds pulley limit', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'head_drive',
      face_width_required_in: 12,
      belt_speed_fpm: 900, // Exceeds 800 fpm
    };

    const results = filterPulleys([STANDARD_DRUM_4], criteria);

    expect(results[0].issues).toContainEqual(
      expect.objectContaining({
        code: 'SPEED_LIMIT_EXCEEDED',
        severity: 'warning', // Warning, not error
      })
    );
  });

  it('no warning when speed within limit', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'head_drive',
      face_width_required_in: 12,
      belt_speed_fpm: 750,
    };

    const results = filterPulleys([STANDARD_DRUM_4], criteria);
    const speedWarnings = results[0].issues.filter(
      (i) => i.code === 'SPEED_LIMIT_EXCEEDED'
    );

    expect(speedWarnings).toHaveLength(0);
  });

  it('no warning when pulley has no speed limit', () => {
    const noLimitPulley = { ...STANDARD_DRUM_4, max_belt_speed_fpm: null };
    const criteria: PulleyFilterCriteria = {
      station: 'head_drive',
      face_width_required_in: 12,
      belt_speed_fpm: 2000,
    };

    const results = filterPulleys([noLimitPulley], criteria);
    const speedWarnings = results[0].issues.filter(
      (i) => i.code === 'SPEED_LIMIT_EXCEEDED'
    );

    expect(speedWarnings).toHaveLength(0);
  });
});

// =============================================================================
// TESTS: Filtering & Sorting
// =============================================================================

describe('filterPulleys sorting', () => {
  it('sorts preferred pulleys first among valid options', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'head_drive',
      face_width_required_in: 12,
    };

    const results = filterPulleys(ALL_PULLEYS, criteria);
    const validResults = results.filter(
      (r) => !r.issues.some((i) => i.severity === 'error')
    );

    // First valid result should be preferred
    expect(validResults.length).toBeGreaterThan(0);
    expect(validResults[0].pulley.is_preferred).toBe(true);
  });

  it('sorts errors to the end', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'head_drive',
      face_width_required_in: 12,
    };

    const results = filterPulleys(ALL_PULLEYS, criteria);

    // Results with errors should be at the end
    const lastResult = results[results.length - 1];
    expect(lastResult.issues.some((i) => i.severity === 'error')).toBe(true);
  });

  it('filters by exact diameter when specified', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'head_drive',
      face_width_required_in: 12,
      diameter_in: 6,
    };

    const results = filterPulleys(ALL_PULLEYS, criteria);

    // Should only include 6" pulleys
    expect(results.every((r) => r.effective_diameter_in === 6)).toBe(true);
  });

  it('filters by construction when specified', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'tail',
      face_width_required_in: 12,
      construction: 'WING',
    };

    const results = filterPulleys(ALL_PULLEYS, criteria);

    expect(results.length).toBe(1);
    expect(results[0].pulley.construction).toBe('WING');
  });
});

// =============================================================================
// TESTS: getCompatiblePulleys
// =============================================================================

describe('getCompatiblePulleys', () => {
  it('returns only pulleys with no errors', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'head_drive',
      face_width_required_in: 12,
    };

    const compatible = getCompatiblePulleys(ALL_PULLEYS, criteria);

    // Internal bearing and wing (head_drive = false) should be excluded
    expect(compatible.some((p) => p.catalog_key === 'INTERNAL_BEARING_TAIL_4')).toBe(
      false
    );
    expect(compatible.some((p) => p.catalog_key === 'WING_TAIL_4')).toBe(false);
  });

  it('returns all tail-compatible pulleys at tail station', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'tail',
      face_width_required_in: 12,
    };

    const compatible = getCompatiblePulleys(ALL_PULLEYS, criteria);

    // All 5 pulleys should be compatible at tail with 12" width
    expect(compatible.length).toBe(5);
  });
});

// =============================================================================
// TESTS: selectBestPulley
// =============================================================================

describe('selectBestPulley', () => {
  it('selects preferred pulley when valid', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'head_drive',
      face_width_required_in: 12,
    };

    const best = selectBestPulley(ALL_PULLEYS, criteria);

    expect(best).not.toBeNull();
    expect(best!.pulley.is_preferred).toBe(true);
  });

  it('returns null when no valid pulleys', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'head_drive',
      face_width_required_in: 50, // Exceeds all max face widths
    };

    const best = selectBestPulley(ALL_PULLEYS, criteria);

    expect(best).toBeNull();
  });

  it('selects smallest diameter among preferred', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'head_drive',
      face_width_required_in: 12,
    };

    const best = selectBestPulley(ALL_PULLEYS, criteria);

    // Should be 4" preferred (smaller than 6")
    expect(best!.pulley.diameter_in).toBe(4);
  });
});

// =============================================================================
// TESTS: Admin Validation
// =============================================================================

describe('validatePulleyCatalogItem', () => {
  describe('required fields', () => {
    it('rejects missing catalog_key', () => {
      const invalid = { ...STANDARD_DRUM_4, catalog_key: '' };
      const result = validatePulleyCatalogItem(invalid);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Catalog key is required');
    });

    it('rejects missing display_name', () => {
      const invalid = { ...STANDARD_DRUM_4, display_name: '' };
      const result = validatePulleyCatalogItem(invalid);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Display name is required');
    });

    it('rejects zero diameter', () => {
      const invalid = { ...STANDARD_DRUM_4, diameter_in: 0 };
      const result = validatePulleyCatalogItem(invalid);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Diameter must be positive');
    });

    it('rejects negative face_width_max', () => {
      const invalid = { ...STANDARD_DRUM_4, face_width_max_in: -5 };
      const result = validatePulleyCatalogItem(invalid);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Face width max must be positive');
    });
  });

  describe('INTERNAL_BEARINGS constraint', () => {
    it('rejects internal bearing with allow_head_drive', () => {
      const invalid = {
        ...INTERNAL_BEARING_TAIL,
        allow_head_drive: true,
      };

      const result = validatePulleyCatalogItem(invalid);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Internal bearing pulleys cannot be used as head/drive'
      );
    });

    it('rejects internal bearing with allow_snub', () => {
      const invalid = {
        ...INTERNAL_BEARING_TAIL,
        allow_snub: true,
      };

      const result = validatePulleyCatalogItem(invalid);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Internal bearing pulleys cannot be used as snub'
      );
    });

    it('rejects internal bearing with allow_bend', () => {
      const invalid = {
        ...INTERNAL_BEARING_TAIL,
        allow_bend: true,
      };

      const result = validatePulleyCatalogItem(invalid);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Internal bearing pulleys cannot be used as bend'
      );
    });

    it('rejects internal bearing with allow_takeup', () => {
      const invalid = {
        ...INTERNAL_BEARING_TAIL,
        allow_takeup: true,
      };

      const result = validatePulleyCatalogItem(invalid);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Internal bearing pulleys cannot be used as takeup'
      );
    });

    it('rejects internal bearing without allow_tail', () => {
      const invalid = {
        ...INTERNAL_BEARING_TAIL,
        allow_tail: false,
      };

      const result = validatePulleyCatalogItem(invalid);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Internal bearing pulleys must allow tail position'
      );
    });

    it('accepts valid internal bearing (tail only)', () => {
      const result = validatePulleyCatalogItem(INTERNAL_BEARING_TAIL);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('lagging constraint', () => {
    it('rejects lagged pulley without thickness', () => {
      const invalid = {
        ...LAGGED_DRUM_4,
        lagging_thickness_in: null,
      };

      const result = validatePulleyCatalogItem(invalid);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Lagging thickness required when lagged');
    });

    it('rejects negative lagging thickness', () => {
      const invalid = {
        ...LAGGED_DRUM_4,
        lagging_thickness_in: -0.1,
      };

      const result = validatePulleyCatalogItem(invalid);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Lagging thickness must be non-negative');
    });

    it('accepts valid lagged pulley', () => {
      const result = validatePulleyCatalogItem(LAGGED_DRUM_4);

      expect(result.isValid).toBe(true);
    });
  });

  describe('face width range', () => {
    it('rejects face_width_min > face_width_max', () => {
      const invalid = {
        ...STANDARD_DRUM_4,
        face_width_min_in: 30,
        face_width_max_in: 24,
      };

      const result = validatePulleyCatalogItem(invalid);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Face width min cannot exceed max');
    });
  });

  describe('valid pulleys', () => {
    it('accepts valid standard pulley', () => {
      const result = validatePulleyCatalogItem(STANDARD_DRUM_4);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts valid wing pulley', () => {
      const result = validatePulleyCatalogItem(WING_TAIL);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

// =============================================================================
// TESTS: Full Selection Scenarios
// =============================================================================

describe('Full selection scenarios', () => {
  it('selects correct pulleys for 18" belt at 750 fpm head drive', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'head_drive',
      face_width_required_in: 18,
      belt_speed_fpm: 750,
    };

    const results = filterPulleys(ALL_PULLEYS, criteria);
    const compatible = results.filter(
      (r) => !r.issues.some((i) => i.severity === 'error')
    );

    // Standard drum 4", lagged drum 4", standard drum 6" should be compatible
    expect(compatible.length).toBe(3);
    expect(compatible.map((r) => r.pulley.catalog_key)).toContain('STD_DRUM_4_STEEL');
    expect(compatible.map((r) => r.pulley.catalog_key)).toContain('LAGGED_DRUM_4_RUBBER');
    expect(compatible.map((r) => r.pulley.catalog_key)).toContain('STD_DRUM_6_STEEL');
  });

  it('handles tail position with narrow belt', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'tail',
      face_width_required_in: 12,
      belt_speed_fpm: 400,
    };

    const results = filterPulleys(ALL_PULLEYS, criteria);
    const compatible = results.filter(
      (r) => !r.issues.some((i) => i.severity === 'error')
    );

    // All 5 pulleys should be compatible at tail with 12" width
    expect(compatible.length).toBe(5);
  });

  it('excludes pulleys with face width exceeded', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'tail',
      face_width_required_in: 20, // Exceeds wing and internal bearing 18" max
    };

    const results = filterPulleys(ALL_PULLEYS, criteria);
    const compatible = results.filter(
      (r) => !r.issues.some((i) => i.severity === 'error')
    );

    // Wing and internal bearing should be excluded
    expect(compatible.some((r) => r.pulley.catalog_key === 'WING_TAIL_4')).toBe(false);
    expect(
      compatible.some((r) => r.pulley.catalog_key === 'INTERNAL_BEARING_TAIL_4')
    ).toBe(false);
  });

  it('respects belt minimum diameter requirement', () => {
    const criteria: PulleyFilterCriteria = {
      station: 'head_drive',
      face_width_required_in: 12,
      min_diameter_in: 5, // Excludes all 4" pulleys
    };

    const compatible = getCompatiblePulleys(ALL_PULLEYS, criteria);

    // Only 6" drum should pass
    expect(compatible.length).toBe(1);
    expect(compatible[0].catalog_key).toBe('STD_DRUM_6_STEEL');
  });
});
