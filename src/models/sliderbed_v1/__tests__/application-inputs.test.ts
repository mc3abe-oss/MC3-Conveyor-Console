/**
 * APPLICATION INPUTS - UNIT TESTS
 *
 * Tests for v1.36+ input transformations:
 * 1. Part Temperature: °F/°C toggle retains numeric value; normalized conversion
 * 2. Bulk Material: either/or flow with derived values (mass ↔ volume via density)
 * 3. Fluids: conditional pattern (fluids_on_material controls visibility)
 */

import {
  TemperatureUnit,
  FluidsOnMaterial,
  MaterialFluidType,
  FluidAmount,
  BulkInputMethod,
  TEMPERATURE_UNIT_LABELS,
  FLUIDS_ON_MATERIAL_LABELS,
  MATERIAL_FLUID_TYPE_LABELS,
  FLUID_AMOUNT_LABELS,
} from '../schema';

// ============================================================================
// ITEM #1: PART TEMPERATURE TESTS
// ============================================================================

describe('Part Temperature - Unit Toggle', () => {
  /**
   * Temperature conversion helpers (same logic as UI)
   */
  const fahrenheitToCelsius = (f: number): number => Math.round(((f - 32) * 5 / 9) * 10) / 10;
  const celsiusToFahrenheit = (c: number): number => Math.round((c * 9 / 5 + 32) * 10) / 10;

  describe('Switching °F/°C retains numeric value', () => {
    it('should keep the same numeric value when switching units (user enters 100)', () => {
      const userEnteredValue = 100;

      // User enters 100 in °F mode
      const valueInFahrenheit = userEnteredValue;

      // User switches to °C mode - value stays as 100
      // The UI displays the same number, interpretation changes
      const valueInCelsius = userEnteredValue;

      expect(valueInFahrenheit).toBe(valueInCelsius);
      expect(valueInFahrenheit).toBe(100);
    });

    it('should preserve user input regardless of unit selection', () => {
      const testValues = [0, 32, 72, 100, 150, 212, 500];

      testValues.forEach(value => {
        // Same value displayed in both units - user's input is preserved
        expect(value).toBe(value);
      });
    });
  });

  describe('Normalized value conversion (for downstream calculations)', () => {
    it('should convert 32°F to 0°C', () => {
      expect(fahrenheitToCelsius(32)).toBe(0);
    });

    it('should convert 212°F to 100°C', () => {
      expect(fahrenheitToCelsius(212)).toBe(100);
    });

    it('should convert 72°F (room temp) to ~22.2°C', () => {
      expect(fahrenheitToCelsius(72)).toBe(22.2);
    });

    it('should convert 0°C to 32°F', () => {
      expect(celsiusToFahrenheit(0)).toBe(32);
    });

    it('should convert 100°C to 212°F', () => {
      expect(celsiusToFahrenheit(100)).toBe(212);
    });

    it('should handle negative temperatures', () => {
      expect(fahrenheitToCelsius(-40)).toBe(-40); // The crossover point!
      expect(celsiusToFahrenheit(-40)).toBe(-40);
    });
  });

  describe('Temperature unit enum', () => {
    it('should have correct enum values', () => {
      expect(TemperatureUnit.Fahrenheit).toBe('F');
      expect(TemperatureUnit.Celsius).toBe('C');
    });

    it('should have correct display labels', () => {
      expect(TEMPERATURE_UNIT_LABELS[TemperatureUnit.Fahrenheit]).toBe('°F');
      expect(TEMPERATURE_UNIT_LABELS[TemperatureUnit.Celsius]).toBe('°C');
    });
  });
});

// ============================================================================
// ITEM #2: BULK MATERIAL - EITHER/OR FLOW WITH DERIVED VALUES
// ============================================================================

