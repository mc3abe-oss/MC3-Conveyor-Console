/**
 * Delete All Applications Script
 * Executes the migration to permanently delete all saved applications
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteAllApplications() {
  console.log('Starting application deletion...\n');

  // Get counts before deletion
  const { count: recipeRunsBefore } = await supabase.from('recipe_runs').select('*', { count: 'exact', head: true });
  const { count: recipesBefore } = await supabase.from('calc_recipes').select('*', { count: 'exact', head: true });
  const { count: configRevsBefore } = await supabase.from('configuration_revisions').select('*', { count: 'exact', head: true });
  const { count: configsBefore } = await supabase.from('configurations').select('*', { count: 'exact', head: true });

  console.log('BEFORE DELETION:');
  console.log(`  recipe_runs: ${recipeRunsBefore || 0}`);
  console.log(`  calc_recipes: ${recipesBefore || 0}`);
  console.log(`  configuration_revisions: ${configRevsBefore || 0}`);
  console.log(`  configurations: ${configsBefore || 0}`);
  console.log('');

  // Step 1: Delete recipe_runs
  console.log('Step 1: Deleting recipe_runs...');
  const { error: e1 } = await supabase.from('recipe_runs').delete().gte('id', '00000000-0000-0000-0000-000000000000');
  if (e1) console.error('  Error:', e1.message);
  else console.log('  Done');

  // Step 2: Clear application_id in vault tables
  console.log('Step 2: Clearing application_id in vault tables...');

  const { error: e2a } = await supabase.from('specs').update({ application_id: null }).not('application_id', 'is', null);
  if (e2a) console.error('  specs error:', e2a.message);

  const { error: e2b } = await supabase.from('notes').update({ application_id: null }).not('application_id', 'is', null);
  if (e2b) console.error('  notes error:', e2b.message);

  const { error: e2c } = await supabase.from('attachments').update({ application_id: null }).not('application_id', 'is', null);
  if (e2c) console.error('  attachments error:', e2c.message);

  const { error: e2d } = await supabase.from('scope_lines').update({ application_id: null }).not('application_id', 'is', null);
  if (e2d) console.error('  scope_lines error:', e2d.message);

  console.log('  Done');

  // Step 3: Delete configuration_revisions
  console.log('Step 3: Deleting configuration_revisions...');
  const { error: e3 } = await supabase.from('configuration_revisions').delete().gte('id', '00000000-0000-0000-0000-000000000000');
  if (e3) console.error('  Error:', e3.message);
  else console.log('  Done');

  // Step 4: Delete configurations
  console.log('Step 4: Deleting configurations...');
  const { error: e4 } = await supabase.from('configurations').delete().gte('id', '00000000-0000-0000-0000-000000000000');
  if (e4) console.error('  Error:', e4.message);
  else console.log('  Done');

  // Step 5: Delete calc_recipes
  console.log('Step 5: Deleting calc_recipes...');
  const { error: e5 } = await supabase.from('calc_recipes').delete().gte('id', '00000000-0000-0000-0000-000000000000');
  if (e5) console.error('  Error:', e5.message);
  else console.log('  Done');

  // Get counts after deletion
  console.log('\nAFTER DELETION:');
  const { count: recipeRunsAfter } = await supabase.from('recipe_runs').select('*', { count: 'exact', head: true });
  const { count: recipesAfter } = await supabase.from('calc_recipes').select('*', { count: 'exact', head: true });
  const { count: configRevsAfter } = await supabase.from('configuration_revisions').select('*', { count: 'exact', head: true });
  const { count: configsAfter } = await supabase.from('configurations').select('*', { count: 'exact', head: true });

  console.log(`  recipe_runs: ${recipeRunsAfter || 0}`);
  console.log(`  calc_recipes: ${recipesAfter || 0}`);
  console.log(`  configuration_revisions: ${configRevsAfter || 0}`);
  console.log(`  configurations: ${configsAfter || 0}`);

  // Verify untouched tables
  console.log('\nUNTOUCHED TABLES (preserved):');
  const { count: quotes } = await supabase.from('quotes').select('*', { count: 'exact', head: true });
  const { count: salesOrders } = await supabase.from('sales_orders').select('*', { count: 'exact', head: true });
  const { count: beltCatalog } = await supabase.from('belt_catalog').select('*', { count: 'exact', head: true });

  console.log(`  quotes: ${quotes || 0}`);
  console.log(`  sales_orders: ${salesOrders || 0}`);
  console.log(`  belt_catalog: ${beltCatalog || 0}`);

  console.log('\n✓ Application deletion complete!');
}

deleteAllApplications().catch(console.error);
