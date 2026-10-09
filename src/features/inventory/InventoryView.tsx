import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { InventoryMovement, Product, MovementType } from '../../types/index.ts';
import { formatNumber, formatDateTime } from '../../utils/format.ts';
import {
  Boxes,
  SlidersHorizontal,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
} from 'lucide-react';

export const InventoryView: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter
  const [movementTypeFilter, setMovementTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<MovementType>('MANUAL_ADJUSTMENT');
  const [adjustLoading, setAdjustLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mList, pList] = await Promise.all([
        api.getInventoryMovements(),
        api.getProducts(),
      ]);
      setMovements(mList);
      setProducts(pList);
      if (pList.length > 0 && !selectedProductId) {
        setSelectedProductId(pList[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed loading inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !adjustmentQty || !adjustmentReason.trim()) return;

    setAdjustLoading(true);
    setError(null);
    try {
      const res = await api.adjustStock({
        productId: selectedProductId,
        quantityChange: Number(adjustmentQty),
        reason: adjustmentReason.trim(),
        type: adjustmentType,
      });

      if (res.approvalRequired) {
        setSuccessMsg(`Adjustment request #${res.approvalRequired} submitted for supervisor approval.`);
      } else {
        setSuccessMsg('Stock quantity updated successfully.');
      }
      setShowAdjustModal(false);
      setAdjustmentQty('');
      setAdjustmentReason('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust stock');
    } finally {
      setAdjustLoading(false);
    }
  };

  const getMovementBadge = (type: MovementType) => {
    switch (type) {
      case 'SALE_DEDUCTION':
        return { label: 'Sale Deduction', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'PURCHASE_RECEIPT':
        return { label: 'Inward Purchase', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'CUSTOMER_RETURN':
        return { label: 'Customer Return', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'DAMAGE_WRITEOFF':
        return { label: 'Damage Write-off', color: 'bg-red-50 text-red-700 border-red-200' };
      case 'MANUAL_ADJUSTMENT':
      default:
        return { label: 'Manual Adjustment', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    }
  };

  const filteredMovements = movements.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      m.productName.toLowerCase().includes(q) ||
      m.sku.toLowerCase().includes(q) ||
      m.referenceDoc.toLowerCase().includes(q);
    const matchesType = movementTypeFilter === 'ALL' || m.movementType === movementTypeFilter;
    return matchesQuery && matchesType;
  });

  const lowStockCount = products.filter((p) => p.stockQuantity <= p.minStockThreshold && p.stockQuantity > 0).length;
  const outOfStockCount = products.filter((p) => p.stockQuantity <= 0).length;
  const totalStockUnits = products.reduce((acc, curr) => acc + curr.stockQuantity, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1F2937] flex items-center gap-2">
            <Boxes className="h-5 w-5 text-[#2563EB]" />
            <span>Inventory & Stock Movements</span>
          </h1>
          <p className="text-xs text-[#6B7280]">
            Traceable stock ledger, movement reasons, reorder warnings, and manual quantity adjustments.
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

          <button
            onClick={() => setShowAdjustModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Manual Stock Adjustment</span>
          </button>
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

      {/* Stock Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs">
          <div className="text-xs text-gray-500 font-medium">Total Physical Units in Warehouse</div>
          <div className="text-xl font-extrabold text-gray-900 mt-1">
            {formatNumber(totalStockUnits)} <span className="text-xs font-normal text-gray-400">items</span>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-2xs">
          <div className="text-xs text-amber-800 font-semibold flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>Low Stock Reorder Alerts</span>
          </div>
          <div className="text-xl font-extrabold text-amber-900 mt-1">
            {lowStockCount} <span className="text-xs font-normal text-amber-700">products below min threshold</span>
          </div>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 shadow-2xs">
          <div className="text-xs text-red-800 font-semibold flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span>Out of Stock Items</span>
          </div>
          <div className="text-xl font-extrabold text-red-900 mt-1">
            {outOfStockCount} <span className="text-xs font-normal text-red-700">items depleted</span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name, SKU, or reference doc..."
            className="w-full rounded-lg border border-gray-300 bg-white py-1.5 px-3 text-xs text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        <select
          value={movementTypeFilter}
          onChange={(e) => setMovementTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 font-medium"
        >
          <option value="ALL">All Movement Types</option>
          <option value="SALE_DEDUCTION">Sale Deductions (-)</option>
          <option value="PURCHASE_RECEIPT">Purchase Receipts (+)</option>
          <option value="CUSTOMER_RETURN">Customer Returns (+)</option>
          <option value="MANUAL_ADJUSTMENT">Manual Adjustments</option>
          <option value="DAMAGE_WRITEOFF">Damage Write-offs (-)</option>
        </select>
      </div>

      {/* Stock Ledger Movements Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#6B7280] font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-4">Movement Type</th>
                <th className="py-3 px-4 text-center">Change Qty</th>
                <th className="py-3 px-4 text-center">Balance Stock</th>
                <th className="py-3 px-4">Reference Document</th>
                <th className="py-3 px-4">Reason / Notes</th>
                <th className="py-3 px-4">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMovements.map((m) => {
                const badge = getMovementBadge(m.movementType);
                const isPositive = m.quantityChange > 0;

                return (
                  <tr key={m.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                      {formatDateTime(m.timestamp)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">{m.productName}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{m.sku}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      <span className={isPositive ? 'text-emerald-600' : 'text-red-600'}>
                        {isPositive ? `+${m.quantityChange}` : m.quantityChange}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-medium text-gray-700">
                      {m.previousStock} → <strong className="text-gray-900">{m.newStock}</strong>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-gray-800">
                      {m.referenceDoc}
                    </td>
                    <td className="py-3 px-4 text-gray-600 max-w-xs truncate" title={m.reason}>
                      {m.reason || '—'}
                    </td>
                    <td className="py-3 px-4 text-gray-700 font-medium">
                      {m.recordedByName}
                    </td>
                  </tr>
                );
              })}

              {filteredMovements.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-gray-500">
                    No stock movements found matching filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MANUAL STOCK ADJUSTMENT MODAL */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <h3 className="text-sm font-bold text-gray-900">Manual Stock Adjustment</h3>
              <button onClick={() => setShowAdjustModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {!isAdmin && !hasPermission('adjust_stock') && (
              <div className="mb-3 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 border border-amber-200">
                <strong>Supervisor Approval Policy:</strong> As an employee without direct stock adjust permission, submitting this will generate an approval request for Administrator review.
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Select Product *</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2 font-medium"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} - {p.name} (Current: {p.stockQuantity} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Adjustment Type</label>
                  <select
                    value={adjustmentType}
                    onChange={(e: any) => setAdjustmentType(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2"
                  >
                    <option value="MANUAL_ADJUSTMENT">Manual Adjustment</option>
                    <option value="DAMAGE_WRITEOFF">Damage Write-off</option>
                    <option value="SUPPLIER_RETURN">Supplier Return</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Quantity Delta (+ or -) *
                  </label>
                  <input
                    type="number"
                    required
                    value={adjustmentQty}
                    onChange={(e) => setAdjustmentQty(e.target.value)}
                    placeholder="e.g. +5 or -2"
                    className="w-full rounded-lg border border-gray-300 p-2 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Reason for Adjustment *
                </label>
                <textarea
                  required
                  rows={2}
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="e.g. Physical inventory audit recount discrepancy, or damaged carton..."
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustLoading}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {adjustLoading ? 'Submitting...' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
