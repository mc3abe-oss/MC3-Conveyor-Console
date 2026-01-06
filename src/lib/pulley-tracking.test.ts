/**
 * Tests for pulley tracking utilities
 */

import { BeltTrackingMethod } from '../models/sliderbed_v1/schema';
import {
  getBeltTrackingMode,
  getFaceProfileLabel,
  getEligiblePulleyStyles,
  isStyleCompatible,
  computeFinishedOd,
  PulleyStyleEligibility,
} from './pulley-tracking';

describe('getBeltTrackingMode', () => {
  it('returns V_GUIDED for V-guided tracking method (enum)', () => {
    expect(getBeltTrackingMode({ belt_tracking_method: BeltTrackingMethod.VGuided })).toBe(
      'V_GUIDED'
    );
  });

  it('returns V_GUIDED for V-guided tracking method (string)', () => {
    expect(getBeltTrackingMode({ belt_tracking_method: 'V-guided' })).toBe('V_GUIDED');
  });

  it('returns CROWNED for Crowned tracking method (enum)', () => {
    expect(getBeltTrackingMode({ belt_tracking_method: BeltTrackingMethod.Crowned })).toBe(
      'CROWNED'
    );
  });

  it('returns CROWNED for Crowned tracking method (string)', () => {
    expect(getBeltTrackingMode({ belt_tracking_method: 'Crowned' })).toBe('CROWNED');
  });

  it('returns FLAT for undefined tracking method', () => {
    expect(getBeltTrackingMode({})).toBe('FLAT');
  });

  it('returns FLAT for null tracking method', () => {
    expect(getBeltTrackingMode({ belt_tracking_method: null })).toBe('FLAT');
  });

  it('returns FLAT for unknown tracking method', () => {
    expect(getBeltTrackingMode({ belt_tracking_method: 'Unknown' })).toBe('FLAT');
  });
});

describe('getFaceProfileLabel', () => {
  it('returns correct labels', () => {
    expect(getFaceProfileLabel('V_GUIDED')).toBe('V-Guided');
    expect(getFaceProfileLabel('CROWNED')).toBe('Crowned');
    expect(getFaceProfileLabel('FLAT')).toBe('Flat');
  });
});

describe('getEligiblePulleyStyles', () => {
  const mockStyles: PulleyStyleEligibility[] = [
    {
      key: 'DRUM_STANDARD',
      name: 'Standard Drum',
      eligible_drive: true,
      eligible_tail: true,
      eligible_crown: true,
      eligible_v_guided: true,
      is_active: true,
    },
    {
      key: 'WING_TAIL',
      name: 'Wing Pulley',
      eligible_drive: false,
      eligible_tail: true,
      eligible_crown: false,
      eligible_v_guided: false,
      is_active: true,
    },
    {
      key: 'SPIRAL_TAIL',
      name: 'Spiral Wing',
      eligible_drive: false,
      eligible_tail: true,
      eligible_crown: true,
      eligible_v_guided: false,
      is_active: true,
    },
    {
      key: 'INACTIVE_STYLE',
      name: 'Inactive',
      eligible_drive: true,
      eligible_tail: true,
      eligible_crown: true,
      eligible_v_guided: true,
      is_active: false,
    },
  ];

  describe('DRIVE position filtering', () => {
    it('returns only drive-eligible styles for FLAT tracking', () => {
      const result = getEligiblePulleyStyles(mockStyles, 'DRIVE', 'FLAT');
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('DRUM_STANDARD');
    });

    it('returns only drive + crown-eligible styles for CROWNED tracking', () => {
      const result = getEligiblePulleyStyles(mockStyles, 'DRIVE', 'CROWNED');
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('DRUM_STANDARD');
    });

    it('returns only drive + v-guided-eligible styles for V_GUIDED tracking', () => {
      const result = getEligiblePulleyStyles(mockStyles, 'DRIVE', 'V_GUIDED');
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('DRUM_STANDARD');
    });
  });

  describe('TAIL position filtering', () => {
    it('returns all tail-eligible styles for FLAT tracking', () => {
      const result = getEligiblePulleyStyles(mockStyles, 'TAIL', 'FLAT');
      expect(result).toHaveLength(3);
      expect(result.map((s) => s.key)).toContain('DRUM_STANDARD');
      expect(result.map((s) => s.key)).toContain('WING_TAIL');
      expect(result.map((s) => s.key)).toContain('SPIRAL_TAIL');
    });

    it('returns only tail + crown-eligible styles for CROWNED tracking', () => {
      const result = getEligiblePulleyStyles(mockStyles, 'TAIL', 'CROWNED');
      expect(result).toHaveLength(2);
      expect(result.map((s) => s.key)).toContain('DRUM_STANDARD');
      expect(result.map((s) => s.key)).toContain('SPIRAL_TAIL');
    });

    it('returns only tail + v-guided-eligible styles for V_GUIDED tracking', () => {
      const result = getEligiblePulleyStyles(mockStyles, 'TAIL', 'V_GUIDED');
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('DRUM_STANDARD');
    });
  });

  it('excludes inactive styles', () => {
    const result = getEligiblePulleyStyles(mockStyles, 'DRIVE', 'FLAT');
    expect(result.find((s) => s.key === 'INACTIVE_STYLE')).toBeUndefined();
  });
});

