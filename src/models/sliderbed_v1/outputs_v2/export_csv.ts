/**
 * CSV Export for Outputs V2
 *
 * Generates quote-friendly CSV with one row per purchasable component.
 * Column order is immutable - new columns append only.
 */

import {
  ComponentV2,
  CsvRowsV2,
  CSV_COLUMNS_V2,
  OutputMessageV2,
  VendorPacketBeltV2,
  VendorPacketPulleyV2,
  VendorPacketRollerV2,
  VendorPacketDriveV2,
  VendorPacketLegsV2,
  VendorPacketCastersV2,
} from './schema';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert a value to CSV-safe string
 * Null/undefined -> empty string
 */
function toCsvValue(value: unknown): string | number {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number') {
    return value;
  }
  return String(value);
}

/**
 * Get warning codes for a component
 */
function getWarningCodes(warnings: OutputMessageV2[], componentId: string): string {
  const codes = warnings
    .filter((w) => w.related_component_ids.includes(componentId as any))
    .map((w) => w.code);
  return codes.join(';');
}

// =============================================================================
// ROW BUILDERS PER COMPONENT TYPE
// =============================================================================

function buildBeltRow(
  component: ComponentV2,
  packet: VendorPacketBeltV2,
  warnings: OutputMessageV2[]
): (string | number)[] {
  return [
    component.component_type,
    component.role,
    component.component_id,
    packet.qty,
    toCsvValue(packet.belt_width_in), // width_in
    toCsvValue(packet.overall_length_in), // length_in
    '', // diameter_in (N/A for belt)
    toCsvValue(packet.total_thickness_in), // thickness_in
    toCsvValue(packet.material), // material
    toCsvValue(packet.series), // series
    packet.splice_type, // type
    '', // load_lbf (N/A for belt)
    toCsvValue(packet.operating_conditions.speed_fpm), // speed_fpm
    '', // torque_inlb (N/A for belt)
    '', // power_hp (N/A for belt)
    toCsvValue(packet.splice_type), // splice_type
    '', // bore_in (N/A for belt)
    '', // key (N/A for belt)
    '', // voltage (N/A for belt)
    '', // phase (N/A for belt)
    toCsvValue(packet.notes), // notes
    getWarningCodes(warnings, component.component_id), // warnings
  ];
}

function buildPulleyRow(
  component: ComponentV2,
  packet: VendorPacketPulleyV2,
  warnings: OutputMessageV2[]
): (string | number)[] {
  return [
    component.component_type,
    component.role,
    component.component_id,
    packet.qty,
    toCsvValue(packet.belt_width_in), // width_in (belt width for context)
    toCsvValue(packet.face_length_in), // length_in (face length)
    toCsvValue(packet.diameter_in), // diameter_in
    toCsvValue(packet.lagging.thickness_in), // thickness_in (lagging)
    '', // material
    '', // series
    packet.pulley_role, // type
    toCsvValue(packet.loads.belt_tension_lbf), // load_lbf
    '', // speed_fpm (N/A)
    toCsvValue(packet.loads.torque_inlb), // torque_inlb
    '', // power_hp (N/A)
    '', // splice_type (N/A)
    toCsvValue(packet.hub.bore_in), // bore_in
    toCsvValue(packet.hub.key), // key
    '', // voltage (N/A)
    '', // phase (N/A)
    toCsvValue(packet.notes), // notes
    getWarningCodes(warnings, component.component_id), // warnings
  ];
}

function buildRollerRow(
  component: ComponentV2,
  packet: VendorPacketRollerV2,
  warnings: OutputMessageV2[]
): (string | number)[] {
  return [
    component.component_type,
    component.role,
    component.component_id,
    packet.qty,
    toCsvValue(packet.roller_face_in), // width_in (face)
    '', // length_in (N/A)
    toCsvValue(packet.roller_diameter_in), // diameter_in
    '', // thickness_in (N/A)
    toCsvValue(packet.tube.material), // material
    '', // series
    packet.roller_role, // type
    toCsvValue(packet.required_load_lbf), // load_lbf
    '', // speed_fpm (N/A)
    '', // torque_inlb (N/A)
    '', // power_hp (N/A)
    '', // splice_type (N/A)
    '', // bore_in (N/A)
    '', // key (N/A)
    '', // voltage (N/A)
    '', // phase (N/A)
    toCsvValue(packet.notes), // notes
    getWarningCodes(warnings, component.component_id), // warnings
  ];
}

