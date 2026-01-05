#!/usr/bin/env node
/**
 * smoke-admin-routes.mjs - RBAC Phase 1.5 Smoke Tests
 *
 * Tests that:
 * - BELT_USER gets 403 on admin writes
 * - SUPER_ADMIN gets 2xx on admin writes
 * - BELT_ADMIN gets 2xx on admin writes (if token provided)
 *
 * Usage:
 *   node scripts/smoke-admin-routes.mjs
 *
 * Environment variables (required):
 *   BASE_URL - API base URL (e.g., http://localhost:3000)
 *   BELT_USER_TOKEN - JWT access token for BELT_USER
 *   SUPER_ADMIN_TOKEN - JWT access token for SUPER_ADMIN
 *
 * Optional:
 *   BELT_ADMIN_TOKEN - JWT access token for BELT_ADMIN (if testing)
 */

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const BELT_USER_TOKEN = process.env.BELT_USER_TOKEN;
const SUPER_ADMIN_TOKEN = process.env.SUPER_ADMIN_TOKEN;
const BELT_ADMIN_TOKEN = process.env.BELT_ADMIN_TOKEN;

if (!BELT_USER_TOKEN || !SUPER_ADMIN_TOKEN) {
  console.error(red('Missing required environment variables:'));
  console.error(dim('  BELT_USER_TOKEN - JWT for BELT_USER'));
  console.error(dim('  SUPER_ADMIN_TOKEN - JWT for SUPER_ADMIN'));
  console.error(dim('  BELT_ADMIN_TOKEN - (optional) JWT for BELT_ADMIN'));
  console.error(dim('\nRun get-access-token.mjs first to obtain tokens.'));
  process.exit(1);
}

// Test results collector
const results = [];

/**
 * Make an API request with authorization
 */
async function apiRequest(method, path, token, body = null) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  if (body && method !== 'GET' && method !== 'DELETE') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  let data = null;

  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : null;
  } catch {
    // Response wasn't JSON
  }

  return { status: response.status, data };
}

/**
 * Test that a request returns 403 with correct payload
 */
async function expectForbidden(method, path, token, body, roleName) {
  const { status, data } = await apiRequest(method, path, token, body);

  const expected403 = status === 403;
  const correctPayload =
    data?.error === 'FORBIDDEN' && data?.message === 'Admin permissions required.';

  const passed = expected403 && correctPayload;

  results.push({
    route: path,
    method,
    role: roleName,
    expected: '403 FORBIDDEN',
    actual: `${status} ${JSON.stringify(data)}`,
    passed,
  });

  if (passed) {
    console.log(green(`  ✓ ${method} ${path} as ${roleName} => 403 FORBIDDEN`));
  } else {
    console.log(red(`  ✗ ${method} ${path} as ${roleName} => ${status}`));
    console.log(dim(`    Expected: 403 { error: "FORBIDDEN", message: "Admin permissions required." }`));
    console.log(dim(`    Got: ${status} ${JSON.stringify(data)}`));
  }

  return passed;
}

/**
 * Test that a request returns 2xx (success)
 */
async function expectSuccess(method, path, token, body, roleName) {
  const { status, data } = await apiRequest(method, path, token, body);

  const passed = status >= 200 && status < 300;

  results.push({
    route: path,
    method,
    role: roleName,
    expected: '2xx',
    actual: `${status}`,
    passed,
  });

  if (passed) {
    console.log(green(`  ✓ ${method} ${path} as ${roleName} => ${status}`));
  } else {
    console.log(red(`  ✗ ${method} ${path} as ${roleName} => ${status}`));
    console.log(dim(`    Expected: 2xx`));
    console.log(dim(`    Got: ${status} ${JSON.stringify(data)}`));
  }

  return { passed, data };
}

/**
 * Generate unique test key to avoid conflicts
 */
function uniqueKey(prefix) {
  return `${prefix}_TEST_${Date.now()}`;
}

// ============================================================================
// TEST DEFINITIONS
// ============================================================================

/**
 * Test /api/admin/v-guides
 */
