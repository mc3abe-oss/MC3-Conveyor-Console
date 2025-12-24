/**
 * Belt Catalog Tests (v1.11 Phase 3A)
 *
 * Tests for material_profile precedence, validation, and banding support.
 */

import {
  BeltCatalogItem,
  BeltMaterialProfile,
  getEffectiveMinPulleyDiameters,
  validateMaterialProfile,
} from './belt-catalog';

describe('getEffectiveMinPulleyDiameters', () => {
  const baseBelt: BeltCatalogItem = {
    id: 'test-1',
    catalog_key: 'TEST_BELT',
    display_name: 'Test Belt',
    manufacturer: 'Test Mfg',
    material: 'PVC',
    surface: null,
    food_grade: false,
    cut_resistant: false,
    oil_resistant: false,
    abrasion_resistant: false,
    antistatic: false,
    thickness_in: 0.1,
    piw: 0.12,
    pil: 0.08,
    min_pulley_dia_no_vguide_in: 3.0,
    min_pulley_dia_with_vguide_in: 4.0,
    notes: null,
    tags: null,
    is_active: true,
  };

  it('should use legacy columns when no material_profile exists', () => {
    const belt: BeltCatalogItem = { ...baseBelt };

    const result = getEffectiveMinPulleyDiameters(belt);

    expect(result.noVguide).toBe(3.0);
    expect(result.withVguide).toBe(4.0);
    expect(result.source).toBe('catalog');
  });

  it('should use legacy columns when material_profile is null', () => {
    const belt: BeltCatalogItem = { ...baseBelt, material_profile: null };

    const result = getEffectiveMinPulleyDiameters(belt);

    expect(result.noVguide).toBe(3.0);
    expect(result.withVguide).toBe(4.0);
    expect(result.source).toBe('catalog');
  });

  it('should use material_profile values when present', () => {
    const belt: BeltCatalogItem = {
      ...baseBelt,
      material_profile: {
        material_family: 'PVC',
        min_dia_no_vguide_in: 2.5,
        min_dia_with_vguide_in: 3.5,
      },
    };

    const result = getEffectiveMinPulleyDiameters(belt);

    expect(result.noVguide).toBe(2.5);
    expect(result.withVguide).toBe(3.5);
    expect(result.source).toBe('material_profile');
  });

  it('should fall back per-field when material_profile has partial values', () => {
    // Only min_dia_no_vguide_in set in profile
    const belt: BeltCatalogItem = {
      ...baseBelt,
      material_profile: {
        material_family: 'PU',
        min_dia_no_vguide_in: 2.5,
        // min_dia_with_vguide_in NOT set
      },
    };

    const result = getEffectiveMinPulleyDiameters(belt);

    expect(result.noVguide).toBe(2.5); // From profile
    expect(result.withVguide).toBe(4.0); // Falls back to legacy
    expect(result.source).toBe('material_profile'); // Because at least one field came from profile
  });

  it('should fall back per-field (only V-guided set in profile)', () => {
    const belt: BeltCatalogItem = {
      ...baseBelt,
      material_profile: {
        material_family: 'Rubber',
        // min_dia_no_vguide_in NOT set
        min_dia_with_vguide_in: 5.0,
      },
    };

    const result = getEffectiveMinPulleyDiameters(belt);

    expect(result.noVguide).toBe(3.0); // Falls back to legacy
    expect(result.withVguide).toBe(5.0); // From profile
    expect(result.source).toBe('material_profile');
  });

  it('should use legacy when material_profile exists but has no min values', () => {
    const belt: BeltCatalogItem = {
      ...baseBelt,
      material_profile: {
        material_family: 'Fabric',
        notes: 'No min values set',
        // Neither min_dia field set
      },
    };

    const result = getEffectiveMinPulleyDiameters(belt);

    expect(result.noVguide).toBe(3.0);
    expect(result.withVguide).toBe(4.0);
    expect(result.source).toBe('catalog'); // No profile fields used
  });
});