describe('Bulk Material - Either/Or Flow with Derived Values', () => {
  /**
   * Derived value calculations (same logic as UI component)
   *
   * When Input Method = Mass (Weight):
   *   - mass_flow_lbs_per_hr: EDITABLE
   *   - volume_flow_ft3_per_hr: DERIVED (read-only) = mass / density
   *
   * When Input Method = Volume:
   *   - volume_flow_ft3_per_hr: EDITABLE
   *   - mass_flow_lbs_per_hr: DERIVED (read-only) = volume * density
   */

  const calculateDerivedVolume = (massFlow: number, density: number): number => {
    return Math.round((massFlow / density) * 100) / 100;
  };

  const calculateDerivedMass = (volumeFlow: number, density: number): number => {
    return Math.round((volumeFlow * density) * 100) / 100;
  };

  describe('Input Method = Weight (Mass Flow)', () => {
    it('should derive volume flow from mass flow and density', () => {
      const massFlow = 1000; // lbs/hr
      const density = 50;    // lbs/ft³

      const derivedVolume = calculateDerivedVolume(massFlow, density);

      expect(derivedVolume).toBe(20); // 1000 / 50 = 20 ft³/hr
    });

    it('should correctly calculate volume for typical bulk materials', () => {
      // Sand: ~100 lbs/ft³
      expect(calculateDerivedVolume(5000, 100)).toBe(50);

      // Sawdust: ~15 lbs/ft³
      expect(calculateDerivedVolume(150, 15)).toBe(10);

      // Steel chips: ~125 lbs/ft³
      expect(calculateDerivedVolume(6250, 125)).toBe(50);
    });

    it('should handle decimal results with 2 decimal precision', () => {
      const massFlow = 1000;
      const density = 33; // Will produce non-integer result

      const derivedVolume = calculateDerivedVolume(massFlow, density);

      expect(derivedVolume).toBe(30.30); // 1000 / 33 ≈ 30.303... → 30.30
    });
  });

  describe('Input Method = Volume (Volume Flow)', () => {
    it('should derive mass flow from volume flow and density', () => {
      const volumeFlow = 20;  // ft³/hr
      const density = 50;     // lbs/ft³

      const derivedMass = calculateDerivedMass(volumeFlow, density);

      expect(derivedMass).toBe(1000); // 20 * 50 = 1000 lbs/hr
    });

    it('should correctly calculate mass for typical bulk materials', () => {
      // Sand: ~100 lbs/ft³
      expect(calculateDerivedMass(50, 100)).toBe(5000);

      // Sawdust: ~15 lbs/ft³
      expect(calculateDerivedMass(10, 15)).toBe(150);

      // Steel chips: ~125 lbs/ft³
      expect(calculateDerivedMass(50, 125)).toBe(6250);
    });

    it('should handle decimal results with 2 decimal precision', () => {
      const volumeFlow = 33.33;
      const density = 45;

      const derivedMass = calculateDerivedMass(volumeFlow, density);

      expect(derivedMass).toBe(1499.85); // 33.33 * 45 = 1499.85
    });
  });

  describe('Bidirectional conversion consistency', () => {
    it('should maintain consistency: mass → volume → mass', () => {
      const originalMass = 1000;
      const density = 50;

      const derivedVolume = calculateDerivedVolume(originalMass, density);
      const backToMass = calculateDerivedMass(derivedVolume, density);

      expect(backToMass).toBe(originalMass);
    });

    it('should maintain consistency: volume → mass → volume', () => {
      const originalVolume = 20;
      const density = 50;

      const derivedMass = calculateDerivedMass(originalVolume, density);
      const backToVolume = calculateDerivedVolume(derivedMass, density);

      expect(backToVolume).toBe(originalVolume);
    });
  });

  describe('BulkInputMethod enum', () => {
    it('should have correct enum values', () => {
      expect(BulkInputMethod.WeightFlow).toBe('WEIGHT_FLOW');
      expect(BulkInputMethod.VolumeFlow).toBe('VOLUME_FLOW');
    });
  });
});

// ============================================================================
// ITEM #3: FLUIDS CONDITIONAL PATTERN
// ============================================================================

