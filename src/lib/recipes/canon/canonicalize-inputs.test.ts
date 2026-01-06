/**
 * Tests for recipe input canonicalization.
 */

import {
  canonicalizeRecipeInputs,
  getCanonicalizedDenylist,
} from './canonicalize-inputs';

describe('canonicalizeRecipeInputs', () => {
  describe('speed_mode gating', () => {
    it('should remove drive_rpm_input when speed_mode=belt_speed', () => {
      const raw = {
        speed_mode: 'belt_speed',
        belt_speed_fpm: 100,
        drive_rpm_input: 150, // Should be removed - contradicts belt_speed mode
      };

      const { userInputs, removedKeys } = canonicalizeRecipeInputs(raw);

      expect(userInputs.speed_mode).toBe('belt_speed');
      expect(userInputs.belt_speed_fpm).toBe(100);
      expect(userInputs.drive_rpm_input).toBeUndefined();
      expect(removedKeys.some(r => r.key === 'drive_rpm_input')).toBe(true);
    });

    it('should remove drive_rpm (legacy alias) when speed_mode=belt_speed', () => {
      const raw = {
        speed_mode: 'belt_speed',
        belt_speed_fpm: 100,
        drive_rpm: 150, // Legacy alias - should be aliased then removed
      };

      const { userInputs, removedKeys } = canonicalizeRecipeInputs(raw);

      expect(userInputs.drive_rpm).toBeUndefined();
      expect(userInputs.drive_rpm_input).toBeUndefined(); // Also removed by mode gating
      // drive_rpm is first aliased to drive_rpm_input, then removed by mode gating
      expect(removedKeys.some(r => r.key === 'drive_rpm')).toBe(true);
    });

    it('should keep belt_speed_fpm when speed_mode=drive_rpm', () => {
      const raw = {
        speed_mode: 'drive_rpm',
        drive_rpm_input: 150,
        belt_speed_fpm: 100, // Kept (for display, not contradicting)
      };

      const { userInputs } = canonicalizeRecipeInputs(raw);

      expect(userInputs.speed_mode).toBe('drive_rpm');
      expect(userInputs.drive_rpm_input).toBe(150);
      expect(userInputs.belt_speed_fpm).toBe(100);
    });

    it('should keep drive_rpm_input when speed_mode=drive_rpm', () => {
      const raw = {
        speed_mode: 'drive_rpm',
        drive_rpm_input: 150,
      };

      const { userInputs } = canonicalizeRecipeInputs(raw);

      expect(userInputs.drive_rpm_input).toBe(150);
    });
  });

  describe('alias mapping', () => {
    it('should map drive_rpm to drive_rpm_input when not in belt_speed mode', () => {
      const raw = {
        speed_mode: 'drive_rpm',
        drive_rpm: 100, // Legacy key
      };

      const { userInputs, removedKeys } = canonicalizeRecipeInputs(raw);

      expect(userInputs.drive_rpm).toBeUndefined();
      expect(userInputs.drive_rpm_input).toBe(100);
      expect(removedKeys.some(r => r.key === 'drive_rpm' && r.reason.includes('aliased'))).toBe(true);
    });

    it('should prefer drive_rpm_input over drive_rpm if both exist', () => {
      const raw = {
        speed_mode: 'drive_rpm',
        drive_rpm: 100,
        drive_rpm_input: 150, // Takes precedence
      };

      const { userInputs } = canonicalizeRecipeInputs(raw);

      expect(userInputs.drive_rpm_input).toBe(150);
      expect(userInputs.drive_rpm).toBeUndefined();
    });
  });

  describe('deprecated keys', () => {
    it('should remove send_to_estimating', () => {
      const raw = {
        belt_speed_fpm: 100,
        send_to_estimating: 'Yes',
      };

      const { userInputs, removedKeys } = canonicalizeRecipeInputs(raw);

      expect(userInputs.send_to_estimating).toBeUndefined();
      expect(removedKeys.some(r => r.key === 'send_to_estimating' && r.reason === 'deprecated')).toBe(true);
    });
  });

  describe('derived catalog keys', () => {
    it('should remove belt_min_pulley_dia_no_vguide_in', () => {
      const raw = {
        belt_speed_fpm: 100,
        belt_min_pulley_dia_no_vguide_in: 5.0, // From belt catalog
      };

      const { userInputs, removedKeys } = canonicalizeRecipeInputs(raw);

      expect(userInputs.belt_min_pulley_dia_no_vguide_in).toBeUndefined();
      expect(removedKeys.some(r => r.key === 'belt_min_pulley_dia_no_vguide_in')).toBe(true);
    });

    it('should remove belt_min_pulley_dia_with_vguide_in', () => {
      const raw = {
        belt_speed_fpm: 100,
        belt_min_pulley_dia_with_vguide_in: 6.0, // From belt catalog
      };

      const { userInputs, removedKeys } = canonicalizeRecipeInputs(raw);

      expect(userInputs.belt_min_pulley_dia_with_vguide_in).toBeUndefined();
      expect(removedKeys.some(r => r.key === 'belt_min_pulley_dia_with_vguide_in')).toBe(true);
    });
  });

  describe('null/undefined handling', () => {
    it('should remove null values', () => {
      const raw = {
        belt_speed_fpm: 100,
        notes: null,
      };

      const { userInputs, removedKeys } = canonicalizeRecipeInputs(raw);

      expect(userInputs.notes).toBeUndefined();
      expect(removedKeys.some(r => r.key === 'notes' && r.reason === 'null/undefined')).toBe(true);
    });

    it('should remove undefined values', () => {
      const raw = {
        belt_speed_fpm: 100,
        someField: undefined,
      };

      const { userInputs, removedKeys } = canonicalizeRecipeInputs(raw);

      expect('someField' in userInputs).toBe(false);
    });

    it('should keep zero values', () => {
      const raw = {
        belt_speed_fpm: 0,
        conveyor_incline_deg: 0,
      };

      const { userInputs } = canonicalizeRecipeInputs(raw);

      expect(userInputs.belt_speed_fpm).toBe(0);
      expect(userInputs.conveyor_incline_deg).toBe(0);
    });

    it('should keep false boolean values', () => {
      const raw = {
        belt_speed_fpm: 100,
        drive_pulley_diameter_manual_override: false,
      };

      const { userInputs } = canonicalizeRecipeInputs(raw);

      expect(userInputs.drive_pulley_diameter_manual_override).toBe(false);
    });
  });

  describe('complex scenario (SO32474-like)', () => {
    it('should canonicalize a belt_speed mode config with stale drive_rpm', () => {
      // This mimics the SO32474 scenario:
      // - User selected belt_speed mode
      // - UI has stale drive_rpm=100 from previous state
      // - Outputs show calculated 164.77 RPM
      const raw = {
        speed_mode: 'belt_speed',
        belt_speed_fpm: 104.72,
        drive_rpm: 100, // Stale! Should be removed
        belt_min_pulley_dia_no_vguide_in: 5.0, // From catalog
        send_to_estimating: 'No', // Deprecated
      };

      const { userInputs, removedKeys } = canonicalizeRecipeInputs(raw);

      // Only user-controlled inputs remain
      expect(userInputs.speed_mode).toBe('belt_speed');
      expect(userInputs.belt_speed_fpm).toBe(104.72);

      // Stale/derived/deprecated keys removed
      expect(userInputs.drive_rpm).toBeUndefined();
      expect(userInputs.drive_rpm_input).toBeUndefined();
      expect(userInputs.belt_min_pulley_dia_no_vguide_in).toBeUndefined();
      expect(userInputs.send_to_estimating).toBeUndefined();

      expect(removedKeys.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('preserves valid inputs', () => {
    it('should preserve standard inputs', () => {
      const raw = {
        conveyor_length_cc_in: 120,
        belt_width_in: 24,
        belt_speed_fpm: 100,
        pulley_diameter_in: 6,
        conveyor_incline_deg: 5,
        environment_factors: ['Indoor'],
      };

      const { userInputs, removedKeys } = canonicalizeRecipeInputs(raw);

      expect(userInputs.conveyor_length_cc_in).toBe(120);
      expect(userInputs.belt_width_in).toBe(24);
      expect(userInputs.belt_speed_fpm).toBe(100);
      expect(userInputs.pulley_diameter_in).toBe(6);
      expect(userInputs.conveyor_incline_deg).toBe(5);
      expect(userInputs.environment_factors).toEqual(['Indoor']);
      expect(removedKeys.length).toBe(0);
    });
  });
});

describe('getCanonicalizedDenylist', () => {
  it('should return the configured denylists', () => {
    const denylist = getCanonicalizedDenylist();

    expect(denylist.deprecated).toContain('send_to_estimating');
    expect(denylist.derived).toContain('belt_min_pulley_dia_no_vguide_in');
    expect(denylist.aliases.drive_rpm).toBe('drive_rpm_input');
    expect(denylist.modeGated.speed_mode.belt_speed).toContain('drive_rpm_input');
  });
});
