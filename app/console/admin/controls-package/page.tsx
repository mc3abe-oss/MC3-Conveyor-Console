/**
 * Admin Controls Package Page
 *
 * Manage controls package dropdown options.
 */

import CatalogAdmin from '../components/CatalogAdmin';

export default function AdminControlsPackagePage() {
  return (
    <CatalogAdmin
      catalogKey="controls_package"
      title="Controls Package Options"
      itemLabel="Controls Package Option"
      description="Manage the controls package options shown in the Electrical section. These determine the level of automation included with the conveyor."
    />
  );
}