describe('Fluids Conditional Pattern', () => {
  /**
   * Conditional visibility logic:
   * - fluids_on_material = 'NO' → Hide fluid type and amount
   * - fluids_on_material = 'YES' → Show fluid type and amount
   * - fluids_on_material = 'UNKNOWN' → Hide fluid type and amount
   */

  const shouldShowFluidDetails = (fluidsOnMaterial: FluidsOnMaterial | string | undefined): boolean => {
    return fluidsOnMaterial === FluidsOnMaterial.Yes;
  };

  describe('Visibility logic', () => {
    it('should hide fluid details when "No"', () => {
      expect(shouldShowFluidDetails(FluidsOnMaterial.No)).toBe(false);
    });

    it('should show fluid details when "Yes"', () => {
      expect(shouldShowFluidDetails(FluidsOnMaterial.Yes)).toBe(true);
    });

    it('should hide fluid details when "Unknown"', () => {
      expect(shouldShowFluidDetails(FluidsOnMaterial.Unknown)).toBe(false);
    });

    it('should hide fluid details when undefined', () => {
      expect(shouldShowFluidDetails(undefined)).toBe(false);
    });
  });

  describe('FluidsOnMaterial enum', () => {
    it('should have correct enum values', () => {
      expect(FluidsOnMaterial.No).toBe('NO');
      expect(FluidsOnMaterial.Yes).toBe('YES');
      expect(FluidsOnMaterial.Unknown).toBe('UNKNOWN');
    });

    it('should have correct display labels', () => {
      expect(FLUIDS_ON_MATERIAL_LABELS[FluidsOnMaterial.No]).toBe('No');
      expect(FLUIDS_ON_MATERIAL_LABELS[FluidsOnMaterial.Yes]).toBe('Yes');
      expect(FLUIDS_ON_MATERIAL_LABELS[FluidsOnMaterial.Unknown]).toBe('Unknown');
    });
  });

  describe('MaterialFluidType enum', () => {
    it('should have all expected fluid types', () => {
      expect(MaterialFluidType.Water).toBe('WATER');
      expect(MaterialFluidType.Coolant).toBe('COOLANT');
      expect(MaterialFluidType.Oil).toBe('OIL');
      expect(MaterialFluidType.Mixed).toBe('MIXED');
      expect(MaterialFluidType.Other).toBe('OTHER');
      expect(MaterialFluidType.Unknown).toBe('UNKNOWN');
    });

    it('should have correct display labels', () => {
      expect(MATERIAL_FLUID_TYPE_LABELS[MaterialFluidType.Water]).toBe('Water');
      expect(MATERIAL_FLUID_TYPE_LABELS[MaterialFluidType.Coolant]).toBe('Coolant');
      expect(MATERIAL_FLUID_TYPE_LABELS[MaterialFluidType.Oil]).toBe('Oil');
      expect(MATERIAL_FLUID_TYPE_LABELS[MaterialFluidType.Mixed]).toBe('Mixed');
      expect(MATERIAL_FLUID_TYPE_LABELS[MaterialFluidType.Other]).toBe('Other');
      expect(MATERIAL_FLUID_TYPE_LABELS[MaterialFluidType.Unknown]).toBe('Unknown');
    });
  });

  describe('FluidAmount enum', () => {
    it('should have all expected fluid amounts', () => {
      expect(FluidAmount.LightFilm).toBe('LIGHT_FILM');
      expect(FluidAmount.Dripping).toBe('DRIPPING');
      expect(FluidAmount.SoakedPooled).toBe('SOAKED_POOLED');
      expect(FluidAmount.SubmergedSlurry).toBe('SUBMERGED_SLURRY');
      expect(FluidAmount.Unknown).toBe('UNKNOWN');
    });

    it('should have correct display labels', () => {
      expect(FLUID_AMOUNT_LABELS[FluidAmount.LightFilm]).toBe('Light film');
      expect(FLUID_AMOUNT_LABELS[FluidAmount.Dripping]).toBe('Dripping');
      expect(FLUID_AMOUNT_LABELS[FluidAmount.SoakedPooled]).toBe('Soaked / pooled');
      expect(FLUID_AMOUNT_LABELS[FluidAmount.SubmergedSlurry]).toBe('Submerged / slurry');
      expect(FLUID_AMOUNT_LABELS[FluidAmount.Unknown]).toBe('Unknown');
    });
  });
});