async function testVGuides() {
  console.log(bold('\n--- /api/admin/v-guides ---'));

  const testKey = uniqueKey('K99');
  const postBody = {
    key: testKey,
    min_pulley_dia_solid_in: 2.5,
    min_pulley_dia_notched_in: 3.0,
  };

  // BELT_USER should get 403 on POST
  await expectForbidden('POST', '/api/admin/v-guides', BELT_USER_TOKEN, postBody, 'BELT_USER');

  // SUPER_ADMIN should succeed on POST
  const { passed: postOk, data: created } = await expectSuccess(
    'POST',
    '/api/admin/v-guides',
    SUPER_ADMIN_TOKEN,
    postBody,
    'SUPER_ADMIN'
  );

  if (postOk && created) {
    // BELT_USER should get 403 on PUT
    const putBody = { ...postBody, min_pulley_dia_solid_in: 2.75 };
    await expectForbidden('PUT', '/api/admin/v-guides', BELT_USER_TOKEN, putBody, 'BELT_USER');

    // SUPER_ADMIN should succeed on PUT
    await expectSuccess('PUT', '/api/admin/v-guides', SUPER_ADMIN_TOKEN, putBody, 'SUPER_ADMIN');

    // BELT_ADMIN test (if token provided)
    if (BELT_ADMIN_TOKEN) {
      const putBody2 = { ...postBody, min_pulley_dia_solid_in: 2.8 };
      await expectSuccess('PUT', '/api/admin/v-guides', BELT_ADMIN_TOKEN, putBody2, 'BELT_ADMIN');
    }
  }
}

/**
 * Test /api/admin/catalog-items
 */
async function testCatalogItems() {
  console.log(bold('\n--- /api/admin/catalog-items ---'));

  const testKey = uniqueKey('SMOKE');
  const postBody = {
    catalog_key: 'LEG_MODEL',
    item_key: testKey,
    label: 'Smoke Test Item',
  };

  // BELT_USER should get 403 on POST
  await expectForbidden('POST', '/api/admin/catalog-items', BELT_USER_TOKEN, postBody, 'BELT_USER');

  // SUPER_ADMIN should succeed on POST
  const { passed: postOk } = await expectSuccess(
    'POST',
    '/api/admin/catalog-items',
    SUPER_ADMIN_TOKEN,
    postBody,
    'SUPER_ADMIN'
  );

  if (postOk) {
    // BELT_USER should get 403 on PUT
    const putBody = { ...postBody, label: 'Updated Label' };
    await expectForbidden('PUT', '/api/admin/catalog-items', BELT_USER_TOKEN, putBody, 'BELT_USER');

    // SUPER_ADMIN should succeed on PUT
    await expectSuccess('PUT', '/api/admin/catalog-items', SUPER_ADMIN_TOKEN, putBody, 'SUPER_ADMIN');

    // BELT_ADMIN test (if token provided)
    if (BELT_ADMIN_TOKEN) {
      const putBody2 = { ...postBody, label: 'BELT_ADMIN Update' };
      await expectSuccess('PUT', '/api/admin/catalog-items', BELT_ADMIN_TOKEN, putBody2, 'BELT_ADMIN');
    }
  }
}

/**
 * Test /api/admin/cleats
 */
async function testCleats() {
  console.log(bold('\n--- /api/admin/cleats ---'));

  const postBody = {
    material_family: 'SMOKE_TEST',
    cleat_profile: 'TEST_PROFILE',
    cleat_size: '1/2',
    cleat_pattern: 'STRAIGHT',
    min_pulley_dia_12in_solid_in: 4.0,
  };

  // BELT_USER should get 403 on POST
  await expectForbidden('POST', '/api/admin/cleats', BELT_USER_TOKEN, postBody, 'BELT_USER');

  // SUPER_ADMIN should succeed on POST
  const { passed: postOk, data: created } = await expectSuccess(
    'POST',
    '/api/admin/cleats',
    SUPER_ADMIN_TOKEN,
    postBody,
    'SUPER_ADMIN'
  );

  if (postOk && created?.id) {
    // BELT_USER should get 403 on PUT
    const putBody = { id: created.id, min_pulley_dia_12in_solid_in: 4.5 };
    await expectForbidden('PUT', '/api/admin/cleats', BELT_USER_TOKEN, putBody, 'BELT_USER');

    // SUPER_ADMIN should succeed on PUT
    await expectSuccess('PUT', '/api/admin/cleats', SUPER_ADMIN_TOKEN, putBody, 'SUPER_ADMIN');

    // BELT_ADMIN test (if token provided)
    if (BELT_ADMIN_TOKEN) {
      const putBody2 = { id: created.id, min_pulley_dia_12in_solid_in: 4.6 };
      await expectSuccess('PUT', '/api/admin/cleats', BELT_ADMIN_TOKEN, putBody2, 'BELT_ADMIN');
    }
  }
}

/**
 * Test /api/admin/cleats/factors
 */