describe('validateMaterialProfile', () => {
  it('should accept null as valid (optional profile)', () => {
    const result = validateMaterialProfile(null);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should accept undefined as valid', () => {
    const result = validateMaterialProfile(undefined);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should accept valid complete profile', () => {
    const profile: BeltMaterialProfile = {
      material_family: 'PVC',
      construction: '2-ply',
      min_dia_no_vguide_in: 3.0,
      min_dia_with_vguide_in: 4.0,
      notes: 'Test notes',
      source_ref: 'Test spec v1',
    };

    const result = validateMaterialProfile(profile);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should accept valid minimal profile (only material_family)', () => {
    const profile = { material_family: 'PU' };

    const result = validateMaterialProfile(profile);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject profile without material_family', () => {
    const profile = { min_dia_no_vguide_in: 3.0 };

    const result = validateMaterialProfile(profile);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('material_family is required and must be a non-empty string');
  });

  it('should reject empty material_family', () => {
    const profile = { material_family: '  ' };

    const result = validateMaterialProfile(profile);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('material_family is required and must be a non-empty string');
  });

  it('should reject non-object profile', () => {
    const result = validateMaterialProfile('not an object');

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Material profile must be an object');
  });

  it('should reject negative min diameter values', () => {
    const profile = {
      material_family: 'PVC',
      min_dia_no_vguide_in: -1,
    };

    const result = validateMaterialProfile(profile);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('min_dia_no_vguide_in must be >= 0');
  });

  it('should reject excessively large min diameter values (> 60")', () => {
    const profile = {
      material_family: 'PVC',
      min_dia_with_vguide_in: 100,
    };

    const result = validateMaterialProfile(profile);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('min_dia_with_vguide_in must be <= 60 inches');
  });

  it('should reject non-numeric min diameter values', () => {
    const profile = {
      material_family: 'PVC',
      min_dia_no_vguide_in: 'three',
    };

    const result = validateMaterialProfile(profile);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('min_dia_no_vguide_in must be a number');
  });

  it('should reject non-string optional fields', () => {
    const profile = {
      material_family: 'PVC',
      construction: 123,
      notes: { invalid: true },
    };

    const result = validateMaterialProfile(profile);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('construction must be a string');
    expect(result.errors).toContain('notes must be a string');
  });

  it('should collect multiple errors', () => {
    const profile = {
      // Missing material_family
      min_dia_no_vguide_in: -5,
      min_dia_with_vguide_in: 'invalid',
      construction: 123,
    };

    const result = validateMaterialProfile(profile);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
  });

  // =========================================================================
  // Phase 3A: Banding validation tests
  // =========================================================================

  it('should accept valid banding profile with supports_banding true', () => {
    const profile: BeltMaterialProfile = {
      material_family: 'PU',
      supports_banding: true,
      banding_min_dia_no_vguide_in: 4.0,
      banding_min_dia_with_vguide_in: 5.0,
    };

    const result = validateMaterialProfile(profile);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject banding_min_dia_* when supports_banding is false', () => {
    const profile = {
      material_family: 'PVC',
      supports_banding: false,
      banding_min_dia_no_vguide_in: 4.0,
    };

    const result = validateMaterialProfile(profile);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('banding_min_dia_* fields require supports_banding to be true');
  });

  it('should reject banding_min_dia_* when supports_banding is missing', () => {
    const profile = {
      material_family: 'PVC',
      // supports_banding NOT set
      banding_min_dia_with_vguide_in: 5.0,
    };

    const result = validateMaterialProfile(profile);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('banding_min_dia_* fields require supports_banding to be true');
  });

  it('should accept profile with supports_banding true but no banding mins', () => {
    const profile: BeltMaterialProfile = {
      material_family: 'Rubber',
      supports_banding: true,
      // No banding_min_dia_* fields - valid, just means no specific requirements
    };

    const result = validateMaterialProfile(profile);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid banding min diameter values', () => {
    const profile = {
      material_family: 'PU',
      supports_banding: true,
      banding_min_dia_no_vguide_in: -1,
      banding_min_dia_with_vguide_in: 100,
    };

    const result = validateMaterialProfile(profile);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('banding_min_dia_no_vguide_in must be >= 0');
    expect(result.errors).toContain('banding_min_dia_with_vguide_in must be <= 60 inches');
  });

  it('should accept legacy profile without any banding fields', () => {
    const profile: BeltMaterialProfile = {
      material_family: 'PVC',
      min_dia_no_vguide_in: 3.0,
      min_dia_with_vguide_in: 4.0,
      // No banding fields at all - legacy profile
    };

    const result = validateMaterialProfile(profile);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// =========================================================================
// Phase 3A: Banding info in getEffectiveMinPulleyDiameters
// =========================================================================

describe('getEffectiveMinPulleyDiameters - banding info', () => {
  const baseBelt: BeltCatalogItem = {
    id: 'test-1',
    catalog_key: 'TEST_BELT',
    display_name: 'Test Belt',
    manufacturer: 'Test Mfg',
    material: 'PVC',
    surface: null,
    food_grade: false,
    cut_resistant: false,
    oil_resistant: false,
    abrasion_resistant: false,
    antistatic: false,
    thickness_in: 0.1,
    piw: 0.12,
    pil: 0.08,
    min_pulley_dia_no_vguide_in: 3.0,
    min_pulley_dia_with_vguide_in: 4.0,
    notes: null,
    tags: null,
    is_active: true,
  };

  it('should return banding.supported = false for legacy belt without profile', () => {
    const belt: BeltCatalogItem = { ...baseBelt };

    const result = getEffectiveMinPulleyDiameters(belt);

    expect(result.banding.supported).toBe(false);
    expect(result.banding.minNoVguide).toBeUndefined();
    expect(result.banding.minWithVguide).toBeUndefined();
  });

  it('should return banding.supported = false for profile without supports_banding', () => {
    const belt: BeltCatalogItem = {
      ...baseBelt,
      material_profile: {
        material_family: 'PVC',
        min_dia_no_vguide_in: 2.5,
      },
    };

    const result = getEffectiveMinPulleyDiameters(belt);

    expect(result.banding.supported).toBe(false);
  });

  it('should return banding.supported = true with banding mins when profile has them', () => {
    const belt: BeltCatalogItem = {
      ...baseBelt,
      material_profile: {
        material_family: 'PU',
        supports_banding: true,
        banding_min_dia_no_vguide_in: 4.0,
        banding_min_dia_with_vguide_in: 5.0,
      },
    };

    const result = getEffectiveMinPulleyDiameters(belt);

    expect(result.banding.supported).toBe(true);
    expect(result.banding.minNoVguide).toBe(4.0);
    expect(result.banding.minWithVguide).toBe(5.0);
  });

  it('should return banding.supported = true but undefined mins when only flag is set', () => {
    const belt: BeltCatalogItem = {
      ...baseBelt,
      material_profile: {
        material_family: 'Rubber',
        supports_banding: true,
        // No banding_min_dia_* fields
      },
    };

    const result = getEffectiveMinPulleyDiameters(belt);

    expect(result.banding.supported).toBe(true);
    expect(result.banding.minNoVguide).toBeUndefined();
    expect(result.banding.minWithVguide).toBeUndefined();
  });

  it('should return partial banding mins when only one is set', () => {
    const belt: BeltCatalogItem = {
      ...baseBelt,
      material_profile: {
        material_family: 'PU',
        supports_banding: true,
        banding_min_dia_with_vguide_in: 6.0,
        // banding_min_dia_no_vguide_in NOT set
      },
    };

    const result = getEffectiveMinPulleyDiameters(belt);

    expect(result.banding.supported).toBe(true);
    expect(result.banding.minNoVguide).toBeUndefined();
    expect(result.banding.minWithVguide).toBe(6.0);
  });
});
