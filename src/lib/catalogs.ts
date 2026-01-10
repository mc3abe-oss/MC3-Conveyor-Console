/**
 * Catalog Configuration
 *
 * Maps form field names to their catalog_key in the database
 */

export const CATALOG_KEYS = {
  // Core catalogs (seeded)
  material_type: 'material_type',
  process_type: 'process_type',
  environment_factors: 'environment_factor', // Note: database uses singular
  fluid_type: 'fluid_type',
  part_temperature_class: 'part_temperature_class',
  power_feed: 'power_feed',
  controls_package: 'controls_package',
  spec_source: 'spec_source',

  // Build option catalogs (seeded)
  support_option: 'support_option',
  bearing_grade: 'bearing_grade',
  documentation_package: 'documentation_package',
  finish_paint_system: 'finish_paint_system',
  motor_brand: 'motor_brand',

  // Sensors/Controls (multi-select, includes field wiring variants)
  sensor_option: 'sensor_option',

  // Support model catalogs (v1.39)
  leg_model: 'leg_model',
  caster_model: 'caster_model',

  // Note: These are NOT catalogs and are rendered as native inputs:
  // - parts_sharp: boolean checkbox
  // - labels_required: boolean checkbox
  // - send_to_estimating: boolean checkbox
  // - ambient_temperature: text input
  // NOTE: field_wiring_required has been removed - use sensor_option variants instead
} as const;

export type CatalogKey = keyof typeof CATALOG_KEYS;

/**
 * Catalog item shape returned from API
 */
export interface CatalogItem {
  item_key: string;
  label: string;
}

/**
 * Fetch catalog items from API
 */
export async function fetchCatalogItems(catalogKey: string): Promise<CatalogItem[]> {
  try {
    const response = await fetch(`/api/catalog?key=${encodeURIComponent(catalogKey)}`);

    if (!response.ok) {
      console.error(`Failed to fetch catalog: ${catalogKey}`, await response.text());
      return [];
    }

    const items = (await response.json()) as CatalogItem[];
    return items;
  } catch (error) {
    console.error(`Error fetching catalog: ${catalogKey}`, error);
    return [];
  }
}
