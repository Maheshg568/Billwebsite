import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { Invoice, BusinessSettings } from '../../types/index.ts';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format.ts';
import {
  Search,
  Printer,
  Eye,
  Ban,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  FileSpreadsheet,
} from 'lucide-react';

interface InvoiceHistoryViewProps {
  settings: BusinessSettings;
  onSelectInvoiceToPrint: (invoice: Invoice) => void;
}

export const InvoiceHistoryView: React.FC<InvoiceHistoryViewProps> = ({
  settings,
  onSelectInvoiceToPrint,
}) => {
  const { user, isAdmin, hasPermission } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  // Cancel Modal state
  const [selectedInvoiceToCancel, setSelectedInvoiceToCancel] = useState<Invoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // View details modal
  const [selectedInvoiceToView, setSelectedInvoiceToView] = useState<Invoice | null>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getInvoices();
      setInvoices(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceToCancel || !cancelReason.trim()) return;

    setCancelLoading(true);
    setError(null);
    try {
      const res = await api.cancelInvoice(selectedInvoiceToCancel.id, cancelReason);
      if (res.approvalRequired) {
        setSuccessMsg(`Approval request #${res.approvalRequired} dispatched to Administrator for review.`);
      } else {
        setSuccessMsg(`Invoice ${selectedInvoiceToCancel.invoiceNumber} cancelled successfully. Inventory restored.`);
      }
      setSelectedInvoiceToCancel(null);
      setCancelReason('');
      loadInvoices();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel invoice.');
    } finally {
      setCancelLoading(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q) ||
      inv.employeeName.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    const matchesPayment = paymentFilter === 'ALL' || inv.paymentStatus === paymentFilter;

    return matchesQuery && matchesStatus && matchesPayment;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1F2937] flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-[#2563EB]" />
            <span>Bills & Invoices Ledger</span>
          </h1>
          <p className="text-xs text-[#6B7280]">
            Complete transaction history, audit trails, printable tax invoices, and cancellation workflows.
          </p>
        </div>

        <button
          onClick={loadInvoices}
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-slate-50 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}>
            <X className="h-4 w-4 text-emerald-600" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)}>
            <X className="h-4 w-4 text-red-600" />
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by invoice number, customer name, billed by..."
            className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-3 text-xs text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 font-medium"
          >
            <option value="ALL">All Invoice Statuses</option>
            <option value="finalized">Finalized</option>
            <option value="draft">Draft</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 font-medium"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial Due</option>
            <option value="unpaid">Unpaid / Credit</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#6B7280] font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Billed By</th>
                <th className="py-3 px-4 text-right">Taxable</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-center">Payment</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-gray-900">
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                    {formatDateTime(inv.date)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-gray-900">{inv.customerName}</div>
                    <div className="text-[11px] text-gray-500">{inv.customerPhone}</div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {inv.employeeName}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600">
                    {formatCurrency(inv.totalTaxable)}
                  </td>
                  <td className="py-3 px-4 text-right font-extrabold text-gray-900">
                    {formatCurrency(inv.grandTotal)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        inv.paymentStatus === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : inv.paymentStatus === 'partial'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {inv.paymentStatus}
                    </span>
                    <div className="text-[10px] text-gray-400 uppercase mt-0.5 font-medium">
                      {inv.paymentMethod}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        inv.status === 'finalized'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : inv.status === 'cancelled'
                          ? 'bg-gray-100 text-gray-600 border border-gray-300'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedInvoiceToView(inv)}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => onSelectInvoiceToPrint(inv)}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition"
                        title="Print Invoice / Thermal Receipt"
                      >
                        <Printer className="h-4 w-4" />
                      </button>

                      {inv.status !== 'cancelled' && (
                        <button
                          onClick={() => setSelectedInvoiceToCancel(inv)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                          title="Cancel / Return Invoice"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-gray-500">
                    No invoices match the selected filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW INVOICE MODAL */}
      {selectedInvoiceToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Invoice Details: {selectedInvoiceToView.invoiceNumber}
                </h3>
                <p className="text-xs text-gray-500">
                  Created on {formatDateTime(selectedInvoiceToView.date)} by {selectedInvoiceToView.employeeName}
                </p>
              </div>
              <button
                onClick={() => setSelectedInvoiceToView(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Customer & Taxes info */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg text-xs mb-4">
              <div>
                <p className="font-bold text-gray-800">{selectedInvoiceToView.customerName}</p>
                <p className="text-gray-600">Phone: {selectedInvoiceToView.customerPhone}</p>
                <p className="text-gray-600">State: {selectedInvoiceToView.customerState}</p>
                {selectedInvoiceToView.customerGstin && (
                  <p className="font-mono text-gray-700">GSTIN: {selectedInvoiceToView.customerGstin}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-gray-500">
                  Type:{' '}
                  <span className="font-semibold text-gray-800">
                    {selectedInvoiceToView.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}
                  </span>
                </p>
                <p className="text-gray-500">
                  Payment: <span className="font-bold uppercase">{selectedInvoiceToView.paymentMethod}</span>
                </p>
                <p className="text-gray-500">
                  Status: <span className="font-bold uppercase text-emerald-700">{selectedInvoiceToView.paymentStatus}</span>
                </p>
              </div>
            </div>

            {/* Items list */}
            <table className="w-full text-xs text-left border border-gray-200 mb-4">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="p-2">Item</th>
                  <th className="p-2 text-center">Qty</th>
                  <th className="p-2 text-right">Rate</th>
                  <th className="p-2 text-right">Taxable</th>
                  <th className="p-2 text-center">GST</th>
                  <th className="p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {selectedInvoiceToView.items.map((i, idx) => (
                  <tr key={idx}>
                    <td className="p-2">
                      <div className="font-semibold text-gray-900">{i.productName}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{i.sku}</div>
                    </td>
                    <td className="p-2 text-center">
                      {i.quantity} {i.unit}
                    </td>
                    <td className="p-2 text-right">{formatCurrency(i.unitPrice)}</td>
                    <td className="p-2 text-right">{formatCurrency(i.taxableAmount)}</td>
                    <td className="p-2 text-center">{i.gstRate}%</td>
                    <td className="p-2 text-right font-bold">{formatCurrency(i.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Calculations Breakdown */}
            <div className="border border-gray-200 rounded-lg p-3 space-y-1 text-xs bg-slate-50/50 mb-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(selectedInvoiceToView.subtotal)}</span>
              </div>
              {selectedInvoiceToView.totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discounts:</span>
                  <span>-{formatCurrency(selectedInvoiceToView.totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Taxable Amount:</span>
                <span>{formatCurrency(selectedInvoiceToView.totalTaxable)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>GST (Tax):</span>
                <span>
                  {formatCurrency(
                    selectedInvoiceToView.totalCgst +
                      selectedInvoiceToView.totalSgst +
                      selectedInvoiceToView.totalIgst
                  )}
                </span>
              </div>
              <div className="flex justify-between font-extrabold text-sm text-gray-900 border-t border-gray-200 pt-1">
                <span>Grand Total:</span>
                <span>{formatCurrency(selectedInvoiceToView.grandTotal)}</span>
              </div>
            </div>

            {selectedInvoiceToView.cancellationReason && (
              <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-800 border border-red-200 mb-4">
                <strong>Cancelled:</strong> {selectedInvoiceToView.cancellationReason} (by {selectedInvoiceToView.cancelledByName})
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setSelectedInvoiceToView(null);
                  onSelectInvoiceToPrint(selectedInvoiceToView);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
              >
                <Printer className="h-4 w-4" />
                <span>Print Official Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL / RETURN MODAL */}
      {selectedInvoiceToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <div className="flex items-center gap-2 text-red-600">
                <Ban className="h-5 w-5" />
                <h3 className="text-sm font-bold text-gray-900">
                  Cancel Invoice {selectedInvoiceToCancel.invoiceNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedInvoiceToCancel(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 mb-3">
              Cancelling will reverse financial transactions and restore sold items to inventory stock.
              {!isAdmin && !hasPermission('cancel_finalized_bills') && (
                <span className="block mt-1 font-semibold text-amber-700">
                  Note: As an employee, submitting this will generate an approval request for supervisor verification.
                </span>
              )}
            </p>

            <form onSubmit={handleCancelSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Reason for Cancellation / Return *
                </label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Specify customer return reason, billing error, or damaged delivery..."
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-xs text-gray-900 focus:border-red-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceToCancel(null)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={cancelLoading || !cancelReason.trim()}
                  className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelLoading ? 'Processing...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
