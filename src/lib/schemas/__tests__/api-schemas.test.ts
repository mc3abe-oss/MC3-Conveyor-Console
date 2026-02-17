import { ConfigurationSaveSchema } from '../api/configurations-save.schema';
import { GearmotorSelectSchema } from '../api/gearmotor-select.schema';
import { GearmotorConfigSchema } from '../api/gearmotor-config.schema';
import { UsersInviteSchema } from '../api/users-invite.schema';
import { UsersPasswordResetSchema } from '../api/users-password-reset.schema';
import { ApplicationIdSchema } from '../api/application-id.schema';

describe('ConfigurationSaveSchema', () => {
  const VALID = {
    reference_type: 'QUOTE',
    reference_number: '62633',
    model_key: 'belt_conveyor_v1',
    inputs_json: { belt_width_in: 24 },
    parameters_json: { friction_coeff: 0.25 },
    application_json: { material_type: 'Steel' },
  };

  it('should pass for a valid body', () => {
    expect(ConfigurationSaveSchema.safeParse(VALID).success).toBe(true);
  });

  it('should pass with all optional fields', () => {
    const full = {
      ...VALID,
      reference_suffix: 2,
      reference_line: 1,
      reference_id: '00000000-0000-0000-0000-000000000001',
      customer_name: 'Acme',
      quantity: 5,
      title: 'Test',
      outputs_json: {},
      warnings_json: [],
      change_note: 'Updated belt',
      outputs_stale: false,
      existing_application_id: '00000000-0000-0000-0000-000000000002',
      base_revision: '2026-01-01T00:00:00Z',
      force_overwrite: false,
    };
    expect(ConfigurationSaveSchema.safeParse(full).success).toBe(true);
  });

  it('should fail for missing reference_type', () => {
    const { reference_type: _, ...body } = VALID;
    const result = ConfigurationSaveSchema.safeParse(body);
    expect(result.success).toBe(false);
  });

  it('should fail for invalid reference_type', () => {
    const result = ConfigurationSaveSchema.safeParse({ ...VALID, reference_type: 'INVOICE' });
    expect(result.success).toBe(false);
  });

  it('should fail for missing model_key', () => {
    const { model_key: _, ...body } = VALID;
    expect(ConfigurationSaveSchema.safeParse(body).success).toBe(false);
  });

  it('should reject unknown keys (strict)', () => {
    const result = ConfigurationSaveSchema.safeParse({ ...VALID, bogus: true });
    expect(result.success).toBe(false);
  });

  it('should fail for invalid UUID in existing_application_id', () => {
    const result = ConfigurationSaveSchema.safeParse({ ...VALID, existing_application_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});

describe('GearmotorSelectSchema', () => {
  const VALID = {
    required_output_rpm: 47,
    required_output_torque_lb_in: 422,
    chosen_service_factor: 1.5,
  };

  it('should pass for a valid body', () => {
    expect(GearmotorSelectSchema.safeParse(VALID).success).toBe(true);
  });

  it('should pass with optional speed_tolerance_pct', () => {
    expect(GearmotorSelectSchema.safeParse({ ...VALID, speed_tolerance_pct: 15 }).success).toBe(true);
  });

  it('should fail for zero RPM', () => {
    expect(GearmotorSelectSchema.safeParse({ ...VALID, required_output_rpm: 0 }).success).toBe(false);
  });

  it('should fail for negative torque', () => {
    expect(GearmotorSelectSchema.safeParse({ ...VALID, required_output_torque_lb_in: -10 }).success).toBe(false);
  });

  it('should fail for string where number expected', () => {
    expect(GearmotorSelectSchema.safeParse({ ...VALID, required_output_rpm: '47' }).success).toBe(false);
  });

  it('should reject unknown keys (strict)', () => {
    expect(GearmotorSelectSchema.safeParse({ ...VALID, extra: true }).success).toBe(false);
  });
});

describe('GearmotorConfigSchema', () => {
  const VALID = {
    application_id: '00000000-0000-0000-0000-000000000001',
  };

  it('should pass with only application_id', () => {
    expect(GearmotorConfigSchema.safeParse(VALID).success).toBe(true);
  });

  it('should pass with all optional fields', () => {
    const full = {
      ...VALID,
      required_output_rpm: 47,
      required_output_torque_lb_in: 422,
      chosen_service_factor: 1.5,
      speed_tolerance_pct: 15,
      selected_performance_point_id: '00000000-0000-0000-0000-000000000002',
    };
    expect(GearmotorConfigSchema.safeParse(full).success).toBe(true);
  });

  it('should fail for invalid UUID', () => {
    expect(GearmotorConfigSchema.safeParse({ application_id: 'not-uuid' }).success).toBe(false);
  });

  it('should reject unknown keys (strict)', () => {
    expect(GearmotorConfigSchema.safeParse({ ...VALID, extra: 1 }).success).toBe(false);
  });
});

describe('UsersInviteSchema', () => {
  it('should pass for valid email', () => {
    expect(UsersInviteSchema.safeParse({ email: 'user@example.com' }).success).toBe(true);
  });

  it('should pass with role', () => {
    expect(UsersInviteSchema.safeParse({ email: 'user@example.com', role: 'BELT_USER' }).success).toBe(true);
  });

  it('should fail for invalid email', () => {
    expect(UsersInviteSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });

  it('should fail for missing email', () => {
    expect(UsersInviteSchema.safeParse({}).success).toBe(false);
  });

  it('should fail for invalid role', () => {
    expect(UsersInviteSchema.safeParse({ email: 'a@b.com', role: 'UNKNOWN' }).success).toBe(false);
  });

  it('should reject unknown keys (strict)', () => {
    expect(UsersInviteSchema.safeParse({ email: 'a@b.com', extra: true }).success).toBe(false);
  });
});

describe('UsersPasswordResetSchema', () => {
  it('should pass for valid email', () => {
    expect(UsersPasswordResetSchema.safeParse({ email: 'user@example.com' }).success).toBe(true);
  });

  it('should fail for invalid email', () => {
    expect(UsersPasswordResetSchema.safeParse({ email: 'nope' }).success).toBe(false);
  });

  it('should reject unknown keys (strict)', () => {
    expect(UsersPasswordResetSchema.safeParse({ email: 'a@b.com', extra: 1 }).success).toBe(false);
  });
});

describe('ApplicationIdSchema', () => {
  it('should pass for valid UUID', () => {
    expect(ApplicationIdSchema.safeParse('00000000-0000-0000-0000-000000000001').success).toBe(true);
  });

  it('should fail for non-UUID string', () => {
    expect(ApplicationIdSchema.safeParse('not-a-uuid').success).toBe(false);
  });

  it('should fail for number', () => {
    expect(ApplicationIdSchema.safeParse(123).success).toBe(false);
  });
});
