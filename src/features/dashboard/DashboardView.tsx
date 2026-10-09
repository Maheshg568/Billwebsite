import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { DashboardMetrics, Invoice } from '../../types/index.ts';
import { formatCurrency, formatDateTime } from '../../utils/format.ts';
import {
  TrendingUp,
  Receipt,
  CreditCard,
  AlertTriangle,
  Plus,
  RefreshCw,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { NavTabId } from '../../components/layout/Sidebar.tsx';

interface DashboardViewProps {
  onNavigate: (tab: NavTabId) => void;
  onSelectInvoice: (invoice: Invoice) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onSelectInvoice,
}) => {
  const { user, isAdmin, hasPermission } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboard();
      setMetrics(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const canViewReports = isAdmin || hasPermission('view_sales_reports');
  const canCreateBills = isAdmin || hasPermission('create_bills');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-500">
            {isAdmin ? 'Store overview and daily sales.' : `Signed in as ${user?.name}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-gray-400' : 'text-gray-500'}`} />
            <span>Refresh</span>
          </button>

          {canCreateBills && (
            <button
              onClick={() => onNavigate('billing')}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>Create Bill</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Simple Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div
          onClick={() => canViewReports && onNavigate('reports')}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs hover:border-blue-400 cursor-pointer"
        >
          <div className="flex items-center justify-between text-gray-500 mb-1 text-xs">
            <span>Today's Sales</span>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-gray-900">
            {canViewReports ? formatCurrency(metrics?.todaySales || 0) : '—'}
          </div>
        </div>

        {/* Bills Created */}
        <div
          onClick={() => onNavigate('invoices')}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs hover:border-blue-400 cursor-pointer"
        >
          <div className="flex items-center justify-between text-gray-500 mb-1 text-xs">
            <span>Today's Bills</span>
            <Receipt className="h-4 w-4 text-gray-600" />
          </div>
          <div className="text-xl font-bold text-gray-900">
            {metrics?.todayBillsCount || 0}
          </div>
        </div>

        {/* Customer Dues */}
        <div
          onClick={() => onNavigate('customers')}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs hover:border-blue-400 cursor-pointer"
        >
          <div className="flex items-center justify-between text-gray-500 mb-1 text-xs">
            <span>Customer Dues</span>
            <CreditCard className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-800">
            {formatCurrency(metrics?.totalReceivables || 0)}
          </div>
        </div>

        {/* Low Stock Items */}
        <div
          onClick={() => onNavigate('inventory')}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs hover:border-red-400 cursor-pointer"
        >
          <div className="flex items-center justify-between text-gray-500 mb-1 text-xs">
            <span>Low Stock</span>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <div className={`text-xl font-bold ${(metrics?.lowStockCount || 0) > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {metrics?.lowStockCount || 0}
          </div>
        </div>
      </div>

      {/* Recent Bills Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5 bg-gray-50/50">
          <h2 className="text-sm font-bold text-gray-900">Recent Bills</h2>
          <button
            onClick={() => onNavigate('invoices')}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
          >
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-4">Invoice #</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {metrics?.recentInvoices && metrics.recentInvoices.length > 0 ? (
                metrics.recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="py-2.5 px-4 font-mono font-bold text-gray-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-gray-800">
                      {inv.customerName}
                    </td>
                    <td className="py-2.5 px-4 text-gray-500">
                      {formatDateTime(inv.date)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-gray-900">
                      {formatCurrency(inv.grandTotal)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          inv.status === 'finalized'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : inv.status === 'cancelled'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => onSelectInvoice(inv)}
                        className="rounded p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                        title="View Bill"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No bills created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