describe('isStyleCompatible', () => {
  const drumStyle: PulleyStyleEligibility = {
    key: 'DRUM',
    name: 'Drum',
    eligible_drive: true,
    eligible_tail: true,
    eligible_crown: true,
    eligible_v_guided: true,
    is_active: true,
  };

  const wingStyle: PulleyStyleEligibility = {
    key: 'WING',
    name: 'Wing',
    eligible_drive: false,
    eligible_tail: true,
    eligible_crown: false,
    eligible_v_guided: false,
    is_active: true,
  };

  it('returns true for fully compatible style', () => {
    expect(isStyleCompatible(drumStyle, 'DRIVE', 'CROWNED')).toBe(true);
    expect(isStyleCompatible(drumStyle, 'TAIL', 'V_GUIDED')).toBe(true);
  });

  it('returns false for position incompatibility', () => {
    expect(isStyleCompatible(wingStyle, 'DRIVE', 'FLAT')).toBe(false);
  });

  it('returns false for tracking incompatibility', () => {
    expect(isStyleCompatible(wingStyle, 'TAIL', 'CROWNED')).toBe(false);
    expect(isStyleCompatible(wingStyle, 'TAIL', 'V_GUIDED')).toBe(false);
  });

  it('returns true for FLAT tracking (no restriction)', () => {
    expect(isStyleCompatible(wingStyle, 'TAIL', 'FLAT')).toBe(true);
  });

  it('returns false for null/undefined style', () => {
    expect(isStyleCompatible(null, 'DRIVE', 'FLAT')).toBe(false);
    expect(isStyleCompatible(undefined, 'TAIL', 'CROWNED')).toBe(false);
  });

  it('returns false for inactive style', () => {
    const inactiveStyle = { ...drumStyle, is_active: false };
    expect(isStyleCompatible(inactiveStyle, 'DRIVE', 'FLAT')).toBe(false);
  });
});

// =========================================================================
// Face Allowance Default Tests (v1.52)
// These verify the expected face allowance values per tracking mode.
// The actual UI logic is in PulleyConfigModal.tsx but these constants
// document the specification.
// =========================================================================

describe('Face Allowance Defaults Specification', () => {
  // These constants match PulleyConfigModal.tsx
  const DEFAULT_ALLOWANCE_CROWNED_IN = 2.0;
  const DEFAULT_ALLOWANCE_V_GUIDED_IN = 0.75;
  const DEFAULT_ALLOWANCE_FLAT_IN = 1.0;

  // Helper to get default allowance for tracking mode (mirrors modal logic)
  function getDefaultAllowanceForTracking(trackingMode: 'CROWNED' | 'V_GUIDED' | 'FLAT'): number {
    switch (trackingMode) {
      case 'CROWNED':
        return DEFAULT_ALLOWANCE_CROWNED_IN;
      case 'V_GUIDED':
        return DEFAULT_ALLOWANCE_V_GUIDED_IN;
      case 'FLAT':
      default:
        return DEFAULT_ALLOWANCE_FLAT_IN;
    }
  }

  it('CROWNED tracking should default to +2.00" allowance', () => {
    expect(getDefaultAllowanceForTracking('CROWNED')).toBe(2.0);
  });

  it('V_GUIDED tracking should default to +0.75" allowance', () => {
    expect(getDefaultAllowanceForTracking('V_GUIDED')).toBe(0.75);
  });

  it('FLAT tracking should default to +1.00" allowance', () => {
    expect(getDefaultAllowanceForTracking('FLAT')).toBe(1.0);
  });

  describe('Face width calculation', () => {
    // face_width = belt_width + allowance (total add, not per-side)
    const beltWidth = 24;

    it('Crowned face width: belt_width + 2.00 = 26.00"', () => {
      const allowance = getDefaultAllowanceForTracking('CROWNED');
      expect(beltWidth + allowance).toBe(26.0);
    });

    it('V-Guided face width: belt_width + 0.75 = 24.75"', () => {
      const allowance = getDefaultAllowanceForTracking('V_GUIDED');
      expect(beltWidth + allowance).toBe(24.75);
    });

    it('Flat face width: belt_width + 1.00 = 25.00"', () => {
      const allowance = getDefaultAllowanceForTracking('FLAT');
      expect(beltWidth + allowance).toBe(25.0);
    });
  });
});

describe('computeFinishedOd', () => {
  it('returns shell OD when not lagged', () => {
    expect(computeFinishedOd(6.0, false)).toBe(6.0);
  });

  it('returns shell OD + 2 * thickness when lagged', () => {
    expect(computeFinishedOd(6.0, true, 0.5)).toBe(7.0);
  });

  it('returns shell OD when lagged but thickness is 0', () => {
    expect(computeFinishedOd(6.0, true, 0)).toBe(6.0);
  });

  it('returns shell OD when lagged but thickness is null', () => {
    expect(computeFinishedOd(6.0, true, null)).toBe(6.0);
  });

  it('returns undefined for null shell OD', () => {
    expect(computeFinishedOd(null, false)).toBeUndefined();
  });

  it('returns undefined for zero shell OD', () => {
    expect(computeFinishedOd(0, false)).toBeUndefined();
  });

  it('returns undefined for negative shell OD', () => {
    expect(computeFinishedOd(-1, false)).toBeUndefined();
  });
});
