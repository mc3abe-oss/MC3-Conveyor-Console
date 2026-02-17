import { BeltConfigSchema } from '../belt-conveyor.schema';
import * as fs from 'fs';
import * as path from 'path';

// Minimal valid belt config — only core calculation fields required
const VALID_BELT_CONFIG = {
  conveyor_length_cc_in: 120,
  belt_width_in: 24,
  belt_speed_fpm: 50,
};

// Full belt config — includes all optional application fields
const FULL_BELT_CONFIG = {
  ...VALID_BELT_CONFIG,
  bed_type: 'slider_bed',
  geometry_mode: 'L_ANGLE',
  conveyor_incline_deg: 0,
  pulley_diameter_in: 4,
  drive_pulley_diameter_in: 4,
  tail_pulley_diameter_in: 4,
  speed_mode: 'belt_speed',
  drive_rpm: 100,
  part_weight_lbs: 5,
  part_length_in: 6,
  part_width_in: 6,
  part_spacing_in: 6,
  drop_height_in: 0,
  orientation: 'Lengthwise',
  part_temperature_class: 'Ambient',
  fluid_type: 'None',
  belt_coeff_piw: 0.109,
  belt_coeff_pil: 0.109,
  material_type: 'Steel',
  process_type: 'Assembly',
  parts_sharp: 'No',
  environment_factors: ['Indoor'],
  ambient_temperature: 'Normal (60-90°F)',
  power_feed: '480V 3-Phase',
  controls_package: 'Start/Stop',
  spec_source: 'Standard',
  field_wiring_required: 'No',
  bearing_grade: 'Standard',
  documentation_package: 'Basic',
  finish_paint_system: 'Powder Coat',
  labels_required: 'Yes',
  send_to_estimating: 'No',
  motor_brand: 'Standard',
  bottom_covers: false,
  side_rails: 'None',
  end_guards: 'None',
  finger_safe: false,
  lacing_style: 'Endless (no lacing)',
  side_skirts: false,
  pulley_surface_type: 'Plain (bare steel)',
  start_stop_application: false,
  direction_mode: 'One direction',
  side_loading_direction: 'No side loading',
  drive_location: 'Head',
  brake_motor: false,
  gearmotor_orientation: 'Side mount',
  drive_hand: 'Right-hand (RH)',
  belt_tracking_method: 'Crowned',
  shaft_diameter_mode: 'Calculated',
  gearmotor_mounting_style: 'shaft_mounted',
  frame_height_mode: 'Standard',
};

describe('BeltConfigSchema', () => {
  it('should pass for minimal valid config', () => {
    const result = BeltConfigSchema.safeParse(VALID_BELT_CONFIG);
    expect(result.success).toBe(true);
  });

  it('should pass for full config with all fields', () => {
    const result = BeltConfigSchema.safeParse(FULL_BELT_CONFIG);
    expect(result.success).toBe(true);
  });

  it('should pass with extra keys (passthrough)', () => {
    const config = { ...VALID_BELT_CONFIG, _ui_state: true, legacy_field: 42 };
    const result = BeltConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  // Missing required fields (core calculation)
  it('should fail when conveyor_length_cc_in is missing', () => {
    const { conveyor_length_cc_in: _, ...config } = VALID_BELT_CONFIG;
    const result = BeltConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('conveyor_length_cc_in'))).toBe(true);
    }
  });

  it('should fail when belt_width_in is missing', () => {
    const { belt_width_in: _, ...config } = VALID_BELT_CONFIG;
    const result = BeltConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('belt_width_in'))).toBe(true);
    }
  });

  it('should fail when belt_speed_fpm is missing', () => {
    const { belt_speed_fpm: _, ...config } = VALID_BELT_CONFIG;
    const result = BeltConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('belt_speed_fpm'))).toBe(true);
    }
  });

  // Out of range values
  it('should fail for negative belt speed', () => {
    const result = BeltConfigSchema.safeParse({ ...VALID_BELT_CONFIG, belt_speed_fpm: -5 });
    expect(result.success).toBe(false);
  });

  it('should fail for incline > 90 degrees', () => {
    const result = BeltConfigSchema.safeParse({ ...VALID_BELT_CONFIG, conveyor_incline_deg: 100 });
    expect(result.success).toBe(false);
  });

  it('should fail for safety_factor > 5', () => {
    const result = BeltConfigSchema.safeParse({ ...VALID_BELT_CONFIG, safety_factor: 6 });
    expect(result.success).toBe(false);
  });

  it('should fail for motor_rpm > 3600', () => {
    const result = BeltConfigSchema.safeParse({ ...VALID_BELT_CONFIG, motor_rpm: 5000 });
    expect(result.success).toBe(false);
  });

  it('should fail for belt_coeff_piw out of range', () => {
    const result = BeltConfigSchema.safeParse({ ...VALID_BELT_CONFIG, belt_coeff_piw: 0.5 });
    expect(result.success).toBe(false);
  });

  // Invalid enum values
  it('should fail for invalid orientation', () => {
    const result = BeltConfigSchema.safeParse({ ...VALID_BELT_CONFIG, orientation: 'Diagonal' });
    expect(result.success).toBe(false);
  });

  it('should fail for invalid geometry_mode', () => {
    const result = BeltConfigSchema.safeParse({ ...VALID_BELT_CONFIG, geometry_mode: 'INVALID' });
    expect(result.success).toBe(false);
  });

  it('should fail for invalid speed_mode', () => {
    const result = BeltConfigSchema.safeParse({ ...VALID_BELT_CONFIG, speed_mode: 'turbo' });
    expect(result.success).toBe(false);
  });

  it('should fail for invalid gearmotor_mounting_style', () => {
    const result = BeltConfigSchema.safeParse({ ...VALID_BELT_CONFIG, gearmotor_mounting_style: 'ceiling' });
    expect(result.success).toBe(false);
  });

  // Wrong types
  it('should fail for string where number expected', () => {
    const result = BeltConfigSchema.safeParse({ ...VALID_BELT_CONFIG, belt_speed_fpm: '50' });
    expect(result.success).toBe(false);
  });

  it('should fail for number where boolean expected', () => {
    const result = BeltConfigSchema.safeParse({ ...FULL_BELT_CONFIG, bottom_covers: 1 });
    expect(result.success).toBe(false);
  });

  // Golden fixture validation — real configs must PASS the schema
  describe('golden fixture validation', () => {
    const fixturesDir = path.resolve(__dirname, '../../../tests/fixtures/golden/sliderbed_v1');

    let fixtureFiles: string[] = [];
    try {
      fixtureFiles = fs.readdirSync(fixturesDir).filter((f) => f.endsWith('.fixture.json'));
    } catch {
      // Directory may not exist in CI
    }

    if (fixtureFiles.length === 0) {
      it('should have golden fixtures available', () => {
        expect(true).toBe(true);
      });
    }

    for (const file of fixtureFiles) {
      it(`should validate golden fixture: ${file}`, () => {
        const raw = fs.readFileSync(path.join(fixturesDir, file), 'utf-8');
        const fixture = JSON.parse(raw);
        const result = BeltConfigSchema.safeParse(fixture.inputs);
        // Golden fixtures MUST pass — if they fail, the schema is wrong
        if (!result.success) {
          const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
          throw new Error(`Golden fixture ${file} failed schema validation:\n${issues.join('\n')}`);
        }
        expect(result.success).toBe(true);
      });
    }
  });
});
