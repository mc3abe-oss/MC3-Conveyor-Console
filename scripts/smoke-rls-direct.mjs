#!/usr/bin/env node
/**
 * smoke-rls-direct.mjs - Test RLS policies directly against Supabase
 *
 * This tests the database RLS policies directly, bypassing Next.js middleware.
 * It verifies that:
 * - BELT_USER cannot INSERT/UPDATE/DELETE on admin tables
 * - SUPER_ADMIN can INSERT/UPDATE/DELETE on admin tables
 *
 * Usage:
 *   node scripts/smoke-rls-direct.mjs
 *
 * Environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   BELT_USER_EMAIL, BELT_USER_PASSWORD
 *   SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD
 */

import { createClient } from '@supabase/supabase-js';

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const beltUserEmail = process.env.BELT_USER_EMAIL;
const beltUserPassword = process.env.BELT_USER_PASSWORD;
const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(red('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'));
  process.exit(1);
}

if (!beltUserEmail || !beltUserPassword || !superAdminEmail || !superAdminPassword) {
  console.error(red('Missing credentials:'));
  console.error(dim('  BELT_USER_EMAIL, BELT_USER_PASSWORD'));
  console.error(dim('  SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD'));
  process.exit(1);
}

// Results collector
const results = [];

/**
 * Create an authenticated Supabase client for a user
 */