function buildDriveRow(
  component: ComponentV2,
  packet: VendorPacketDriveV2,
  warnings: OutputMessageV2[]
): (string | number)[] {
  return [
    component.component_type,
    component.role,
    component.component_id,
    1, // qty
    '', // width_in (N/A)
    '', // length_in (N/A)
    '', // diameter_in (N/A)
    '', // thickness_in (N/A)
    '', // material
    '', // series
    toCsvValue(packet.mounting), // type
    '', // load_lbf (N/A)
    '', // speed_fpm (N/A)
    toCsvValue(packet.required_output_torque_inlb), // torque_inlb
    toCsvValue(packet.required_power_hp), // power_hp
    '', // splice_type (N/A)
    toCsvValue(packet.output_shaft.diameter_in), // bore_in (output shaft)
    toCsvValue(packet.output_shaft.key), // key
    toCsvValue(packet.electrical.volts), // voltage
    toCsvValue(packet.electrical.phase), // phase
    toCsvValue(packet.notes), // notes
    getWarningCodes(warnings, component.component_id), // warnings
  ];
}

function buildLegsRow(
  component: ComponentV2,
  packet: VendorPacketLegsV2,
  warnings: OutputMessageV2[]
): (string | number)[] {
  return [
    component.component_type,
    component.role,
    component.component_id,
    toCsvValue(packet.qty), // qty
    '', // width_in (N/A)
    '', // length_in (N/A)
    '', // diameter_in (N/A)
    '', // thickness_in (N/A)
    toCsvValue(packet.material), // material
    '', // series
    toCsvValue(packet.foot_type), // type
    toCsvValue(packet.load_rating_lbf_each), // load_lbf
    '', // speed_fpm (N/A)
    '', // torque_inlb (N/A)
    '', // power_hp (N/A)
    '', // splice_type (N/A)
    '', // bore_in (N/A)
    '', // key (N/A)
    '', // voltage (N/A)
    '', // phase (N/A)
    toCsvValue(packet.notes), // notes
    getWarningCodes(warnings, component.component_id), // warnings
  ];
}

function buildCastersRow(
  component: ComponentV2,
  packet: VendorPacketCastersV2,
  warnings: OutputMessageV2[]
): (string | number)[] {
  return [
    component.component_type,
    component.role,
    component.component_id,
    toCsvValue(packet.qty), // qty
    '', // width_in (N/A)
    '', // length_in (N/A)
    toCsvValue(packet.wheel_diameter_in), // diameter_in (wheel)
    '', // thickness_in (N/A)
    '', // material
    '', // series
    packet.locking ? 'locking' : 'swivel', // type
    toCsvValue(packet.load_rating_lbf_each), // load_lbf
    '', // speed_fpm (N/A)
    '', // torque_inlb (N/A)
    '', // power_hp (N/A)
    '', // splice_type (N/A)
    '', // bore_in (N/A)
    '', // key (N/A)
    '', // voltage (N/A)
    '', // phase (N/A)
    toCsvValue(packet.notes), // notes
    getWarningCodes(warnings, component.component_id), // warnings
  ];
}

// =============================================================================
// MAIN CSV BUILDER
// =============================================================================

export function buildCsvRows(components: ComponentV2[], warnings: OutputMessageV2[]): CsvRowsV2 {
  const rows: (string | number)[][] = [];

  for (const component of components) {
    const packet = component.vendor_packet;
    if (!packet) continue;

    switch (component.component_type) {
      case 'belt':
        rows.push(buildBeltRow(component, packet as VendorPacketBeltV2, warnings));
        break;
      case 'pulley':
        rows.push(buildPulleyRow(component, packet as VendorPacketPulleyV2, warnings));
        break;
      case 'roller':
        rows.push(buildRollerRow(component, packet as VendorPacketRollerV2, warnings));
        break;
      case 'drive':
        rows.push(buildDriveRow(component, packet as VendorPacketDriveV2, warnings));
        break;
      case 'support':
        if (component.role === 'legs') {
          rows.push(buildLegsRow(component, packet as VendorPacketLegsV2, warnings));
        } else if (component.role === 'casters') {
          rows.push(buildCastersRow(component, packet as VendorPacketCastersV2, warnings));
        }
        break;
    }
  }

  return {
    columns: [...CSV_COLUMNS_V2],
    rows,
  };
}

/**
 * Export CSV rows to string
 */
export function csvRowsToString(csvRows: CsvRowsV2): string {
  const lines: string[] = [];

  // Header row
  lines.push(csvRows.columns.join(','));

  // Data rows
  for (const row of csvRows.rows) {
    const escapedRow = row.map((cell) => {
      const str = String(cell);
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    lines.push(escapedRow.join(','));
  }

  return lines.join('\n');
}
