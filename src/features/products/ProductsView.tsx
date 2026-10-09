import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { Product } from '../../types/index.ts';
import { formatCurrency, formatNumber } from '../../utils/format.ts';
import {
  Package,
  Plus,
  Search,
  Edit2,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  X,
  RefreshCw,
  EyeOff,
  Filter,
} from 'lucide-react';

export const ProductsView: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: '',
    brand: '',
    barcode: '',
    description: '',
    unit: 'Pcs',
    stockQuantity: 0,
    minStockThreshold: 5,
    purchaseCost: 0,
    sellingPrice: 0,
    wholesalePrice: 0,
    taxRate: 18,
    status: 'active' as 'active' | 'inactive',
  });

  const canAdd = isAdmin || hasPermission('add_products');
  const canEdit = isAdmin || hasPermission('edit_products');
  const canViewCost = isAdmin || hasPermission('view_purchase_costs');
  const canChangePrice = isAdmin || hasPermission('change_selling_prices');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormData({
      sku: '',
      name: '',
      category: 'IT & Accessories',
      brand: '',
      barcode: '',
      description: '',
      unit: 'Pcs',
      stockQuantity: 10,
      minStockThreshold: 5,
      purchaseCost: 0,
      sellingPrice: 0,
      wholesalePrice: 0,
      taxRate: 18,
      status: 'active',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      sku: p.sku,
      name: p.name,
      category: p.category,
      brand: p.brand,
      barcode: p.barcode || '',
      description: p.description || '',
      unit: p.unit,
      stockQuantity: p.stockQuantity,
      minStockThreshold: p.minStockThreshold,
      purchaseCost: p.purchaseCost || 0,
      sellingPrice: p.sellingPrice,
      wholesalePrice: p.wholesalePrice || 0,
      taxRate: p.taxRate,
      status: p.status,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);

    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, {
          name: formData.name,
          category: formData.category,
          brand: formData.brand,
          barcode: formData.barcode,
          description: formData.description,
          unit: formData.unit,
          minStockThreshold: formData.minStockThreshold,
          purchaseCost: canViewCost ? formData.purchaseCost : undefined,
          sellingPrice: canChangePrice ? formData.sellingPrice : undefined,
          wholesalePrice: formData.wholesalePrice || undefined,
          taxRate: formData.taxRate,
          status: formData.status,
        });
        setSuccessMsg(`Updated product ${formData.name}`);
        setEditingProduct(null);
      } else {
        await api.createProduct({
          ...formData,
          sku: formData.sku.toUpperCase(),
        });
        setSuccessMsg(`Product ${formData.name} created successfully.`);
        setShowAddModal(false);
      }
      loadProducts();
    } catch (err: any) {
      setError(err.message || 'Failed saving product.');
    } finally {
      setFormLoading(false);
    }
  };

  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q));

    const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;

    let matchesStock = true;
    if (stockFilter === 'LOW') {
      matchesStock = p.stockQuantity <= p.minStockThreshold && p.stockQuantity > 0;
    } else if (stockFilter === 'OUT') {
      matchesStock = p.stockQuantity <= 0;
    } else if (stockFilter === 'IN') {
      matchesStock = p.stockQuantity > p.minStockThreshold;
    }

    return matchesQuery && matchesCategory && matchesStock;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1F2937] flex items-center gap-2">
            <Package className="h-5 w-5 text-[#2563EB]" />
            <span>Product Catalog</span>
          </h1>
          <p className="text-xs text-[#6B7280]">
            Central distributor product master, pricing, stock levels, and GST tax classifications.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadProducts}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {canAdd && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Product</span>
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

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name, SKU, brand, or barcode..."
            className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-3 text-xs text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 font-medium"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 font-medium"
          >
            <option value="ALL">All Stock Levels</option>
            <option value="IN">In Stock</option>
            <option value="LOW">Low Stock</option>
            <option value="OUT">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#6B7280] font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">SKU Code</th>
                <th className="py-3 px-4">Product Name & Category</th>
                <th className="py-3 px-4">Brand</th>
                <th className="py-3 px-4 text-center">Stock</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                {canViewCost && <th className="py-3 px-4 text-right">Purchase Cost</th>}
                <th className="py-3 px-4 text-center">GST Rate</th>
                <th className="py-3 px-4 text-center">Status</th>
                {canEdit && <th className="py-3 px-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.map((p) => {
                const isLow = p.stockQuantity <= p.minStockThreshold && p.stockQuantity > 0;
                const isOut = p.stockQuantity <= 0;

                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900">
                      {p.sku}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">{p.name}</div>
                      <div className="text-[11px] text-gray-500">{p.category}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {p.brand}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isOut
                            ? 'bg-red-100 text-red-800'
                            : isLow
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {formatNumber(p.stockQuantity)} {p.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-gray-900">
                      {formatCurrency(p.sellingPrice)}
                    </td>
                    {canViewCost && (
                      <td className="py-3 px-4 text-right text-gray-600 font-medium">
                        {p.purchaseCost !== undefined ? formatCurrency(p.purchaseCost) : '—'}
                      </td>
                    )}
                    <td className="py-3 px-4 text-center text-gray-700 font-semibold">
                      {p.taxRate}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          p.status === 'active'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition"
                          title="Edit Product"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={canViewCost ? 9 : 8} className="py-12 text-center text-xs text-gray-500">
                    No products found matching the criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      {(showAddModal || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <h3 className="text-base font-bold text-gray-900">
                {editingProduct ? `Edit Product: ${editingProduct.sku}` : 'Add New Product to Catalog'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingProduct(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">SKU / Item Code *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingProduct}
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="e.g. SND-SSD-1TB"
                    className="w-full rounded-lg border border-gray-300 p-2 font-mono uppercase disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. SanDisk Extreme 1TB NVMe SSD"
                    className="w-full rounded-lg border border-gray-300 p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. IT & Storage"
                    className="w-full rounded-lg border border-gray-300 p-2"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Brand</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g. SanDisk"
                    className="w-full rounded-lg border border-gray-300 p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    disabled={!canChangePrice}
                    value={formData.sellingPrice || ''}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                    placeholder="9499.00"
                    className="w-full rounded-lg border border-gray-300 p-2 font-bold disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Wholesale Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!canChangePrice}
                    value={formData.wholesalePrice || ''}
                    onChange={(e) => setFormData({ ...formData, wholesalePrice: Number(e.target.value) })}
                    placeholder="8850.00"
                    className="w-full rounded-lg border border-gray-300 p-2 disabled:bg-gray-100"
                  />
                </div>

                {canViewCost && (
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Purchase Cost (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.purchaseCost || ''}
                      onChange={(e) => setFormData({ ...formData, purchaseCost: Number(e.target.value) })}
                      placeholder="7200.00"
                      className="w-full rounded-lg border border-gray-300 p-2"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">GST Tax Rate (%)</label>
                  <select
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 p-2 font-semibold"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2 font-medium"
                  >
                    <option value="Pcs">Pcs</option>
                    <option value="Box">Box</option>
                    <option value="Kg">Kg</option>
                    <option value="Mtr">Mtr</option>
                    <option value="Pkts">Pkts</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Min Alert Stock</label>
                  <input
                    type="number"
                    value={formData.minStockThreshold}
                    onChange={(e) => setFormData({ ...formData, minStockThreshold: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 p-2"
                  />
                </div>
              </div>

              {!editingProduct && (
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Opening Stock Quantity</label>
                  <input
                    type="number"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 p-2"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-gray-700 block mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e: any) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingProduct(null);
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {formLoading ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