async function createAuthenticatedClient(email, password) {
  const client = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Failed to sign in ${email}: ${error.message}`);
  return { client, user: data.user, session: data.session };
}

/**
 * Test that a write operation is blocked by RLS
 */
async function expectBlocked(client, table, operation, data, roleName) {
  let result;
  let error;

  try {
    if (operation === 'INSERT') {
      result = await client.from(table).insert(data).select().single();
    } else if (operation === 'UPDATE') {
      // Don't use .single() for UPDATE - RLS blocks return 0 rows
      result = await client.from(table).update(data.update).eq(data.key, data.value).select();
    } else if (operation === 'DELETE') {
      result = await client.from(table).delete().eq(data.key, data.value).select();
    }
    error = result.error;
  } catch (e) {
    error = e;
  }

  // RLS block detection:
  // 1. Explicit RLS error (code 42501 or message contains policy text)
  // 2. UPDATE/DELETE returned 0 rows (RLS silently blocked)
  const explicitBlock = !!error && (
    error.code === '42501' ||
    error.message?.includes('row-level security') ||
    error.message?.includes('permission denied')
  );

  // For UPDATE/DELETE, 0 rows returned means RLS blocked it
  const silentBlock = !error && (operation === 'UPDATE' || operation === 'DELETE') &&
    Array.isArray(result?.data) && result.data.length === 0;

  const blocked = explicitBlock || silentBlock;

  results.push({
    table,
    operation,
    role: roleName,
    expected: 'BLOCKED',
    actual: blocked ? 'BLOCKED' : `ALLOWED (${error?.message || 'success'})`,
    passed: blocked,
  });

  if (blocked) {
    console.log(green(`  ✓ ${operation} on ${table} as ${roleName} => BLOCKED`));
  } else {
    console.log(red(`  ✗ ${operation} on ${table} as ${roleName} => ALLOWED`));
    console.log(dim(`    Error: ${error?.message || 'none - operation succeeded!'}`));
  }

  return blocked;
}

/**
 * Test that a write operation succeeds
 */
async function expectAllowed(client, table, operation, data, roleName) {
  let result;
  let error;

  try {
    if (operation === 'INSERT') {
      result = await client.from(table).insert(data).select().single();
      error = result.error;
    } else if (operation === 'UPDATE') {
      result = await client.from(table).update(data.update).eq(data.key, data.value).select().single();
      error = result.error;
    } else if (operation === 'DELETE') {
      result = await client.from(table).delete().eq(data.key, data.value).select().single();
      error = result.error;
    }
  } catch (e) {
    error = e;
  }

  const allowed = !error;

  results.push({
    table,
    operation,
    role: roleName,
    expected: 'ALLOWED',
    actual: allowed ? 'ALLOWED' : `BLOCKED (${error?.message})`,
    passed: allowed,
  });

  if (allowed) {
    console.log(green(`  ✓ ${operation} on ${table} as ${roleName} => ALLOWED`));
  } else {
    console.log(red(`  ✗ ${operation} on ${table} as ${roleName} => BLOCKED`));
    console.log(dim(`    Error: ${error?.message}`));
  }

  return { allowed, data: result?.data };
}

function uniqueKey(prefix) {
  return `${prefix}_SMOKE_${Date.now()}`;
}

// ============================================================================
// TESTS
// ============================================================================

async function testVGuides(beltUserClient, superAdminClient) {
  console.log(bold('\n--- v_guides ---'));

  const testKey = uniqueKey('K99');
  const insertData = {
    key: testKey,
    label: testKey,
    min_pulley_dia_solid_in: 2.5,
    min_pulley_dia_notched_in: 3.0,
  };

  // BELT_USER should be blocked
  await expectBlocked(beltUserClient, 'v_guides', 'INSERT', insertData, 'BELT_USER');

  // SUPER_ADMIN should succeed
  const { allowed } = await expectAllowed(superAdminClient, 'v_guides', 'INSERT', insertData, 'SUPER_ADMIN');

  if (allowed) {
    // BELT_USER should be blocked on UPDATE
    await expectBlocked(beltUserClient, 'v_guides', 'UPDATE', {
      key: 'key', value: testKey,
      update: { min_pulley_dia_solid_in: 2.75 }
    }, 'BELT_USER');

    // SUPER_ADMIN should succeed on UPDATE
    await expectAllowed(superAdminClient, 'v_guides', 'UPDATE', {
      key: 'key', value: testKey,
      update: { min_pulley_dia_solid_in: 2.8 }
    }, 'SUPER_ADMIN');
  }
}

async function testCatalogItems(beltUserClient, superAdminClient) {
  console.log(bold('\n--- catalog_items ---'));

  const testKey = uniqueKey('SMOKE');
  const insertData = {
    catalog_key: 'LEG_MODEL',
    item_key: testKey,
    label: 'Smoke Test Item',
  };

  await expectBlocked(beltUserClient, 'catalog_items', 'INSERT', insertData, 'BELT_USER');
  const { allowed } = await expectAllowed(superAdminClient, 'catalog_items', 'INSERT', insertData, 'SUPER_ADMIN');

  if (allowed) {
    await expectBlocked(beltUserClient, 'catalog_items', 'UPDATE', {
      key: 'item_key', value: testKey,
      update: { label: 'Updated' }
    }, 'BELT_USER');

    await expectAllowed(superAdminClient, 'catalog_items', 'UPDATE', {
      key: 'item_key', value: testKey,
      update: { label: 'Updated by Admin' }
    }, 'SUPER_ADMIN');
  }
}

async function testCleatCatalog(beltUserClient, superAdminClient) {
  console.log(bold('\n--- cleat_catalog ---'));

  const insertData = {
    material_family: uniqueKey('SMOKE'),
    cleat_profile: 'TEST',
    cleat_size: '1/2',
    cleat_pattern: 'STRAIGHT',
    min_pulley_dia_12in_solid_in: 4.0,
  };

  await expectBlocked(beltUserClient, 'cleat_catalog', 'INSERT', insertData, 'BELT_USER');
  const { allowed, data } = await expectAllowed(superAdminClient, 'cleat_catalog', 'INSERT', insertData, 'SUPER_ADMIN');

  if (allowed && data?.id) {
    await expectBlocked(beltUserClient, 'cleat_catalog', 'UPDATE', {
      key: 'id', value: data.id,
      update: { min_pulley_dia_12in_solid_in: 4.5 }
    }, 'BELT_USER');

    await expectAllowed(superAdminClient, 'cleat_catalog', 'UPDATE', {
      key: 'id', value: data.id,
      update: { min_pulley_dia_12in_solid_in: 4.6 }
    }, 'SUPER_ADMIN');
  }
}

async function testCleatCenterFactors(beltUserClient, superAdminClient) {
  console.log(bold('\n--- cleat_center_factors ---'));

  const insertData = {
    material_family: uniqueKey('SMOKE'),
    centers_in: 6,
    factor: 1.25,
  };

  await expectBlocked(beltUserClient, 'cleat_center_factors', 'INSERT', insertData, 'BELT_USER');
  const { allowed, data } = await expectAllowed(superAdminClient, 'cleat_center_factors', 'INSERT', insertData, 'SUPER_ADMIN');

  if (allowed && data?.id) {
    await expectBlocked(beltUserClient, 'cleat_center_factors', 'UPDATE', {
      key: 'id', value: data.id,
      update: { factor: 1.30 }
    }, 'BELT_USER');

    await expectAllowed(superAdminClient, 'cleat_center_factors', 'UPDATE', {
      key: 'id', value: data.id,
      update: { factor: 1.35 }
    }, 'SUPER_ADMIN');
  }
}

async function testPulleyLibraryStyles(beltUserClient, superAdminClient) {
  console.log(bold('\n--- pulley_library_styles ---'));

  const testKey = uniqueKey('SMOKE_STYLE');
  const insertData = {
    key: testKey,
    name: 'Smoke Test Style',
    style_type: 'DRUM',
    material_class: 'STEEL',
    face_width_rule: 'BELT_PLUS_ALLOWANCE',
  };

  await expectBlocked(beltUserClient, 'pulley_library_styles', 'INSERT', insertData, 'BELT_USER');
  const { allowed } = await expectAllowed(superAdminClient, 'pulley_library_styles', 'INSERT', insertData, 'SUPER_ADMIN');

  if (allowed) {
    await expectBlocked(beltUserClient, 'pulley_library_styles', 'UPDATE', {
      key: 'key', value: testKey,
      update: { name: 'Updated' }
    }, 'BELT_USER');

    await expectAllowed(superAdminClient, 'pulley_library_styles', 'UPDATE', {
      key: 'key', value: testKey,
      update: { name: 'Updated by Admin' }
    }, 'SUPER_ADMIN');

    // Test DELETE (soft delete)
    await expectBlocked(beltUserClient, 'pulley_library_styles', 'UPDATE', {
      key: 'key', value: testKey,
      update: { is_active: false }
    }, 'BELT_USER');

    await expectAllowed(superAdminClient, 'pulley_library_styles', 'UPDATE', {
      key: 'key', value: testKey,
      update: { is_active: false }
    }, 'SUPER_ADMIN');
  }
}

async function testPulleyLibraryModels(beltUserClient, superAdminClient) {
  console.log(bold('\n--- pulley_library_models ---'));

  // First, find an existing style_key to use
  const { data: styles } = await superAdminClient
    .from('pulley_library_styles')
    .select('key')
    .eq('is_active', true)
    .limit(1);

  const styleKey = styles?.[0]?.key;
  if (!styleKey) {
    console.log(yellow('  ⚠ No active pulley styles found - skipping pulley_library_models tests'));
    return;
  }

  const testKey = uniqueKey('SMOKE_MODEL');
  const insertData = {
    model_key: testKey,
    display_name: 'Smoke Test Model',
    style_key: styleKey,
    shell_od_in: 4.0,
    default_shell_wall_in: 0.134,
    allowed_wall_steps_in: [0.134],
    face_width_min_in: 6,
    face_width_max_in: 48,
    face_width_allowance_in: 2.0,
  };

  await expectBlocked(beltUserClient, 'pulley_library_models', 'INSERT', insertData, 'BELT_USER');
  const { allowed, data } = await expectAllowed(superAdminClient, 'pulley_library_models', 'INSERT', insertData, 'SUPER_ADMIN');

  if (allowed) {
    await expectBlocked(beltUserClient, 'pulley_library_models', 'UPDATE', {
      key: 'model_key', value: testKey,
      update: { display_name: 'Updated' }
    }, 'BELT_USER');

    await expectAllowed(superAdminClient, 'pulley_library_models', 'UPDATE', {
      key: 'model_key', value: testKey,
      update: { display_name: 'Updated by Admin' }
    }, 'SUPER_ADMIN');

    // Test DELETE (soft delete)
    await expectBlocked(beltUserClient, 'pulley_library_models', 'UPDATE', {
      key: 'model_key', value: testKey,
      update: { is_active: false }
    }, 'BELT_USER');

    await expectAllowed(superAdminClient, 'pulley_library_models', 'UPDATE', {
      key: 'model_key', value: testKey,
      update: { is_active: false }
    }, 'SUPER_ADMIN');
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log(bold('='.repeat(60)));
  console.log(bold('RBAC Phase 1.5 - Direct RLS Smoke Tests'));
  console.log(bold('='.repeat(60)));
  console.log(dim(`Supabase: ${supabaseUrl}`));
  console.log(dim(`BELT_USER: ${beltUserEmail}`));
  console.log(dim(`SUPER_ADMIN: ${superAdminEmail}`));

  // Authenticate users
  console.log(dim('\nAuthenticating users...'));

  const { client: beltUserClient, user: beltUser } = await createAuthenticatedClient(
    beltUserEmail,
    beltUserPassword
  );
  console.log(green(`  ✓ ${beltUserEmail} authenticated`));

  const { client: superAdminClient, user: superAdmin } = await createAuthenticatedClient(
    superAdminEmail,
    superAdminPassword
  );
  console.log(green(`  ✓ ${superAdminEmail} authenticated`));

  // Run tests
  await testVGuides(beltUserClient, superAdminClient);
  await testCatalogItems(beltUserClient, superAdminClient);
  await testCleatCatalog(beltUserClient, superAdminClient);
  await testCleatCenterFactors(beltUserClient, superAdminClient);
  await testPulleyLibraryStyles(beltUserClient, superAdminClient);
  await testPulleyLibraryModels(beltUserClient, superAdminClient);

  // Summary
  console.log(bold('\n' + '='.repeat(60)));
  console.log(bold('SUMMARY'));
  console.log(bold('='.repeat(60)));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`\nTotal: ${total} tests`);
  console.log(green(`Passed: ${passed}`));
  if (failed > 0) {
    console.log(red(`Failed: ${failed}`));
  }

  // Group by table
  console.log(bold('\nResults by Table:'));
  console.log('-'.repeat(60));

  const byTable = {};
  for (const r of results) {
    if (!byTable[r.table]) byTable[r.table] = [];
    byTable[r.table].push(r);
  }

  for (const [table, tests] of Object.entries(byTable)) {
    const allPassed = tests.every((t) => t.passed);
    const status = allPassed ? green('PASS') : red('FAIL');
    console.log(`${status} ${table}`);
    for (const t of tests) {
      const mark = t.passed ? green('✓') : red('✗');
      console.log(`  ${mark} ${t.operation} as ${t.role} => ${t.expected}`);
    }
  }

  console.log('-'.repeat(60));

  if (failed > 0) {
    console.log(red(`\n${failed} test(s) failed`));
    process.exit(1);
  } else {
    console.log(green('\nAll RLS policies working correctly!'));
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(red(`Fatal error: ${err.message}`));
  console.error(err.stack);
  process.exit(1);
});
