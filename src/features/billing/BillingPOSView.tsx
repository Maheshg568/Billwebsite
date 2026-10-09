import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { Product, Customer, Invoice, BusinessSettings, PaymentMethod } from '../../types/index.ts';
import { formatCurrency, INDIAN_STATES } from '../../utils/format.ts';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  UserPlus,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  Building,
  FileCheck,
  AlertCircle,
  X,
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  Percent,
} from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
  discountType: 'percent' | 'fixed';
  discountValue: number;
}

interface BillingPOSViewProps {
  settings: BusinessSettings;
  onInvoiceCreated: (invoice: Invoice) => void;
}

export const BillingPOSView: React.FC<BillingPOSViewProps> = ({
  settings,
  onInvoiceCreated,
}) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);

  // Mobile tab: 'catalog' | 'cart'
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');
  const [lastAddedItem, setLastAddedItem] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [notes, setNotes] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  // New Customer Form State
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustState, setNewCustState] = useState(settings.state || 'Maharashtra');
  const [newCustGstin, setNewCustGstin] = useState('');
  const [newCustType, setNewCustType] = useState<'retail' | 'wholesale'>('retail');

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      const [pList, cList] = await Promise.all([
        api.getProducts(),
        api.getCustomers(),
      ]);
      setProducts(pList);
      setCustomers(cList);
      if (cList.length > 0 && !selectedCustomerId) {
        const counterCust = cList.find((c) => c.phone === '+91 99999 00000') || cList[0];
        setSelectedCustomerId(counterCust.id);
      }
    } catch (e: any) {
      setError(e.message || 'Failed loading catalog');
    }
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const businessState = (settings.state || 'Maharashtra').trim().toLowerCase();
  const customerState = (selectedCustomer?.state || settings.state || 'Maharashtra').trim().toLowerCase();
  const isInterState = customerState !== businessState;

  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    if (p.status !== 'active') return false;
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q));
    return matchesCategory && matchesQuery;
  });

  const totalCartUnits = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Cart operations
  const addToCart = (product: Product) => {
    setError(null);
    if (!settings.allowNegativeStock && product.stockQuantity <= 0) {
      setError(`"${product.name}" is out of stock.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (!settings.allowNegativeStock && existing.quantity >= product.stockQuantity) {
          setError(`Only ${product.stockQuantity} in stock.`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, discountType: 'percent', discountValue: 0 }];
    });

    setLastAddedItem(product.name);
    setTimeout(() => {
      setLastAddedItem(null);
    }, 2500);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setError(null);
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (!settings.allowNegativeStock && newQty > item.product.stockQuantity) {
              setError(`Max available stock is ${item.product.stockQuantity}`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const updateDiscount = (productId: string, type: 'percent' | 'fixed', val: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, discountType: type, discountValue: Math.max(0, val) }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setError(null);
    setAmountReceived('');
  };

  // Bill Calculations
  const calculations = (() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    for (const item of cart) {
      let unitPrice = item.product.sellingPrice;
      if (selectedCustomer?.type === 'wholesale' && item.product.wholesalePrice) {
        unitPrice = item.product.wholesalePrice;
      }

      const gross = unitPrice * item.quantity;
      let discAmt = 0;
      if (item.discountType === 'percent') {
        discAmt = (gross * item.discountValue) / 100;
      } else {
        discAmt = Math.min(gross, item.discountValue);
      }

      const taxable = Math.max(0, gross - discAmt);
      const gstRate = item.product.taxRate || 0;

      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isInterState) {
        igst = (taxable * gstRate) / 100;
      } else {
        cgst = (taxable * (gstRate / 2)) / 100;
        sgst = (taxable * (gstRate / 2)) / 100;
      }

      subtotal += gross;
      totalDiscount += discAmt;
      totalTaxable += taxable;
      totalCgst += cgst;
      totalSgst += sgst;
      totalIgst += igst;
    }

    const rawGrandTotal = totalTaxable + totalCgst + totalSgst + totalIgst;
    const roundedGrandTotal = Math.round(rawGrandTotal);
    const roundOff = Number((roundedGrandTotal - rawGrandTotal).toFixed(2));

    const receivedNum = Number(amountReceived) || 0;
    let balanceDue = 0;
    let changeDue = 0;

    if (paymentMethod === 'credit') {
      balanceDue = roundedGrandTotal;
    } else {
      if (receivedNum >= roundedGrandTotal) {
        changeDue = Number((receivedNum - roundedGrandTotal).toFixed(2));
      } else {
        balanceDue = Number((roundedGrandTotal - receivedNum).toFixed(2));
      }
    }

    return {
      subtotal,
      totalDiscount,
      totalTaxable,
      totalCgst,
      totalSgst,
      totalIgst,
      roundOff,
      grandTotal: roundedGrandTotal,
      balanceDue,
      changeDue,
    };
  })();

  const handleFinalize = async (isDraft = false) => {
    if (cart.length === 0) {
      setError('Cart is empty. Add at least one item.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const payload = {
        customerId: selectedCustomerId,
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          discountType: i.discountType,
          discountValue: i.discountValue,
        })),
        paymentMethod,
        amountReceived:
          paymentMethod === 'credit'
            ? 0
            : Number(amountReceived) || calculations.grandTotal,
        notes: notes.trim(),
        isDraft,
      };

      const invoice = await api.finalizeInvoice(payload);
      clearCart();
      loadCatalog();
      onInvoiceCreated(invoice);
    } catch (err: any) {
      setError(err.message || 'Failed to save bill.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone) return;

    try {
      const created = await api.createCustomer({
        name: newCustName,
        phone: newCustPhone,
        state: newCustState,
        gstin: newCustGstin,
        type: newCustType,
      });
      setCustomers((prev) => [...prev, created]);
      setSelectedCustomerId(created.id);
      setShowAddCustomerModal(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustGstin('');
    } catch (e: any) {
      setError(e.message || 'Failed to add customer');
    }
  };

  return (
    <div className="w-full max-w-full space-y-3 pb-24 lg:pb-6">
      {/* MOBILE SEGMENTED SWITCHER (VISIBLE ON PHONES & TABLETS < LG) */}
      <div className="lg:hidden flex items-center rounded-xl bg-gray-200/80 p-1">
        <button
          onClick={() => setMobileTab('catalog')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
            mobileTab === 'catalog'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Products ({filteredProducts.length})</span>
        </button>

        <button
          onClick={() => setMobileTab('cart')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition relative ${
            mobileTab === 'cart'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Current Bill ({totalCartUnits})</span>
          {cart.length > 0 && (
            <span className="ml-1 rounded-full bg-blue-600 px-1.5 py-0.2 text-[10px] font-extrabold text-white">
              {formatCurrency(calculations.grandTotal)}
            </span>
          )}
        </button>
      </div>

      {/* QUICK TOAST WHEN ITEM ADDED (MOBILE & DESKTOP) */}
      {lastAddedItem && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="truncate">Added to bill: <strong>{lastAddedItem}</strong></span>
          </div>
          <button
            onClick={() => setMobileTab('cart')}
            className="text-xs font-bold text-blue-600 hover:underline shrink-0 ml-2"
          >
            View Bill →
          </button>
        </div>
      )}

      {/* ERROR ALERT */}
      {error && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* MAIN CONTAINER: SIDE-BY-SIDE ON DESKTOP, TABBED ON MOBILE */}
      <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
        {/* LEFT COLUMN: PRODUCT SELECTION */}
        <div
          className={`w-full lg:flex-1 bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden ${
            mobileTab === 'catalog' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Search & Categories Bar */}
          <div className="p-3 sm:p-4 border-b border-gray-200 space-y-3 bg-[#F8FAFC]">
            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name, SKU, or barcode..."
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9.5 pr-4 text-xs text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="p-3 sm:p-4 max-h-[640px] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
              {filteredProducts.map((p) => {
                const inCart = cart.find((i) => i.product.id === p.id);
                const isOutOfStock = p.stockQuantity <= 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => !isOutOfStock && addToCart(p)}
                    className={`flex flex-col justify-between rounded-xl border p-3 transition cursor-pointer select-none ${
                      isOutOfStock
                        ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                        : inCart
                        ? 'border-blue-500 bg-blue-50/50 shadow-xs ring-1 ring-blue-400'
                        : 'border-gray-200 bg-white hover:border-blue-400 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-[10px] font-mono text-gray-400 uppercase truncate">
                          {p.sku}
                        </span>
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                            isOutOfStock
                              ? 'bg-gray-200 text-gray-700'
                              : p.stockQuantity <= p.minStockThreshold
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          Stock: {p.stockQuantity}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-gray-900 mt-1 line-clamp-2 leading-snug">
                        {p.name}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-extrabold text-gray-900">
                          {formatCurrency(p.sellingPrice)}
                        </div>
                        <div className="text-[10px] text-gray-400 font-medium">
                          GST: {p.taxRate}%
                        </div>
                      </div>

                      {inCart ? (
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-md bg-blue-600 px-2 py-1 text-[11px] font-extrabold text-white shadow-2xs">
                            {inCart.quantity} in bill
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-gray-700 hover:bg-blue-600 hover:text-white transition"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className="col-span-full py-12 text-center text-xs text-gray-500">
                  No active products match your search.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CURRENT BILL & CHECKOUT (ALWAYS VISIBLE ON DESKTOP, TABBED ON MOBILE) */}
        <div
          className={`w-full lg:w-[440px] xl:w-[460px] shrink-0 bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden ${
            mobileTab === 'cart' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Bill Top Header */}
          <div className="p-3.5 border-b border-gray-200 bg-[#F8FAFC]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {/* On mobile, back to products button */}
                <button
                  onClick={() => setMobileTab('catalog')}
                  className="lg:hidden flex items-center gap-1 text-xs font-bold text-blue-600 pr-1 hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Products</span>
                </button>
                <span className="text-xs font-bold text-gray-900">Current Bill</span>
              </div>

              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs font-semibold text-red-600 hover:underline"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Customer Dropdown */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-800 font-medium focus:border-blue-500 focus:outline-hidden"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type}) - {c.phone}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setShowAddCustomerModal(true)}
                className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                title="Add New Customer"
              >
                <UserPlus className="h-3.5 w-3.5 text-blue-600" />
                <span>New</span>
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
              <span>Customer State: <strong className="text-gray-800">{selectedCustomer?.state || settings.state}</strong></span>
              <span className="font-semibold text-blue-700">
                {isInterState ? 'IGST' : 'CGST + SGST'}
              </span>
            </div>
          </div>

          {/* Items Header */}
          <div className="px-3.5 py-2 bg-gray-100/80 border-b border-gray-200 flex justify-between items-center text-xs font-bold text-gray-700">
            <span>Bill Items ({totalCartUnits} units)</span>
            <span className="text-blue-600">{cart.length} item(s)</span>
          </div>

          {/* Cart Line Items List - GUARANTEED VISIBLE */}
          <div className="min-h-[220px] max-h-[360px] overflow-y-auto p-3 space-y-2 bg-slate-50/50 border-b border-gray-200">
            {cart.length > 0 ? (
              cart.map((item) => {
                let unitPrice = item.product.sellingPrice;
                if (selectedCustomer?.type === 'wholesale' && item.product.wholesalePrice) {
                  unitPrice = item.product.wholesalePrice;
                }
                const gross = unitPrice * item.quantity;
                const disc =
                  item.discountType === 'percent'
                    ? (gross * item.discountValue) / 100
                    : Math.min(gross, item.discountValue);
                const taxable = gross - disc;
                const gst = (taxable * item.product.taxRate) / 100;
                const total = taxable + gst;

                return (
                  <div
                    key={item.product.id}
                    className="rounded-lg border border-gray-200 p-2.5 bg-white shadow-2xs space-y-2"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 leading-snug line-clamp-1">
                          {item.product.name}
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                          {item.product.sku} • Rate: <strong className="text-gray-800">₹{unitPrice}</strong>
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-gray-400 hover:text-red-600 p-1 rounded"
                        title="Remove item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Stepper, Discount, and Total Row */}
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      {/* Quantity Stepper */}
                      <div className="flex items-center rounded-lg border border-gray-300 bg-gray-50 overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="px-2.5 py-1 text-gray-700 hover:bg-gray-200 active:bg-gray-300"
                          title="Decrease"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-3 text-xs font-extrabold text-gray-900 bg-white py-1">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="px-2.5 py-1 text-gray-700 hover:bg-gray-200 active:bg-gray-300"
                          title="Increase"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Optional Discount input */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-400">Disc:</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountValue || ''}
                          placeholder="0"
                          onChange={(e) =>
                            updateDiscount(
                              item.product.id,
                              item.discountType,
                              Number(e.target.value) || 0
                            )
                          }
                          className="w-10 rounded border border-gray-300 px-1 py-0.5 text-center text-xs font-medium bg-white"
                        />
                        <button
                          onClick={() =>
                            updateDiscount(
                              item.product.id,
                              item.discountType === 'percent' ? 'fixed' : 'percent',
                              item.discountValue
                            )
                          }
                          className="rounded border border-gray-200 bg-gray-100 px-1 py-0.5 text-[10px] font-bold text-gray-700"
                        >
                          {item.discountType === 'percent' ? '%' : '₹'}
                        </button>
                      </div>

                      {/* Line Item Total */}
                      <div className="text-right">
                        <span className="font-extrabold text-blue-600 text-xs">
                          {formatCurrency(total)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-center p-4">
                <Receipt className="h-8 w-8 text-gray-300 mb-2" />
                <p className="text-xs font-bold text-gray-700">No items added to bill</p>
                <p className="text-[11px] text-gray-400 mt-1 max-w-[220px]">
                  Select products from the catalog to start billing.
                </p>
                <button
                  onClick={() => setMobileTab('catalog')}
                  className="lg:hidden mt-3 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs"
                >
                  Browse Products
                </button>
              </div>
            )}
          </div>

          {/* Simple Calculation Summary */}
          <div className="bg-[#F8FAFC] p-3.5 space-y-3">
            <div className="space-y-1 text-xs text-gray-600 border-b border-gray-200 pb-2.5">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold text-gray-800">{formatCurrency(calculations.subtotal)}</span>
              </div>
              {calculations.totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discount:</span>
                  <span>-{formatCurrency(calculations.totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>GST Tax:</span>
                <span>{formatCurrency(calculations.totalCgst + calculations.totalSgst + calculations.totalIgst)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-gray-900 pt-1.5 border-t border-gray-200">
                <span>Grand Total:</span>
                <span className="text-blue-600 text-lg">{formatCurrency(calculations.grandTotal)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <span className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">
                Payment Method
              </span>
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                {(
                  [
                    { id: 'cash', label: 'Cash', icon: Banknote },
                    { id: 'upi', label: 'UPI', icon: Smartphone },
                    { id: 'card', label: 'Card', icon: CreditCard },
                    { id: 'credit', label: 'Credit', icon: FileCheck },
                  ] as const
                ).map((pm) => {
                  const Icon = pm.icon;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(pm.id);
                        if (pm.id === 'credit') {
                          setAmountReceived('0');
                        } else {
                          setAmountReceived(calculations.grandTotal.toString());
                        }
                      }}
                      className={`flex flex-col items-center justify-center gap-1 rounded-lg border py-2 px-1 text-xs font-semibold transition ${
                        paymentMethod === pm.id
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{pm.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount Received input */}
            {paymentMethod !== 'credit' && (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-semibold text-gray-500 block mb-0.5">
                    Amount Received (₹)
                  </label>
                  <input
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder={calculations.grandTotal.toString()}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-900 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                {calculations.changeDue > 0 && (
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block">Change Return</span>
                    <span className="text-sm font-bold text-emerald-600">
                      {formatCurrency(calculations.changeDue)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-1 flex gap-2">
              <button
                onClick={() => handleFinalize(true)}
                disabled={loading || cart.length === 0}
                className="flex-1 rounded-lg border border-gray-300 bg-white py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-40"
              >
                Save Draft
              </button>

              <button
                onClick={() => handleFinalize(false)}
                disabled={loading || cart.length === 0}
                className="flex-2 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition disabled:opacity-40"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{loading ? 'Processing...' : 'Finalize & Print Bill'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY BOTTOM BAR (WHEN ON CATALOG TAB WITH CART ITEMS) */}
      {cart.length > 0 && mobileTab === 'catalog' && (
        <div className="lg:hidden fixed bottom-3 left-3 right-3 z-40 bg-gray-900 text-white rounded-xl p-3 shadow-xl flex items-center justify-between border border-gray-800">
          <div>
            <div className="text-[11px] text-gray-400">
              {totalCartUnits} unit{totalCartUnits !== 1 ? 's' : ''} in bill
            </div>
            <div className="text-sm font-bold text-white">
              {formatCurrency(calculations.grandTotal)}
            </div>
          </div>
          <button
            onClick={() => setMobileTab('cart')}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition"
          >
            <span>View Bill</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* QUICK ADD CUSTOMER MODAL */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-3">
              <h3 className="text-sm font-bold text-gray-900">Add New Customer</h3>
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Customer / Firm Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Metro Electronics Retail"
                  className="w-full rounded-lg border border-gray-300 p-2"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="+91 98200 00000"
                  className="w-full rounded-lg border border-gray-300 p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Type</label>
                  <select
                    value={newCustType}
                    onChange={(e: any) => setNewCustType(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2"
                  >
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">State (GST)</label>
                  <select
                    value={newCustState}
                    onChange={(e) => setNewCustState(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  value={newCustGstin}
                  onChange={(e) => setNewCustGstin(e.target.value)}
                  placeholder="27ABCDE1234F1Z1"
                  className="w-full rounded-lg border border-gray-300 p-2 font-mono uppercase"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-1.5 font-bold text-white hover:bg-blue-700"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