async function testCleatFactors() {
  console.log(bold('\n--- /api/admin/cleats/factors ---'));

  const postBody = {
    material_family: 'SMOKE_TEST_FAC',
    centers_in: 6,
    factor: 1.25,
  };

  // BELT_USER should get 403 on POST
  await expectForbidden('POST', '/api/admin/cleats/factors', BELT_USER_TOKEN, postBody, 'BELT_USER');

  // SUPER_ADMIN should succeed on POST
  const { passed: postOk, data: created } = await expectSuccess(
    'POST',
    '/api/admin/cleats/factors',
    SUPER_ADMIN_TOKEN,
    postBody,
    'SUPER_ADMIN'
  );

  if (postOk && created?.id) {
    // BELT_USER should get 403 on PUT
    const putBody = { id: created.id, factor: 1.30 };
    await expectForbidden('PUT', '/api/admin/cleats/factors', BELT_USER_TOKEN, putBody, 'BELT_USER');

    // SUPER_ADMIN should succeed on PUT
    await expectSuccess('PUT', '/api/admin/cleats/factors', SUPER_ADMIN_TOKEN, putBody, 'SUPER_ADMIN');

    // BELT_ADMIN test (if token provided)
    if (BELT_ADMIN_TOKEN) {
      const putBody2 = { id: created.id, factor: 1.35 };
      await expectSuccess('PUT', '/api/admin/cleats/factors', BELT_ADMIN_TOKEN, putBody2, 'BELT_ADMIN');
    }
  }
}

/**
 * Test /api/admin/pulley-library (styles)
 */
async function testPulleyLibrary() {
  console.log(bold('\n--- /api/admin/pulley-library ---'));

  const testKey = uniqueKey('SMOKE_STYLE');
  const postBody = {
    key: testKey,
    name: 'Smoke Test Style',
    style_type: 'DRUM',
  };

  // BELT_USER should get 403 on POST
  await expectForbidden('POST', '/api/admin/pulley-library', BELT_USER_TOKEN, postBody, 'BELT_USER');

  // SUPER_ADMIN should succeed on POST
  const { passed: postOk } = await expectSuccess(
    'POST',
    '/api/admin/pulley-library',
    SUPER_ADMIN_TOKEN,
    postBody,
    'SUPER_ADMIN'
  );

  if (postOk) {
    // BELT_USER should get 403 on PUT
    const putBody = { key: testKey, name: 'Updated Smoke Style' };
    await expectForbidden('PUT', '/api/admin/pulley-library', BELT_USER_TOKEN, putBody, 'BELT_USER');

    // SUPER_ADMIN should succeed on PUT
    await expectSuccess('PUT', '/api/admin/pulley-library', SUPER_ADMIN_TOKEN, putBody, 'SUPER_ADMIN');

    // BELT_USER should get 403 on DELETE
    await expectForbidden(
      'DELETE',
      `/api/admin/pulley-library?key=${testKey}`,
      BELT_USER_TOKEN,
      null,
      'BELT_USER'
    );

    // SUPER_ADMIN should succeed on DELETE (soft delete)
    await expectSuccess(
      'DELETE',
      `/api/admin/pulley-library?key=${testKey}`,
      SUPER_ADMIN_TOKEN,
      null,
      'SUPER_ADMIN'
    );

    // BELT_ADMIN test (if token provided) - create another for BELT_ADMIN tests
    if (BELT_ADMIN_TOKEN) {
      const testKey2 = uniqueKey('SMOKE_STYLE_BA');
      const postBody2 = { key: testKey2, name: 'BELT_ADMIN Test Style', style_type: 'WING' };
      const { passed: baPostOk } = await expectSuccess(
        'POST',
        '/api/admin/pulley-library',
        BELT_ADMIN_TOKEN,
        postBody2,
        'BELT_ADMIN'
      );
      if (baPostOk) {
        await expectSuccess(
          'DELETE',
          `/api/admin/pulley-library?key=${testKey2}`,
          BELT_ADMIN_TOKEN,
          null,
          'BELT_ADMIN'
        );
      }
    }
  }
}

/**
 * Test /api/admin/pulley-models
 */
