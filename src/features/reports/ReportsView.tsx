import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { formatCurrency } from '../../utils/format.ts';
import {
  BarChart3,
  Download,
  RefreshCw,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { isAdmin, hasPermission } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const canExport = isAdmin || hasPermission('export_reports');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const reportData = await api.getSalesReport();
      setData(reportData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!data?.topProducts) return;
    const headers = ['Product', 'SKU', 'Units Sold', 'Total Sales (INR)'];
    const rows = data.topProducts.map((p: any) => [
      `"${p.name}"`,
      `"${p.sku}"`,
      p.unitsSold,
      p.totalSales.toFixed(2),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e: any[]) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sales_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <span>Sales Summary</span>
          </h1>
          <p className="text-xs text-gray-500">
            Total sales and bills overview.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadReports}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {canExport && (
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              <span>Download CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* 3 Simple Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs">
          <div className="text-xs text-gray-500 font-medium">Total Sales Revenue</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(data?.summary?.totalRevenue || 0)}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs">
          <div className="text-xs text-gray-500 font-medium">Total Invoices Created</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {data?.summary?.totalInvoices || 0}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs">
          <div className="text-xs text-gray-500 font-medium">Total Taxes (GST)</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">
            {formatCurrency(data?.summary?.totalTax || 0)}
          </div>
        </div>
      </div>

      {/* 2 Simple Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
          <div className="border-b border-gray-200 px-5 py-3 bg-gray-50/50">
            <h2 className="text-sm font-bold text-gray-900">Top Selling Products</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-4">Product Name</th>
                  <th className="py-2.5 px-4 text-center">Units Sold</th>
                  <th className="py-2.5 px-4 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data?.topProducts && data.topProducts.length > 0 ? (
                  data.topProducts.map((p: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-gray-900">{p.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{p.sku}</div>
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-gray-800">
                        {p.unitsSold}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-gray-900">
                        {formatCurrency(p.totalSales)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-500">
                      No sales records yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Staff Sales */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
          <div className="border-b border-gray-200 px-5 py-3 bg-gray-50/50">
            <h2 className="text-sm font-bold text-gray-900">Staff Sales</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-4">Staff Name</th>
                  <th className="py-2.5 px-4 text-center">Bills Count</th>
                  <th className="py-2.5 px-4 text-right">Total Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data?.employeePerformance && data.employeePerformance.length > 0 ? (
                  data.employeePerformance.map((emp: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-2.5 px-4 font-bold text-gray-900">
                        {emp.name}
                      </td>
                      <td className="py-2.5 px-4 text-center font-semibold text-gray-800">
                        {emp.billsCount}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-blue-600">
                        {formatCurrency(emp.totalRevenue)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-500">
                      No staff sales recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
