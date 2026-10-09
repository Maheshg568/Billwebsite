import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { BusinessSettings } from '../../types/index.ts';
import { INDIAN_STATES } from '../../utils/format.ts';
import {
  Settings,
  Building,
  FileText,
  CreditCard,
  Shield,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
} from 'lucide-react';

interface SettingsViewProps {
  settings: BusinessSettings;
  onSettingsUpdated: (settings: BusinessSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings: initialSettings,
  onSettingsUpdated,
}) => {
  const { isAdmin } = useAuth();
  const [formData, setFormData] = useState<BusinessSettings>(initialSettings);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFormData(initialSettings);
  }, [initialSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const updated = await api.updateSettings(formData);
      setSuccessMsg('Business settings and invoice configurations updated successfully.');
      onSettingsUpdated(updated);
    } catch (err: any) {
      setError(err.message || 'Failed saving settings');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const backupData = await api.getBackup();
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `apex_distribute_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed downloading backup');
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm('Reset database to clean initial demonstration dataset? All custom test records will be refreshed.')) {
      return;
    }
    setLoading(true);
    try {
      await api.resetDemoData();
      const freshSettings = await api.getSettings();
      setFormData(freshSettings);
      onSettingsUpdated(freshSettings);
      setSuccessMsg('Database refreshed to pristine demo state with initial inventory and catalog.');
    } catch (err: any) {
      setError(err.message || 'Failed resetting demo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1F2937] flex items-center gap-2">
            <Settings className="h-5 w-5 text-[#2563EB]" />
            <span>Business Profile & ERP Configuration</span>
          </h1>
          <p className="text-xs text-[#6B7280]">
            Manage enterprise company details, GSTIN rules, invoice sequences, print layouts, and security policies.
          </p>
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

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Section 1: Business Identity */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
            <Building className="h-4 w-4 text-blue-600" />
            <h3 className="font-bold text-gray-900 text-sm">Enterprise Identity & Contact Info</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Company / Firm Name *</label>
              <input
                type="text"
                required
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full rounded-lg border border-gray-300 p-2 font-medium"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Tagline</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full rounded-lg border border-gray-300 p-2"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-gray-700 block mb-1">Office / Warehouse Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full rounded-lg border border-gray-300 p-2"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full rounded-lg border border-gray-300 p-2"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Registered State (Used for Intra-State GST)</label>
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

            <div>
              <label className="font-bold text-gray-700 block mb-1">PIN Code</label>
              <input
                type="text"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                className="w-full rounded-lg border border-gray-300 p-2 font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Contact Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-lg border border-gray-300 p-2"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Official GSTIN *</label>
              <input
                type="text"
                required
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                className="w-full rounded-lg border border-gray-300 p-2 font-mono uppercase font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Permanent Account Number (PAN)</label>
              <input
                type="text"
                value={formData.pan}
                onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                className="w-full rounded-lg border border-gray-300 p-2 font-mono uppercase"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Invoice Numbering & Layout */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <h3 className="font-bold text-gray-900 text-sm">Invoice Sequence & Print Formatting</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Invoice Prefix</label>
              <input
                type="text"
                value={formData.invoicePrefix}
                onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                placeholder="e.g. APX-26-"
                className="w-full rounded-lg border border-gray-300 p-2 font-mono uppercase font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Next Sequence Number</label>
              <input
                type="number"
                value={formData.invoiceNextNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNextNumber: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 p-2 font-mono font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Default Print Layout</label>
              <select
                value={formData.defaultPrintLayout}
                onChange={(e: any) => setFormData({ ...formData, defaultPrintLayout: e.target.value })}
                className="w-full rounded-lg border border-gray-300 p-2 font-medium"
              >
                <option value="a4">Standard A4 Tax Invoice</option>
                <option value="thermal_80mm">Thermal 80mm Counter Receipt</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="font-bold text-gray-700 block mb-1">Terms & Conditions (Printed on Invoice)</label>
              <textarea
                rows={3}
                value={formData.termsAndConditions}
                onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
                className="w-full rounded-lg border border-gray-300 p-2 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Bank Details for Invoice Settlement */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
            <CreditCard className="h-4 w-4 text-blue-600" />
            <h3 className="font-bold text-gray-900 text-sm">Settlement Bank Account & UPI ID</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Bank Name</label>
              <input
                type="text"
                value={formData.bankDetails.bankName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails, bankName: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-gray-300 p-2"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Account Number</label>
              <input
                type="text"
                value={formData.bankDetails.accountNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails, accountNumber: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-gray-300 p-2 font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">IFSC Code</label>
              <input
                type="text"
                value={formData.bankDetails.ifscCode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails, ifscCode: e.target.value.toUpperCase() },
                  })
                }
                className="w-full rounded-lg border border-gray-300 p-2 font-mono uppercase"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Company UPI ID</label>
              <input
                type="text"
                value={formData.bankDetails.upiId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails, upiId: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-gray-300 p-2 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Operational Policies */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <h3 className="font-bold text-gray-900 text-sm">Policy & Discount Approval Safeguards</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-gray-700 block mb-1">
                Discount Approval Threshold (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.discountApprovalThreshold}
                  onChange={(e) =>
                    setFormData({ ...formData, discountApprovalThreshold: Number(e.target.value) })
                  }
                  className="w-24 rounded-lg border border-gray-300 p-2 font-bold"
                />
                <span className="text-gray-500 text-xs">
                  Discounts above this % by employees trigger mandatory supervisor approval.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <input
                type="checkbox"
                id="negStock"
                checked={formData.allowNegativeStock}
                onChange={(e) => setFormData({ ...formData, allowNegativeStock: e.target.checked })}
                className="rounded text-blue-600 h-4 w-4"
              />
              <label htmlFor="negStock" className="font-bold text-gray-800 cursor-pointer">
                Allow Negative Inventory Billing (Overselling)
              </label>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-[#2563EB] px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? 'Saving Changes...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>

      {/* Database Maintenance Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs space-y-3">
        <h3 className="font-bold text-gray-900 text-sm">Data Persistence & Maintenance</h3>
        <p className="text-xs text-gray-500">
          Download full JSON backup snapshot of all invoices, inventory ledger, customers, and users.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-slate-50 transition"
          >
            <Download className="h-4 w-4 text-gray-500" />
            <span>Download Database Backup (JSON)</span>
          </button>

          <button
            type="button"
            onClick={handleResetDemo}
            className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50/50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
          >
            <RotateCcw className="h-4 w-4 text-red-600" />
            <span>Reset Database to Demo State</span>
          </button>
        </div>
      </div>
    </div>
  );
};
