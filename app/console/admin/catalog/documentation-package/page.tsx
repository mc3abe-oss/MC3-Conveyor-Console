/**
 * Admin Documentation Package Page
 *
 * Manage documentation package dropdown options.
 */

import CatalogAdmin from '../../components/CatalogAdmin';

export default function AdminDocumentationPackagePage() {
  return (
    <CatalogAdmin
      catalogKey="documentation_package"
      title="Documentation Package Options"
      itemLabel="Documentation Package Option"
      description="Manage the documentation package options shown in the Build Options section. These determine what documentation deliverables are included."
    />
  );
}
