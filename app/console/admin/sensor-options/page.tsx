/**
 * Admin Sensor Options Page
 *
 * Manage sensor dropdown options.
 */

import CatalogAdmin from '../components/CatalogAdmin';

export default function AdminSensorOptionsPage() {
  return (
    <CatalogAdmin
      catalogKey="sensor_option"
      title="Sensor Options"
      itemLabel="Sensor Option"
      description="Manage sensor options available in the Electrical section."
    />
  );
}
