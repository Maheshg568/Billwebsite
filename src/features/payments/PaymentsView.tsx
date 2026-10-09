import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { PaymentRecord, Customer, Supplier } from '../../types/index.ts';
import { formatCurrency, formatDateTime } from '../../utils/format.ts';
import {
  CreditCard,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

export const PaymentsView: React.FC = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'receipts' | 'customer_dues' | 'supplier_dues'>('receipts');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pList, cList, sList] = await Promise.all([
        api.getPayments(),
        api.getCustomers(),
        api.getSuppliers(),
      ]);
      setPayments(pList);
      setCustomers(cList);
      setSuppliers(sList);
    } catch (err: any) {
      setError(err.message || 'Failed loading payments data');
    } finally {
      setLoading(false);
    }
  };

  const totalCollected = payments.reduce((acc, curr) => acc + curr.amount, 0);
  const totalCustomerReceivables = customers.reduce((acc, curr) => acc + (curr.outstandingBalance || 0), 0);
  const totalSupplierPayables = suppliers.reduce((acc, curr) => acc + (curr.outstandingBalance || 0), 0);

  const filteredPayments = payments.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      p.receiptNumber.toLowerCase().includes(q) ||
      (p.customerName && p.customerName.toLowerCase().includes(q)) ||
      (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(q))
    );
  });

  const dueCustomers = customers.filter((c) => (c.outstandingBalance || 0) > 0);
  const dueSuppliers = suppliers.filter((s) => (s.outstandingBalance || 0) > 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1F2937] flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[#2563EB]" />
            <span>Payments & Outstanding Dues</span>
          </h1>
          <p className="text-xs text-[#6B7280]">
            Track collection receipts, customer receivables ledger, and supplier outstanding payables.
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-slate-50 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs">
          <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
            <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
            <span>Total Collected Inflow</span>
          </div>
          <div className="text-xl font-extrabold text-emerald-900 mt-1">
            {formatCurrency(totalCollected)}
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5">Recorded payment receipts</div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-2xs">
          <div className="text-xs text-amber-800 font-semibold flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-amber-600" />
            <span>Customer Receivables (Dues)</span>
          </div>
          <div className="text-xl font-extrabold text-amber-900 mt-1">
            {formatCurrency(totalCustomerReceivables)}
          </div>
          <div className="text-[11px] text-amber-700 mt-0.5">From {dueCustomers.length} credit accounts</div>
        </div>

        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-2xs">
          <div className="text-xs text-indigo-800 font-semibold flex items-center gap-1.5">
            <ArrowUpRight className="h-4 w-4 text-indigo-600" />
            <span>Supplier Payables</span>
          </div>
          <div className="text-xl font-extrabold text-indigo-900 mt-1">
            {formatCurrency(totalSupplierPayables)}
          </div>
          <div className="text-[11px] text-indigo-700 mt-0.5">Pending purchase settlements</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 text-xs font-semibold gap-6">
        <button
          onClick={() => setActiveTab('receipts')}
          className={`pb-2.5 transition border-b-2 ${
            activeTab === 'receipts'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Payment Receipts History ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab('customer_dues')}
          className={`pb-2.5 transition border-b-2 ${
            activeTab === 'customer_dues'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Customer Outstanding Ledger ({dueCustomers.length})
        </button>
        <button
          onClick={() => setActiveTab('supplier_dues')}
          className={`pb-2.5 transition border-b-2 ${
            activeTab === 'supplier_dues'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Supplier Payables Ledger ({dueSuppliers.length})
        </button>
      </div>

      {/* Tab 1: Receipts History */}
      {activeTab === 'receipts' && (
        <div className="space-y-3">
          <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-2xs">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search receipts by receipt number, customer, or invoice..."
                className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-3 text-xs text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#6B7280] font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Invoice / Purpose</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Reference No</th>
                    <th className="py-3 px-4 text-right">Amount Received</th>
                    <th className="py-3 px-4">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-gray-900">
                        {p.receiptNumber}
                      </td>
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                        {formatDateTime(p.date)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        {p.customerName || 'Walk-in'}
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-700">
                        {p.invoiceNumber ? `Bill ${p.invoiceNumber}` : p.notes || 'Settlement'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-600">
                        {p.referenceNumber || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-emerald-700">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {p.recordedByName}
                      </td>
                    </tr>
                  ))}

                  {filteredPayments.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-gray-500">
                        No payment receipts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Customer Outstanding */}
      {activeTab === 'customer_dues' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#6B7280] font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Credit Limit</th>
                  <th className="py-3 px-4 text-right">Outstanding Balance Due</th>
                  <th className="py-3 px-4">Payment Terms / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dueCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-gray-900">{c.name}</td>
                    <td className="py-3 px-4 text-gray-700">{c.phone}</td>
                    <td className="py-3 px-4 uppercase text-[10px] font-semibold">{c.type}</td>
                    <td className="py-3 px-4 text-right text-gray-600 font-medium">
                      {c.creditLimit > 0 ? formatCurrency(c.creditLimit) : 'No Limit'}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-red-600">
                      {formatCurrency(c.outstandingBalance)}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{c.notes || '—'}</td>
                  </tr>
                ))}

                {dueCustomers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-emerald-700 font-medium">
                      All customers have cleared their balances. No outstanding dues!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Supplier Payables */}
      {activeTab === 'supplier_dues' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#6B7280] font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Payment Terms</th>
                  <th className="py-3 px-4 text-right">Outstanding Payable Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dueSuppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-gray-900">{s.name}</td>
                    <td className="py-3 px-4 text-gray-700">{s.contactPerson || '—'}</td>
                    <td className="py-3 px-4 text-gray-700">{s.phone}</td>
                    <td className="py-3 px-4 text-gray-600">{s.paymentTerms}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-indigo-900">
                      {formatCurrency(s.outstandingBalance)}
                    </td>
                  </tr>
                ))}

                {dueSuppliers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs text-emerald-700 font-medium">
                      All supplier invoices are fully settled. No outstanding payables.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