async function testPulleyModels() {
  console.log(bold('\n--- /api/admin/pulley-models ---'));

  // First, we need a valid style_key. Use an existing one.
  // We'll use 'PCI_DRUM' which should exist from seed data
  const testKey = uniqueKey('SMOKE_MODEL');
  const postBody = {
    model_key: testKey,
    display_name: 'Smoke Test Model',
    style_key: 'PCI_DRUM', // Must exist
    shell_od_in: 4.0,
    default_shell_wall_in: 0.134,
    face_width_min_in: 6,
    face_width_max_in: 48,
  };

  // BELT_USER should get 403 on POST
  await expectForbidden('POST', '/api/admin/pulley-models', BELT_USER_TOKEN, postBody, 'BELT_USER');

  // SUPER_ADMIN should succeed on POST
  const { passed: postOk, data: created } = await expectSuccess(
    'POST',
    '/api/admin/pulley-models',
    SUPER_ADMIN_TOKEN,
    postBody,
    'SUPER_ADMIN'
  );

  // If POST failed because style_key doesn't exist, note it
  if (!postOk && created?.error?.includes('not found')) {
    console.log(yellow('    Note: PCI_DRUM style may not exist. Skipping model tests.'));
    return;
  }

  if (postOk) {
    // BELT_USER should get 403 on PUT
    const putBody = { model_key: testKey, display_name: 'Updated Smoke Model' };
    await expectForbidden('PUT', '/api/admin/pulley-models', BELT_USER_TOKEN, putBody, 'BELT_USER');

    // SUPER_ADMIN should succeed on PUT
    await expectSuccess('PUT', '/api/admin/pulley-models', SUPER_ADMIN_TOKEN, putBody, 'SUPER_ADMIN');

    // BELT_USER should get 403 on DELETE
    await expectForbidden(
      'DELETE',
      `/api/admin/pulley-models?model_key=${testKey}`,
      BELT_USER_TOKEN,
      null,
      'BELT_USER'
    );

    // SUPER_ADMIN should succeed on DELETE (soft delete)
    await expectSuccess(
      'DELETE',
      `/api/admin/pulley-models?model_key=${testKey}`,
      SUPER_ADMIN_TOKEN,
      null,
      'SUPER_ADMIN'
    );

    // BELT_ADMIN test (if token provided)
    if (BELT_ADMIN_TOKEN) {
      const testKey2 = uniqueKey('SMOKE_MODEL_BA');
      const postBody2 = {
        ...postBody,
        model_key: testKey2,
        display_name: 'BELT_ADMIN Test Model',
      };
      const { passed: baPostOk } = await expectSuccess(
        'POST',
        '/api/admin/pulley-models',
        BELT_ADMIN_TOKEN,
        postBody2,
        'BELT_ADMIN'
      );
      if (baPostOk) {
        await expectSuccess(
          'DELETE',
          `/api/admin/pulley-models?model_key=${testKey2}`,
          BELT_ADMIN_TOKEN,
          null,
          'BELT_ADMIN'
        );
      }
    }
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log(bold('='.repeat(60)));
  console.log(bold('RBAC Phase 1.5 Smoke Tests'));
  console.log(bold('='.repeat(60)));
  console.log(dim(`Base URL: ${BASE_URL}`));
  console.log(dim(`BELT_USER token: ${BELT_USER_TOKEN.slice(0, 20)}...`));
  console.log(dim(`SUPER_ADMIN token: ${SUPER_ADMIN_TOKEN.slice(0, 20)}...`));
  if (BELT_ADMIN_TOKEN) {
    console.log(dim(`BELT_ADMIN token: ${BELT_ADMIN_TOKEN.slice(0, 20)}...`));
  } else {
    console.log(yellow('BELT_ADMIN token not provided - skipping BELT_ADMIN tests'));
  }

  // Run all tests
  await testVGuides();
  await testCatalogItems();
  await testCleats();
  await testCleatFactors();
  await testPulleyLibrary();
  await testPulleyModels();

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

  // Print results table
  console.log(bold('\nResults by Route:'));
  console.log('-'.repeat(80));

  const groupedByRoute = {};
  for (const r of results) {
    const key = `${r.method} ${r.route}`;
    if (!groupedByRoute[key]) groupedByRoute[key] = [];
    groupedByRoute[key].push(r);
  }

  for (const [routeKey, tests] of Object.entries(groupedByRoute)) {
    const allPassed = tests.every((t) => t.passed);
    const status = allPassed ? green('PASS') : red('FAIL');
    console.log(`${status} ${routeKey}`);
    for (const t of tests) {
      const mark = t.passed ? green('✓') : red('✗');
      console.log(`  ${mark} ${t.role} => ${t.expected}`);
    }
  }

  console.log('-'.repeat(80));

  // Exit with appropriate code
  if (failed > 0) {
    console.log(red(`\n${failed} test(s) failed`));
    process.exit(1);
  } else {
    console.log(green('\nAll tests passed!'));
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(red(`Fatal error: ${err.message}`));
  console.error(err.stack);
  process.exit(1);
});
