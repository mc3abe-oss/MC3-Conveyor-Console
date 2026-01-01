'use client';

import Link from 'next/link';
import Header from '../components/Header';
import RecordListPage, { Column } from '../components/RecordListPage';
import { SalesOrder } from '../../src/lib/database/quote-types';

// ============================================================================
// TABLE COLUMNS
// ============================================================================

const columns: Column<SalesOrder>[] = [
  {
    key: 'sales_order_number',
    header: 'Sales Order #',
    render: (so) => so.sales_order_number || `SO${so.base_number}`,
  },
  {
    key: 'customer',
    header: 'Customer',
    render: (so) =>
      so.customer_name ? (
        <span className="text-sm text-gray-900">{so.customer_name}</span>
      ) : (
        <span className="text-sm text-gray-400 italic">No customer</span>
      ),
  },
  {
    key: 'created_at',
    header: 'Created',
    render: (so) => (
      <span className="text-sm text-gray-500">
        {new Date(so.created_at).toLocaleDateString()}
      </span>
    ),
  },
  {
    key: 'origin_quote',
    header: 'From Quote',
    render: (so) =>
      so.origin_quote_id ? (
        <Link
          href={`/quotes/${so.origin_quote_id}`}
          className="text-sm text-gray-600 hover:text-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          View Origin Quote
        </Link>
      ) : (
        <span className="text-sm text-gray-400">-</span>
      ),
  },
];

// ============================================================================
// EMPTY STATE ACTION
// ============================================================================

const EmptyStateAction = (
  <Link
    href="/quotes"
    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
  >
    Go to Quotes
  </Link>
);

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function SalesOrdersPage() {
  return (
    <>
      <Header loadedConfigurationId={null} />
      <RecordListPage<SalesOrder>
        title="Sales Orders"
        description="Sales orders are created by converting won quotes"
        entityName="sales order"
        entityNamePlural="sales orders"
        apiEndpoint="/api/sales-orders"
        columns={columns}
        getRowKey={(so) => so.id}
        getRowLink={(so) => `/sales-orders/${so.id}`}
        emptyStateAction={EmptyStateAction}
      />
    </>
  );
}
