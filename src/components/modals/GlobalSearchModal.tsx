import React, { useState, useEffect } from 'react';
import { Search, X, Package, FileText, User as UserIcon, ArrowRight } from 'lucide-react';
import { Product, Customer, Invoice } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatCurrency, formatDate } from '../../utils/format.ts';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct?: (product: Product) => void;
  onSelectInvoice?: (invoice: Invoice) => void;
  onSelectCustomer?: (customer: Customer) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  onSelectInvoice,
  onSelectCustomer,
}) => {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([
        api.getProducts().catch(() => []),
        api.getCustomers().catch(() => []),
        api.getInvoices().catch(() => []),
      ]).then(([p, c, i]) => {
        setProducts(p);
        setCustomers(c);
        setInvoices(i);
        setLoading(false);
      });
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const filteredProducts = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
      )
    : [];

  const filteredCustomers = q
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.gstin && c.gstin.toLowerCase().includes(q))
      )
    : [];

  const filteredInvoices = q
    ? invoices.filter(
        (i) =>
          i.invoiceNumber.toLowerCase().includes(q) ||
          i.customerName.toLowerCase().includes(q)
      )
    : [];

  const totalResults = filteredProducts.length + filteredCustomers.length + filteredInvoices.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-20 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by product name, SKU, customer phone, invoice number..."
            className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-hidden"
            autoFocus
          />
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Results Area */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          {loading && (
            <div className="py-8 text-center text-xs text-gray-500">Loading catalog records...</div>
          )}

          {!loading && !q && (
            <div className="py-8 text-center text-xs text-gray-400">
              Type at least 1 character to search products, customers, and invoices.
            </div>
          )}

          {!loading && q && totalResults === 0 && (
            <div className="py-8 text-center text-xs text-gray-500">
              No matching records found for "{query}".
            </div>
          )}

          {/* Products */}
          {filteredProducts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                <Package className="h-3.5 w-3.5" />
                <span>Products ({filteredProducts.length})</span>
              </div>
              <div className="space-y-1">
                {filteredProducts.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectProduct?.(p);
                      onClose();
                    }}
                    className="flex cursor-pointer items-center justify-between rounded-lg p-2.5 text-xs hover:bg-blue-50 transition"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      <p className="text-[11px] text-gray-500">
                        SKU: <span className="font-mono">{p.sku}</span> | Stock: {p.stockQuantity} {p.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-gray-900">{formatCurrency(p.sellingPrice)}</span>
                      <span className="ml-2 text-[10px] text-blue-600 font-semibold">Select →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customers */}
          {filteredCustomers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                <UserIcon className="h-3.5 w-3.5" />
                <span>Customers ({filteredCustomers.length})</span>
              </div>
              <div className="space-y-1">
                {filteredCustomers.slice(0, 5).map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectCustomer?.(c);
                      onClose();
                    }}
                    className="flex cursor-pointer items-center justify-between rounded-lg p-2.5 text-xs hover:bg-slate-50 transition"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{c.name}</p>
                      <p className="text-[11px] text-gray-500">
                        {c.phone} | {c.city}, {c.state}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-gray-500">
                        Due: <span className="font-semibold text-red-600">{formatCurrency(c.outstandingBalance)}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoices */}
          {filteredInvoices.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                <FileText className="h-3.5 w-3.5" />
                <span>Invoices ({filteredInvoices.length})</span>
              </div>
              <div className="space-y-1">
                {filteredInvoices.slice(0, 5).map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => {
                      onSelectInvoice?.(inv);
                      onClose();
                    }}
                    className="flex cursor-pointer items-center justify-between rounded-lg p-2.5 text-xs hover:bg-slate-50 transition"
                  >
                    <div>
                      <p className="font-mono font-bold text-gray-900">{inv.invoiceNumber}</p>
                      <p className="text-[11px] text-gray-500">
                        {inv.customerName} • {formatDate(inv.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(inv.grandTotal)}</p>
                      <span className="text-[10px] uppercase font-semibold text-emerald-700">{inv.paymentStatus}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 text-[11px] text-gray-500 flex justify-between">
          <span>Press ESC to close</span>
          <span>ApexDistribute Global Search</span>
        </div>
      </div>
    </div>
  );
};
