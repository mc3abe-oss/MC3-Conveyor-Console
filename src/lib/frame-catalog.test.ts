/**
 * Frame Catalog Tests (v1.14)
 *
 * Tests for frame construction lookup tables.
 */

import {
  SHEET_METAL_GAUGE_THICKNESS,
  SHEET_METAL_GAUGES,
  STRUCTURAL_CHANNEL_THICKNESS,
  STRUCTURAL_CHANNEL_SERIES,
  getSheetMetalThickness,
  getStructuralChannelThickness,
  formatGaugeWithThickness,
  formatChannelWithThickness,
} from './frame-catalog';
import type { SheetMetalGauge, StructuralChannelSeries } from '../models/sliderbed_v1/schema';

describe('frame-catalog', () => {
  describe('SHEET_METAL_GAUGE_THICKNESS', () => {
    it('returns correct thickness for 10_GA', () => {
      expect(SHEET_METAL_GAUGE_THICKNESS['10_GA']).toBe(0.1345);
    });

    it('returns correct thickness for 12_GA', () => {
      expect(SHEET_METAL_GAUGE_THICKNESS['12_GA']).toBe(0.1046);
    });

    it('returns correct thickness for 14_GA', () => {
      expect(SHEET_METAL_GAUGE_THICKNESS['14_GA']).toBe(0.0747);
    });

    it('returns correct thickness for 16_GA', () => {
      expect(SHEET_METAL_GAUGE_THICKNESS['16_GA']).toBe(0.0598);
    });

    it('returns correct thickness for 18_GA', () => {
      expect(SHEET_METAL_GAUGE_THICKNESS['18_GA']).toBe(0.0478);
    });

    it('covers all SheetMetalGauge enum values', () => {
      const allGauges: SheetMetalGauge[] = ['10_GA', '12_GA', '14_GA', '16_GA', '18_GA'];
      allGauges.forEach((gauge) => {
        expect(SHEET_METAL_GAUGE_THICKNESS[gauge]).toBeDefined();
        expect(typeof SHEET_METAL_GAUGE_THICKNESS[gauge]).toBe('number');
        expect(SHEET_METAL_GAUGE_THICKNESS[gauge]).toBeGreaterThan(0);
      });
    });

    it('SHEET_METAL_GAUGES array matches lookup table keys', () => {
      expect(SHEET_METAL_GAUGES).toHaveLength(Object.keys(SHEET_METAL_GAUGE_THICKNESS).length);
      SHEET_METAL_GAUGES.forEach((gauge) => {
        expect(SHEET_METAL_GAUGE_THICKNESS[gauge]).toBeDefined();
      });
    });

    it('gauges are ordered thickest to thinnest', () => {
      for (let i = 0; i < SHEET_METAL_GAUGES.length - 1; i++) {
        const thickerGauge = SHEET_METAL_GAUGES[i];
        const thinnerGauge = SHEET_METAL_GAUGES[i + 1];
        expect(SHEET_METAL_GAUGE_THICKNESS[thickerGauge]).toBeGreaterThan(
          SHEET_METAL_GAUGE_THICKNESS[thinnerGauge]
        );
      }
    });
  });

  describe('STRUCTURAL_CHANNEL_THICKNESS', () => {
    it('returns correct thickness for C3', () => {
      expect(STRUCTURAL_CHANNEL_THICKNESS['C3']).toBe(0.170);
    });

    it('returns correct thickness for C4', () => {
      expect(STRUCTURAL_CHANNEL_THICKNESS['C4']).toBe(0.184);
    });

    it('returns correct thickness for C5', () => {
      expect(STRUCTURAL_CHANNEL_THICKNESS['C5']).toBe(0.190);
    });

    it('returns correct thickness for C6', () => {
      expect(STRUCTURAL_CHANNEL_THICKNESS['C6']).toBe(0.200);
    });

    it('returns correct thickness for MC6', () => {
      expect(STRUCTURAL_CHANNEL_THICKNESS['MC6']).toBe(0.180);
    });

    it('returns correct thickness for MC8', () => {
      expect(STRUCTURAL_CHANNEL_THICKNESS['MC8']).toBe(0.190);
    });

    it('covers all StructuralChannelSeries enum values', () => {
      const allSeries: StructuralChannelSeries[] = ['C3', 'C4', 'C5', 'C6', 'MC6', 'MC8'];
      allSeries.forEach((series) => {
        expect(STRUCTURAL_CHANNEL_THICKNESS[series]).toBeDefined();
        expect(typeof STRUCTURAL_CHANNEL_THICKNESS[series]).toBe('number');
        expect(STRUCTURAL_CHANNEL_THICKNESS[series]).toBeGreaterThan(0);
      });
    });

    it('STRUCTURAL_CHANNEL_SERIES array matches lookup table keys', () => {
      expect(STRUCTURAL_CHANNEL_SERIES).toHaveLength(
        Object.keys(STRUCTURAL_CHANNEL_THICKNESS).length
      );
      STRUCTURAL_CHANNEL_SERIES.forEach((series) => {
        expect(STRUCTURAL_CHANNEL_THICKNESS[series]).toBeDefined();
      });
    });
  });

  describe('getSheetMetalThickness', () => {
    it('returns thickness for valid gauge', () => {
      expect(getSheetMetalThickness('12_GA')).toBe(0.1046);
      expect(getSheetMetalThickness('16_GA')).toBe(0.0598);
    });
  });

  describe('getStructuralChannelThickness', () => {
    it('returns thickness for valid series', () => {
      expect(getStructuralChannelThickness('C4')).toBe(0.184);
      expect(getStructuralChannelThickness('MC8')).toBe(0.190);
    });
  });

  describe('formatGaugeWithThickness', () => {
    it('formats 12_GA correctly', () => {
      // v1.50: Now uses Thickness Library format
      expect(formatGaugeWithThickness('12_GA')).toBe('12 ga (0.109")');
    });

    it('formats 16_GA correctly', () => {
      // v1.50: Now uses Thickness Library format
      expect(formatGaugeWithThickness('16_GA')).toBe('16 ga (0.060")');
    });

    it('formats 10_GA correctly', () => {
      // v1.50: Now uses Thickness Library format
      expect(formatGaugeWithThickness('10_GA')).toBe('10 ga (0.134")');
    });
  });

  describe('formatChannelWithThickness', () => {
    it('formats C4 correctly', () => {
      expect(formatChannelWithThickness('C4')).toBe('C4 (0.184" web)');
    });

    it('formats MC8 correctly', () => {
      expect(formatChannelWithThickness('MC8')).toBe('MC8 (0.190" web)');
    });
  });
});
