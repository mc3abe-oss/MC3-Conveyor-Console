/**
 * Tests for fieldToSection.ts - ValidationError field to section mapping
 */

import {
  FIELD_TO_SECTION,
  getFieldMapping,
  getFieldSectionKey,
  getFieldTabKey,
} from './fieldToSection';

describe('fieldToSection mapping', () => {
  describe('FIELD_TO_SECTION constant', () => {
    it('should map frame_height_mode to physical/frame', () => {
      expect(FIELD_TO_SECTION['frame_height_mode']).toEqual({
        tabKey: 'physical',
        sectionKey: 'frame',
      });
    });

    it('should map cleats_mode to physical/beltPulleys', () => {
      expect(FIELD_TO_SECTION['cleats_mode']).toEqual({
        tabKey: 'physical',
        sectionKey: 'beltPulleys',
      });
    });

    it('should map conveyor_length_cc_in to physical/geometry', () => {
      expect(FIELD_TO_SECTION['conveyor_length_cc_in']).toEqual({
        tabKey: 'physical',
        sectionKey: 'geometry',
      });
    });

    it('should map gearmotor_mounting_style to drive/drive', () => {
      expect(FIELD_TO_SECTION['gearmotor_mounting_style']).toEqual({
        tabKey: 'drive',
        sectionKey: 'drive',
      });
    });

    it('should map lacing_style to physical/beltPulleys', () => {
      // Lacing was moved from Build Options to Physical tab (UI Cleanup)
      expect(FIELD_TO_SECTION['lacing_style']).toEqual({
        tabKey: 'physical',
        sectionKey: 'beltPulleys',
      });
    });
  });

  describe('getFieldMapping()', () => {
    it('should return mapping for known fields', () => {
      expect(getFieldMapping('frame_height_mode')).toEqual({
        tabKey: 'physical',
        sectionKey: 'frame',
      });
    });

    it('should return undefined for unknown fields', () => {
      expect(getFieldMapping('unknown_field')).toBeUndefined();
    });

    it('should return undefined for undefined input', () => {
      expect(getFieldMapping(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(getFieldMapping('')).toBeUndefined();
    });
  });

  describe('getFieldSectionKey()', () => {
    it('should return section key for known fields', () => {
      expect(getFieldSectionKey('frame_height_mode')).toBe('frame');
      expect(getFieldSectionKey('cleats_mode')).toBe('beltPulleys');
      expect(getFieldSectionKey('belt_speed_fpm')).toBe('speed');
    });

    it('should return undefined for unknown fields', () => {
      expect(getFieldSectionKey('unknown_field')).toBeUndefined();
    });
  });

  describe('getFieldTabKey()', () => {
    it('should return tab key for known fields', () => {
      expect(getFieldTabKey('frame_height_mode')).toBe('physical');
      expect(getFieldTabKey('belt_speed_fpm')).toBe('drive');
      expect(getFieldTabKey('part_weight_lbs')).toBe('application');
      // Lacing was moved from Build Options to Physical tab (UI Cleanup)
      expect(getFieldTabKey('lacing_style')).toBe('physical');
    });

    it('should return undefined for unknown fields', () => {
      expect(getFieldTabKey('unknown_field')).toBeUndefined();
    });
  });

  describe('cleats + snub rollers conflict scenario', () => {
    it('should route cleats_mode errors to beltPulleys section', () => {
      // When cleats + snub rollers conflict occurs, rules.ts emits errors for both fields
      const cleatsMapping = getFieldMapping('cleats_mode');
      expect(cleatsMapping?.sectionKey).toBe('beltPulleys');
      expect(cleatsMapping?.tabKey).toBe('physical');
    });

    it('should route frame_height_mode errors to frame section', () => {
      const frameMapping = getFieldMapping('frame_height_mode');
      expect(frameMapping?.sectionKey).toBe('frame');
      expect(frameMapping?.tabKey).toBe('physical');
    });

    it('should allow both errors to be routed to their respective sections', () => {
      // This verifies the dual-error strategy from v1.28 can work
      const cleatsSection = getFieldSectionKey('cleats_mode');
      const frameSection = getFieldSectionKey('frame_height_mode');

      expect(cleatsSection).toBe('beltPulleys');
      expect(frameSection).toBe('frame');
      expect(cleatsSection).not.toBe(frameSection);
    });
  });

  /**
   * Build Options support section mappings
   * Ensures floor support validation errors (TOB, legs, casters) are routed
   * to the correct section for visible display.
   */
  describe('Build Options support section mappings', () => {
    it('should map TOB fields to build/support section', () => {
      expect(getFieldMapping('tail_tob_in')).toEqual({
        tabKey: 'build',
        sectionKey: 'support',
      });
      expect(getFieldMapping('drive_tob_in')).toEqual({
        tabKey: 'build',
        sectionKey: 'support',
      });
    });

    it('should map leg fields to build/support section', () => {
      expect(getFieldMapping('leg_model_key')).toEqual({
        tabKey: 'build',
        sectionKey: 'support',
      });
      expect(getFieldMapping('include_legs')).toEqual({
        tabKey: 'build',
        sectionKey: 'support',
      });
    });

    it('should map caster fields to build/support section', () => {
      expect(getFieldMapping('caster_rigid_qty')).toEqual({
        tabKey: 'build',
        sectionKey: 'support',
      });
      expect(getFieldMapping('caster_rigid_model_key')).toEqual({
        tabKey: 'build',
        sectionKey: 'support',
      });
      expect(getFieldMapping('caster_swivel_model_key')).toEqual({
        tabKey: 'build',
        sectionKey: 'support',
      });
    });

    it('should map support_method to build/support section', () => {
      expect(getFieldMapping('support_method')).toEqual({
        tabKey: 'build',
        sectionKey: 'support',
      });
    });

    it('should ensure all support fields route to build tab', () => {
      const supportFields = [
        'support_method',
        'reference_end',
        'tail_tob_in',
        'drive_tob_in',
        'adjustment_required_in',
        'include_legs',
        'leg_model_key',
        'include_casters',
        'caster_rigid_qty',
        'caster_rigid_model_key',
        'caster_swivel_qty',
        'caster_swivel_model_key',
      ];

      for (const field of supportFields) {
        const mapping = getFieldMapping(field);
        expect(mapping).toBeDefined();
        expect(mapping?.tabKey).toBe('build');
        expect(mapping?.sectionKey).toBe('support');
      }
    });
  });

  /**
   * Orphan validation item prevention
   * Verifies that validation errors from rules.ts will have a valid mapping
   */
  describe('orphan validation item prevention', () => {
    it('should have mapping for all floor support validation fields from rules.ts', () => {
      // These are fields that rules.ts emits validation errors for when floor supported
      const floorSupportErrorFields = [
        'tail_tob_in',     // TOB required when floor supported
        'drive_tob_in',    // TOB required when floor supported
        'leg_model_key',   // Leg model required when include_legs=true
        'caster_rigid_qty', // Caster required when include_casters=true
        'caster_rigid_model_key', // Model required when qty > 0
        'caster_swivel_model_key', // Model required when qty > 0
      ];

      for (const field of floorSupportErrorFields) {
        const mapping = getFieldMapping(field);
        expect(mapping).toBeDefined();
        expect(mapping?.tabKey).toBe('build');
        // All should map to 'support' section so they're visible in Options & Accessories
      }
    });

    it('should have mapping for Build Options guards/guides fields', () => {
      const guardsGuidesFields = [
        'bottom_covers',
        'end_guards',
        'finger_safe',
        'side_rails',
        'side_skirts',
      ];

      for (const field of guardsGuidesFields) {
        const mapping = getFieldMapping(field);
        expect(mapping).toBeDefined();
        expect(mapping?.tabKey).toBe('build');
      }
    });
  });
});
