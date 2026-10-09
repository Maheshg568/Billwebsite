import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { Purchase, Supplier, Product, PurchaseItem } from '../../types/index.ts';
import { formatCurrency, formatDate } from '../../utils/format.ts';
import {
  ShoppingBag,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Trash2,
  PlusCircle,
} from 'lucide-react';

interface PurchaseEntryItem {
  productId: string;
  quantity: number;
  purchasePrice: number;
  taxRate: number;
}

export const PurchasesView: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [supplierInvoiceRef, setSupplierInvoiceRef] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<PurchaseEntryItem[]>([]);
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');

  const canCreatePurchase = isAdmin || hasPermission('create_purchases');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [purList, supList, prodList] = await Promise.all([
        api.getPurchases(),
        api.getSuppliers(),
        api.getProducts(),
      ]);
      setPurchases(purList);
      setSuppliers(supList);
      setProducts(prodList);
      if (supList.length > 0 && !supplierId) {
        setSupplierId(supList[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load purchase records');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEntry = () => {
    if (products.length === 0 || suppliers.length === 0) {
      setError('Please add at least one supplier and one product before creating a purchase.');
      return;
    }
    setSupplierInvoiceRef(`SUP-INV-${Math.floor(1000 + Math.random() * 9000)}`);
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setItems([
      {
        productId: products[0].id,
        quantity: 10,
        purchasePrice: products[0].purchaseCost || products[0].sellingPrice * 0.75,
        taxRate: products[0].taxRate,
      },
    ]);
    setAmountPaid('0');
    setNotes('');
    setShowEntryModal(true);
  };

  const addItemRow = () => {
    if (products.length === 0) return;
    setItems((prev) => [
      ...prev,
      {
        productId: products[0].id,
        quantity: 5,
        purchasePrice: products[0].purchaseCost || products[0].sellingPrice * 0.75,
        taxRate: products[0].taxRate,
      },
    ]);
  };

  const removeItemRow = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItemRow = (idx: number, updates: Partial<PurchaseEntryItem>) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i === idx) {
          const next = { ...item, ...updates };
          if (updates.productId) {
            const p = products.find((prod) => prod.id === updates.productId);
            if (p) {
              next.purchasePrice = p.purchaseCost || p.sellingPrice * 0.75;
              next.taxRate = p.taxRate;
            }
          }
          return next;
        }
        return item;
      })
    );
  };

  // Calculations
  const calculatedTotals = (() => {
    let subtotal = 0;
    let tax = 0;
    for (const item of items) {
      const lineSub = item.quantity * item.purchasePrice;
      const lineTax = (lineSub * item.taxRate) / 100;
      subtotal += lineSub;
      tax += lineTax;
    }
    const grand = Math.round(subtotal + tax);
    return { subtotal, tax, grand };
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || items.length === 0) return;

    setFormLoading(true);
    setError(null);
    try {
      const created = await api.createPurchase({
        supplierId,
        supplierInvoiceRef,
        date: purchaseDate,
        items,
        amountPaid: Number(amountPaid) || 0,
        notes,
      });

      setSuccessMsg(`Recorded inward purchase ${created.purchaseNumber} for ${formatCurrency(created.totalAmount)}. Stock added.`);
      setShowEntryModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed saving purchase entry');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1F2937] flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-[#2563EB]" />
            <span>Purchases & Inward Stock</span>
          </h1>
          <p className="text-xs text-[#6B7280]">
            Receive goods from suppliers, record supplier bills, update stock inventory, and track payables.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {canCreatePurchase && (
            <button
              onClick={handleOpenEntry}
              className="flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Record Inward Purchase</span>
            </button>
          )}
        </div>
      </div>

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

      {/* Purchases Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#6B7280] font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Purchase Date</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Supplier Bill Ref</th>
                <th className="py-3 px-4 text-center">Items Inward</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-right">Amount Paid</th>
                <th className="py-3 px-4 text-right">Balance Payable</th>
                <th className="py-3 px-4">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {purchases.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-gray-900">
                    {p.purchaseNumber}
                  </td>
                  <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                    {formatDate(p.date)}
                  </td>
                  <td className="py-3 px-4 font-semibold text-gray-900">
                    {p.supplierName}
                  </td>
                  <td className="py-3 px-4 font-mono text-gray-700">
                    {p.supplierInvoiceRef}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-gray-800">
                    {p.items.length} items ({p.items.reduce((acc, curr) => acc + curr.quantity, 0)} units)
                  </td>
                  <td className="py-3 px-4 text-right font-extrabold text-gray-900">
                    {formatCurrency(p.totalAmount)}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-700 font-semibold">
                    {formatCurrency(p.amountPaid)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold">
                    <span className={p.outstandingBalance > 0 ? 'text-amber-800' : 'text-gray-900'}>
                      {formatCurrency(p.outstandingBalance)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {p.recordedByName}
                  </td>
                </tr>
              ))}

              {purchases.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-gray-500">
                    No inward purchase orders recorded yet. Click "Record Inward Purchase" to receive stock.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD PURCHASE MODAL */}
      {showEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <h3 className="text-base font-bold text-gray-900">Record Inward Stock Purchase</h3>
              <button onClick={() => setShowEntryModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Supplier *</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2 font-medium"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Supplier Bill Ref *</label>
                  <input
                    type="text"
                    required
                    value={supplierInvoiceRef}
                    onChange={(e) => setSupplierInvoiceRef(e.target.value)}
                    placeholder="e.g. INV-2026-991"
                    className="w-full rounded-lg border border-gray-300 p-2 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Purchase Date</label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-slate-50/50">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-gray-800 text-xs">Inward Products & Quantities</span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {items.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-md border border-gray-200">
                    <div className="flex-2">
                      <select
                        value={row.productId}
                        onChange={(e) => updateItemRow(idx, { productId: e.target.value })}
                        className="w-full rounded border border-gray-300 p-1.5 text-xs font-medium"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku} - {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-20">
                      <input
                        type="number"
                        min="1"
                        required
                        value={row.quantity}
                        onChange={(e) => updateItemRow(idx, { quantity: Number(e.target.value) })}
                        placeholder="Qty"
                        className="w-full rounded border border-gray-300 p-1.5 text-xs text-center font-bold"
                      />
                    </div>

                    <div className="w-28">
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={row.purchasePrice}
                        onChange={(e) => updateItemRow(idx, { purchasePrice: Number(e.target.value) })}
                        placeholder="Rate ₹"
                        className="w-full rounded border border-gray-300 p-1.5 text-xs text-right font-medium"
                      />
                    </div>

                    <div className="w-16">
                      <select
                        value={row.taxRate}
                        onChange={(e) => updateItemRow(idx, { taxRate: Number(e.target.value) })}
                        className="w-full rounded border border-gray-300 p-1.5 text-xs text-center"
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      disabled={items.length === 1}
                      className="text-gray-400 hover:text-red-600 disabled:opacity-20 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Total Calculation & Settlement */}
              <div className="grid grid-cols-2 gap-4 border border-gray-200 rounded-lg p-3 bg-slate-50">
                <div className="space-y-1">
                  <div className="flex justify-between text-gray-600">
                    <span>Taxable Subtotal:</span>
                    <span>{formatCurrency(calculatedTotals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>GST (Tax):</span>
                    <span>{formatCurrency(calculatedTotals.tax)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-sm text-gray-900 border-t border-gray-300 pt-1">
                    <span>Total Purchase Bill:</span>
                    <span>{formatCurrency(calculatedTotals.grand)}</span>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Amount Paid to Supplier Now (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-gray-300 p-2 font-bold"
                  />
                  <div className="mt-1 text-[11px] text-gray-500">
                    Remaining balance will be booked as accounts payable.
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Notes / Transporter Details</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Received in 4 boxes via VRL Logistics"
                  className="w-full rounded-lg border border-gray-300 p-2"
                />
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEntryModal(false)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {formLoading ? 'Recording Inward...' : 'Confirm Inward Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
