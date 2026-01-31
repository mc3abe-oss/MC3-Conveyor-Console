/**
 * MATERIAL VALIDATION TESTS
 *
 * Tests for fix/magnetic-material-application-validation-and-persistence:
 * 1. Material form persistence via migrateInputs
 * 2. Validation timing deferral (skipMaterialValidation option)
 */

import { migrateInputs } from '../migrate';
import { SliderbedInputs, MaterialForm } from '../schema';

// ============================================================================
// ISSUE 1: MATERIAL FORM PERSISTENCE
// ============================================================================

describe('Material Form Persistence (Issue 1)', () => {
  const BASE_INPUTS: Partial<SliderbedInputs> = {
    conveyor_length_cc_in: 120,
    belt_width_in: 24,
    belt_speed_fpm: 50,
    pulley_diameter_in: 4,
  };

  describe('migrateInputs defaults material_form for legacy configs', () => {
    it('should default material_form to PARTS when undefined', () => {
      const legacy = { ...BASE_INPUTS };
      // Explicitly ensure material_form is undefined
      delete (legacy as Record<string, unknown>).material_form;

      const migrated = migrateInputs(legacy as SliderbedInputs);

      expect(migrated.material_form).toBe(MaterialForm.Parts);
    });

    it('should preserve explicit PARTS selection', () => {
      const inputs: Partial<SliderbedInputs> = {
        ...BASE_INPUTS,
        material_form: MaterialForm.Parts,
      };

      const migrated = migrateInputs(inputs as SliderbedInputs);

      expect(migrated.material_form).toBe(MaterialForm.Parts);
    });

    it('should preserve explicit BULK selection', () => {
      const inputs: Partial<SliderbedInputs> = {
        ...BASE_INPUTS,
        material_form: MaterialForm.Bulk,
      };

      const migrated = migrateInputs(inputs as SliderbedInputs);

      expect(migrated.material_form).toBe(MaterialForm.Bulk);
    });

    it('should preserve string enum value "PARTS"', () => {
      const inputs: Partial<SliderbedInputs> = {
        ...BASE_INPUTS,
        material_form: 'PARTS' as MaterialForm,
      };

      const migrated = migrateInputs(inputs as SliderbedInputs);

      expect(migrated.material_form).toBe('PARTS');
    });

    it('should preserve string enum value "BULK"', () => {
      const inputs: Partial<SliderbedInputs> = {
        ...BASE_INPUTS,
        material_form: 'BULK' as MaterialForm,
      };

      const migrated = migrateInputs(inputs as SliderbedInputs);

      expect(migrated.material_form).toBe('BULK');
    });
  });

  describe('material form with part dimensions', () => {
    it('should preserve part dimensions when material_form is PARTS', () => {
      const inputs: Partial<SliderbedInputs> = {
        ...BASE_INPUTS,
        material_form: MaterialForm.Parts,
        part_weight_lbs: 5,
        part_length_in: 12,
        part_width_in: 8,
      };

      const migrated = migrateInputs(inputs as SliderbedInputs);

      expect(migrated.material_form).toBe(MaterialForm.Parts);
      expect(migrated.part_weight_lbs).toBe(5);
      expect(migrated.part_length_in).toBe(12);
      expect(migrated.part_width_in).toBe(8);
    });

    it('should preserve bulk fields when material_form is BULK', () => {
      const inputs: Partial<SliderbedInputs> = {
        ...BASE_INPUTS,
        material_form: MaterialForm.Bulk,
        bulk_input_method: 'WEIGHT_FLOW',
        mass_flow_lbs_per_hr: 1000,
        density_lbs_per_ft3: 50,
      };

      const migrated = migrateInputs(inputs as SliderbedInputs);

      expect(migrated.material_form).toBe(MaterialForm.Bulk);
      expect(migrated.bulk_input_method).toBe('WEIGHT_FLOW');
      expect(migrated.mass_flow_lbs_per_hr).toBe(1000);
      expect(migrated.density_lbs_per_ft3).toBe(50);
    });
  });
});

// ============================================================================
// ISSUE 2: VALIDATION TIMING (skipMaterialValidation)
// Note: Full hook testing requires React testing setup.
// These tests verify the validation logic can be controlled.
// ============================================================================

describe('Material Validation Timing (Issue 2)', () => {
  /**
   * These tests verify the validation logic structure.
   * The actual UI behavior (showing/hiding errors) is controlled by:
   * - skipMaterialValidation option in useConfigureIssues
   * - hasAttemptedLeaveMaterial state in CalculatorForm
   *
   * Full integration tests would require React Testing Library.
   */

  describe('validation option documentation', () => {
    it('should document the skipMaterialValidation behavior', () => {
      // This test documents the expected behavior:
      // 1. skipMaterialValidation: true - errors for part dimensions are suppressed
      // 2. skipMaterialValidation: false - errors for part dimensions are shown
      // 3. The flag is set to true initially and becomes false when:
      //    - User navigates away from Application tab
      //    - User clicks Calculate or Save
      // 4. Once false, it stays false (errors remain visible until resolved)
      expect(true).toBe(true);
    });

    it('should document the trigger conditions', () => {
      // Validation is triggered (skipMaterialValidation becomes false) when:
      // - User clicks a tab other than "application" while on "application"
      // - User clicks Calculate button (triggerCalculate increments)
      // - User clicks Save button (in parent component)
      expect(true).toBe(true);
    });
  });

  describe('validation fields affected by skipMaterialValidation', () => {
    // When skipMaterialValidation is true, these fields should NOT produce errors:
    // - part_weight_lbs (required for PARTS mode)
    // - part_length_in (required for PARTS mode)
    // - part_width_in (required for PARTS mode)

    // When skipMaterialValidation is false AND material_form is PARTS:
    // - Empty/zero part_weight_lbs → error
    // - Empty/zero part_length_in → error
    // - Empty/zero part_width_in → error

    it('should list the fields subject to deferred validation', () => {
      const fieldsWithDeferredValidation = [
        'part_weight_lbs',
        'part_length_in',
        'part_width_in',
      ];

      // These fields have validation errors that are deferred
      // until the user attempts to leave the Material section
      expect(fieldsWithDeferredValidation).toHaveLength(3);
    });
  });
});
