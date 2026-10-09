import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { Customer, BusinessSettings } from '../../types/index.ts';
import { formatCurrency, formatDate, INDIAN_STATES } from '../../utils/format.ts';
import {
  Users,
  UserPlus,
  Search,
  CreditCard,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Phone,
  MapPin,
} from 'lucide-react';

interface CustomersViewProps {
  settings: BusinessSettings;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ settings }) => {
  const { user, isAdmin, hasPermission } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Add / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Collect Payment Modal
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [collectCustomer, setCollectCustomer] = useState<Customer | null>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState('cash');
  const [collectRef, setCollectRef] = useState('');

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: settings.city || 'Mumbai',
    state: settings.state || 'Maharashtra',
    pincode: '',
    gstin: '',
    type: 'retail' as 'retail' | 'wholesale',
    creditLimit: 0,
    notes: '',
  });

  const canManage = isAdmin || hasPermission('manage_customers');
  const canRecordPayment = isAdmin || hasPermission('record_payments');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      city: settings.city,
      state: settings.state,
      pincode: '',
      gstin: '',
      type: 'retail',
      creditLimit: 0,
      notes: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      address: c.address || '',
      city: c.city || settings.city,
      state: c.state || settings.state,
      pincode: c.pincode || '',
      gstin: c.gstin || '',
      type: c.type,
      creditLimit: c.creditLimit,
      notes: c.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    try {
      if (editingCustomer) {
        await api.updateCustomer(editingCustomer.id, formData);
        setSuccessMsg(`Updated customer ${formData.name}`);
      } else {
        await api.createCustomer(formData);
        setSuccessMsg(`Created customer ${formData.name}`);
      }
      setShowModal(false);
      loadCustomers();
    } catch (err: any) {
      setError(err.message || 'Failed saving customer');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCollectPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectCustomer || !collectAmount) return;

    setFormLoading(true);
    setError(null);
    try {
      const res = await api.recordCustomerDuePayment({
        customerId: collectCustomer.id,
        amount: Number(collectAmount),
        paymentMethod: collectMethod,
        referenceNumber: collectRef,
      });
      setSuccessMsg(`Collected ₹${collectAmount} from ${collectCustomer.name}. Receipt: ${res.receipt.receiptNumber}`);
      setShowCollectModal(false);
      setCollectAmount('');
      setCollectRef('');
      loadCustomers();
    } catch (err: any) {
      setError(err.message || 'Failed recording payment');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.gstin && c.gstin.toLowerCase().includes(q));
    const matchesType = typeFilter === 'ALL' || c.type === typeFilter;
    return matchesQuery && matchesType;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1F2937] flex items-center gap-2">
            <Users className="h-5 w-5 text-[#2563EB]" />
            <span>Customer Directory & Ledger</span>
          </h1>
          <p className="text-xs text-[#6B7280]">
            Manage retail walk-ins, wholesale credit accounts, GST numbers, and payment collections.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadCustomers}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {canManage && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
            >
              <UserPlus className="h-4 w-4" />
              <span>Register New Customer</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
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
            placeholder="Search by customer name, phone number, GSTIN..."
            className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-3 text-xs text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 font-medium"
        >
          <option value="ALL">All Customer Types</option>
          <option value="retail">Retail Buyers</option>
          <option value="wholesale">Wholesale Dealers</option>
        </select>
      </div>

      {/* Customers Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#6B7280] font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Phone / Email</th>
                <th className="py-3 px-4">Location & State</th>
                <th className="py-3 px-4">GSTIN</th>
                <th className="py-3 px-4 text-center">Type</th>
                <th className="py-3 px-4 text-right">Credit Limit</th>
                <th className="py-3 px-4 text-right">Outstanding Due</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCustomers.map((c) => {
                const hasDue = (c.outstandingBalance || 0) > 0;

                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">{c.name}</div>
                      {c.notes && <div className="text-[10px] text-gray-400 truncate max-w-xs">{c.notes}</div>}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      <div>{c.phone}</div>
                      {c.email && <div className="text-[11px] text-gray-400">{c.email}</div>}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      <div>{c.city || '—'}, {c.state}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-gray-800">
                      {c.gstin || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          c.type === 'wholesale'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {c.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600 font-medium">
                      {c.creditLimit > 0 ? formatCurrency(c.creditLimit) : 'No Limit'}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold">
                      <span className={hasDue ? 'text-red-600' : 'text-gray-900'}>
                        {formatCurrency(c.outstandingBalance)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canRecordPayment && hasDue && (
                          <button
                            onClick={() => {
                              setCollectCustomer(c);
                              setCollectAmount(c.outstandingBalance.toString());
                              setShowCollectModal(true);
                            }}
                            className="flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            title="Collect Due Payment"
                          >
                            <CreditCard className="h-3 w-3" />
                            <span>Collect</span>
                          </button>
                        )}

                        {canManage && (
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                            title="Edit Customer"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-gray-500">
                    No customers found matching filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* COLLECT DUE PAYMENT MODAL */}
      {showCollectModal && collectCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <h3 className="text-sm font-bold text-gray-900">
                Collect Payment: {collectCustomer.name}
              </h3>
              <button onClick={() => setShowCollectModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
              Current Outstanding Due: <strong>{formatCurrency(collectCustomer.outstandingBalance)}</strong>
            </div>

            <form onSubmit={handleCollectPaymentSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Payment Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2 font-bold text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Payment Method</label>
                <select
                  value={collectMethod}
                  onChange={(e) => setCollectMethod(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI / QR</option>
                  <option value="bank_transfer">NEFT / RTGS / Cheque</option>
                  <option value="card">Card</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Reference / UTR / Cheque Number</label>
                <input
                  type="text"
                  value={collectRef}
                  onChange={(e) => setCollectRef(e.target.value)}
                  placeholder="e.g. UPI/HDFC/99281726"
                  className="w-full rounded-lg border border-gray-300 p-2"
                />
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCollectModal(false)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {formLoading ? 'Recording...' : 'Record Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT CUSTOMER MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <h3 className="text-base font-bold text-gray-900">
                {editingCustomer ? 'Edit Customer Profile' : 'Register New Customer'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Customer / Enterprise Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Apex Infotech Systems"
                  className="w-full rounded-lg border border-gray-300 p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98200 12345"
                    className="w-full rounded-lg border border-gray-300 p-2"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Email ID</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="account@enterprise.com"
                    className="w-full rounded-lg border border-gray-300 p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Customer Type</label>
                  <select
                    value={formData.type}
                    onChange={(e: any) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2 font-medium"
                  >
                    <option value="retail">Retail Buyer</option>
                    <option value="wholesale">Wholesale Dealer (Eligible for wholesale rates)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">State (GST Place of Supply)</label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2 font-medium"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    placeholder="27AABCA1234F1Z5"
                    className="w-full rounded-lg border border-gray-300 p-2 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                    placeholder="250000"
                    className="w-full rounded-lg border border-gray-300 p-2 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Billing Street Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Plot 10, MIDC Industrial Area"
                  className="w-full rounded-lg border border-gray-300 p-2"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Account Notes / Credit Terms</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. 15-day payment cycle agreement"
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {formLoading ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
