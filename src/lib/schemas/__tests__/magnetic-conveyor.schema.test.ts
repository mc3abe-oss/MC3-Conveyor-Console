import { MagneticConfigSchema } from '../magnetic-conveyor.schema';

// Minimal valid magnetic config (all required fields)
const VALID_MAGNETIC_CONFIG = {
  style: 'A',
  conveyor_class: 'standard',
  infeed_length_in: 52,
  discharge_height_in: 100,
  incline_angle_deg: 60,
  magnet_width_in: 12,
  magnet_type: 'ceramic_5',
  magnet_centers_in: 18,
  belt_speed_fpm: 50,
  load_lbs_per_hr: 500,
  material_type: 'steel',
  chip_type: 'small',
};

describe('MagneticConfigSchema', () => {
  it('should pass for a valid config', () => {
    const result = MagneticConfigSchema.safeParse(VALID_MAGNETIC_CONFIG);
    expect(result.success).toBe(true);
  });

  it('should pass with all optional fields', () => {
    const full = {
      ...VALID_MAGNETIC_CONFIG,
      discharge_length_in: 22,
      bar_configuration: {
        bar_capacity_lb: 10,
        ceramic_count: 4,
        neo_count: 2,
        pattern_mode: 'all_same',
      },
      temperature_class: 'ambient',
      fluid_type: 'none',
      chip_delivery: 'chip_chute',
      support_type: 'fixed_legs',
      coefficient_of_friction: 0.2,
      safety_factor: 2,
      starting_belt_pull_lb: 100,
      chain_weight_lb_per_ft: 2,
    };
    const result = MagneticConfigSchema.safeParse(full);
    expect(result.success).toBe(true);
  });

  it('should pass with extra keys (passthrough)', () => {
    const config = { ...VALID_MAGNETIC_CONFIG, legacy_ui_state: true, _version: '1.0' };
    const result = MagneticConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  // Missing required fields
  it('should fail when style is missing', () => {
    const { style: _, ...config } = VALID_MAGNETIC_CONFIG;
    const result = MagneticConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('style'))).toBe(true);
    }
  });

  it('should fail when belt_speed_fpm is missing', () => {
    const { belt_speed_fpm: _, ...config } = VALID_MAGNETIC_CONFIG;
    const result = MagneticConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('belt_speed_fpm'))).toBe(true);
    }
  });

  // Invalid enum values
  it('should fail for invalid style', () => {
    const config = { ...VALID_MAGNETIC_CONFIG, style: 'E' };
    const result = MagneticConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should fail for invalid conveyor_class', () => {
    const config = { ...VALID_MAGNETIC_CONFIG, conveyor_class: 'ultra' };
    const result = MagneticConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should fail for invalid magnet_type', () => {
    const config = { ...VALID_MAGNETIC_CONFIG, magnet_type: 'ceramic_99' };
    const result = MagneticConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should fail for invalid chip_type', () => {
    const config = { ...VALID_MAGNETIC_CONFIG, chip_type: 'rocks' };
    const result = MagneticConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  // Out of range values
  it('should fail for negative incline angle', () => {
    const config = { ...VALID_MAGNETIC_CONFIG, incline_angle_deg: -5 };
    const result = MagneticConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should fail for incline angle > 90', () => {
    const config = { ...VALID_MAGNETIC_CONFIG, incline_angle_deg: 95 };
    const result = MagneticConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should fail for belt speed < 6', () => {
    const config = { ...VALID_MAGNETIC_CONFIG, belt_speed_fpm: 3 };
    const result = MagneticConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  // Invalid magnet width (not in valid set)
  it('should fail for invalid magnet width', () => {
    const config = { ...VALID_MAGNETIC_CONFIG, magnet_width_in: 13 };
    const result = MagneticConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  // Invalid magnet centers (not in valid set)
  it('should fail for invalid magnet centers', () => {
    const config = { ...VALID_MAGNETIC_CONFIG, magnet_centers_in: 20 };
    const result = MagneticConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  // Wrong types
  it('should fail for string where number expected', () => {
    const config = { ...VALID_MAGNETIC_CONFIG, belt_speed_fpm: '50' };
    const result = MagneticConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should fail for number where string expected (style)', () => {
    const config = { ...VALID_MAGNETIC_CONFIG, style: 1 };
    const result = MagneticConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});
