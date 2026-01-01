'use client';

import Link from 'next/link';
import Header from '../components/Header';
import RecordListPage, { Column, StatusOption } from '../components/RecordListPage';
import { Quote, QuoteStatus } from '../../src/lib/database/quote-types';

// ============================================================================
// STATUS STYLING
// ============================================================================

const STATUS_BADGE_COLORS: Record<QuoteStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
  converted: 'bg-purple-100 text-purple-800',
};

const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  won: 'Won',
  lost: 'Lost',
  converted: 'Converted',
};

// ============================================================================
// STATUS OPTIONS FOR FILTER
// ============================================================================

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'converted', label: 'Converted' },
];

// ============================================================================
// TABLE COLUMNS
// ============================================================================

const columns: Column<Quote>[] = [
  {
    key: 'quote_number',
    header: 'Quote #',
    render: (quote) => quote.quote_number || `Q${quote.base_number}`,
  },
  {
    key: 'status',
    header: 'Status',
    render: (quote) => (
      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${STATUS_BADGE_COLORS[quote.quote_status]}`}>
        {STATUS_LABELS[quote.quote_status]}
      </span>
    ),
  },
  {
    key: 'customer',
    header: 'Customer',
    render: (quote) =>
      quote.customer_name ? (
        <span className="text-sm text-gray-900">{quote.customer_name}</span>
      ) : (
        <span className="text-sm text-gray-400 italic">No customer</span>
      ),
  },
  {
    key: 'created_at',
    header: 'Created',
    render: (quote) => (
      <span className="text-sm text-gray-500">
        {new Date(quote.created_at).toLocaleDateString()}
      </span>
    ),
  },
  {
    key: 'converted_to',
    header: 'Converted To',
    render: (quote) =>
      quote.converted_to_sales_order_id ? (
        <Link
          href={`/sales-orders/${quote.converted_to_sales_order_id}`}
          className="text-sm text-purple-600 hover:text-purple-800"
          onClick={(e) => e.stopPropagation()}
        >
          View Sales Order
        </Link>
      ) : (
        <span className="text-sm text-gray-400">-</span>
      ),
  },
];

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function QuotesPage() {
  return (
    <>
      <Header loadedConfigurationId={null} />
      <RecordListPage<Quote>
        title="Quotes"
        description="Manage quotes and convert won quotes to sales orders"
        entityName="quote"
        entityNamePlural="quotes"
        apiEndpoint="/api/quotes"
        columns={columns}
        getRowKey={(quote) => quote.id}
        getRowLink={(quote) => `/quotes/${quote.id}`}
        statusOptions={STATUS_OPTIONS}
      />
    </>
  );
}
