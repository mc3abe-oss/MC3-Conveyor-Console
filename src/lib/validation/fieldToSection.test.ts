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

    it('should map lacing_style to build/beltpulley', () => {
      expect(FIELD_TO_SECTION['lacing_style']).toEqual({
        tabKey: 'build',
        sectionKey: 'beltpulley',
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
      expect(getFieldTabKey('lacing_style')).toBe('build');
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
});
