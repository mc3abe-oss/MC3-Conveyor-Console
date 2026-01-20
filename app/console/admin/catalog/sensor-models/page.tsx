/**
 * Admin Sensor Models Page
 *
 * Manage sensor model options for sensor selection with quantity.
 */

import CatalogAdmin from '../../components/CatalogAdmin';

export default function AdminSensorModelsPage() {
  return (
    <CatalogAdmin
      catalogKey="sensor_model"
      title="Sensor Models"
      itemLabel="Sensor Model"
      description="Manage the sensor models available for selection. Users can select multiple models and specify quantities for each."
    />
  );
}
