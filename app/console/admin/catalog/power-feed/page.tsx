/**
 * Admin Power Feed Page
 *
 * Manage electrical power feed dropdown options.
 */

import CatalogAdmin from '../../components/CatalogAdmin';

export default function AdminPowerFeedPage() {
  return (
    <CatalogAdmin
      catalogKey="power_feed"
      title="Power Feed Options"
      itemLabel="Power Feed Option"
      description="Manage the electrical power feed options shown in the Electrical section. Options with field wiring variants include wiring in the scope."
    />
  );
}
