import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { User, Permission, Role } from '../../types/index.ts';
import { formatDateTime } from '../../utils/format.ts';
import {
  UserCheck,
  UserPlus,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Lock,
} from 'lucide-react';

const PERMISSION_GROUPS: { group: string; permissions: { id: Permission; label: string; desc: string }[] }[] = [
  {
    group: 'Products & Pricing',
    permissions: [
      { id: 'view_products', label: 'View Products Catalog', desc: 'Can browse product catalog and search items' },
      { id: 'add_products', label: 'Add New Products', desc: 'Can register new products in catalog' },
      { id: 'edit_products', label: 'Edit Existing Products', desc: 'Can edit description, category, and thresholds' },
      { id: 'change_selling_prices', label: 'Modify Selling Prices', desc: 'Can alter base and wholesale selling prices' },
      { id: 'view_purchase_costs', label: 'View Purchase Costs & Margins', desc: 'Can see cost price and procurement rate' },
    ],
  },
  {
    group: 'Billing & POS Operations',
    permissions: [
      { id: 'create_bills', label: 'Create Bills (POS)', desc: 'Can ring up bills and generate customer sales' },
      { id: 'apply_discounts', label: 'Apply Discounts', desc: 'Can offer line item and invoice discounts' },
      { id: 'view_all_bills', label: 'View All Invoices', desc: 'Can see invoices created by other employees' },
      { id: 'view_own_bills', label: 'View Own Bills Only', desc: 'Restricted to invoices created by self' },
      { id: 'edit_draft_bills', label: 'Edit Draft Bills', desc: 'Can modify saved drafts before finalization' },
      { id: 'cancel_finalized_bills', label: 'Direct Cancel / Return', desc: 'Can cancel finalized bills without supervisor approval' },
      { id: 'initiate_refunds', label: 'Initiate Return Requests', desc: 'Can submit requests for bill returns' },
      { id: 'approve_refunds', label: 'Approve Returns & Refunds', desc: 'Supervisor authority to approve cancellations' },
    ],
  },
  {
    group: 'Inventory & Stock Control',
    permissions: [
      { id: 'view_stock', label: 'View Stock Quantities', desc: 'Can see warehouse inventory levels' },
      { id: 'adjust_stock', label: 'Direct Stock Adjustment', desc: 'Can manually adjust stock without approval' },
    ],
  },
  {
    group: 'Customer & Supplier Management',
    permissions: [
      { id: 'view_customers', label: 'View Customers', desc: 'Can browse customer contact and due details' },
      { id: 'manage_customers', label: 'Add & Edit Customers', desc: 'Can create and modify customer accounts' },
      { id: 'view_suppliers', label: 'View Suppliers', desc: 'Can see supplier contact directory' },
      { id: 'manage_suppliers', label: 'Add & Edit Suppliers', desc: 'Can register and edit supplier details' },
    ],
  },
  {
    group: 'Purchases & Inward Stock',
    permissions: [
      { id: 'create_purchases', label: 'Record Inward Purchases', desc: 'Can receive supplier goods into stock' },
      { id: 'view_purchases', label: 'View Purchase History', desc: 'Can see past supplier purchase orders' },
    ],
  },
  {
    group: 'Payments & Financial Collections',
    permissions: [
      { id: 'record_payments', label: 'Record Payment Collections', desc: 'Can collect cash, UPI, and bank dues' },
      { id: 'view_payments', label: 'View Payment Receipts', desc: 'Can see payment collection history' },
    ],
  },
  {
    group: 'Reports & Supervisor Authority',
    permissions: [
      { id: 'view_sales_reports', label: 'View Sales Analytics', desc: 'Can view daily turnover and volume graphs' },
      { id: 'view_profit', label: 'View Gross Profit & Margins', desc: 'Can view estimated business profitability' },
      { id: 'export_reports', label: 'Export Data & CSV', desc: 'Can download CSV exports of financial data' },
      { id: 'manage_approvals', label: 'Review & Decide Approvals', desc: 'Can approve or reject pending requests' },
    ],
  },
];

export const EmployeeManagementView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<User | null>(null);
  const [tempPermissions, setTempPermissions] = useState<Permission[]>([]);

  // Add Employee Form
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<Role>('employee');
  const [formPassword, setFormPassword] = useState('password123');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const data = await api.getEmployees();
      setEmployees(data);
    } catch (err: any) {
      setError(err.message || 'Failed loading employees');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormRole('employee');
    setFormPassword('staff123');
    setShowAddModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    try {
      const created = await api.createEmployee({
        name: formName,
        email: formEmail,
        phone: formPhone,
        role: formRole,
        password: formPassword,
        permissions:
          formRole === 'admin'
            ? []
            : [
                'view_products',
                'create_bills',
                'apply_discounts',
                'view_own_bills',
                'view_stock',
                'view_customers',
                'manage_customers',
                'record_payments',
                'view_payments',
              ],
      });
      setSuccessMsg(`Account created for ${created.name} (${created.employeeCode})`);
      setShowAddModal(false);
      loadEmployees();
    } catch (err: any) {
      setError(err.message || 'Failed creating employee');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (emp: User) => {
    if (emp.id === currentUser?.id) {
      setError('Cannot deactivate your own administrator session.');
      return;
    }
    const nextStatus = emp.status === 'active' ? 'inactive' : 'active';
    try {
      await api.updateEmployee(emp.id, { status: nextStatus });
      setSuccessMsg(`${emp.name} account ${nextStatus === 'active' ? 'activated' : 'deactivated'}.`);
      loadEmployees();
    } catch (err: any) {
      setError(err.message || 'Failed updating status');
    }
  };

  const handleOpenPermissions = (emp: User) => {
    setSelectedUserForPerms(emp);
    setTempPermissions([...emp.permissions]);
    setShowPermissionsModal(true);
  };

  const togglePermission = (perm: Permission) => {
    if (tempPermissions.includes(perm)) {
      setTempPermissions(tempPermissions.filter((p) => p !== perm));
    } else {
      setTempPermissions([...tempPermissions, perm]);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedUserForPerms) return;
    setFormLoading(true);
    try {
      await api.updateEmployee(selectedUserForPerms.id, {
        permissions: tempPermissions,
      });
      setSuccessMsg(`Permissions updated for ${selectedUserForPerms.name}. Enforced immediately on server.`);
      setShowPermissionsModal(false);
      loadEmployees();
    } catch (err: any) {
      setError(err.message || 'Failed updating permissions');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1F2937] flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-[#2563EB]" />
            <span>Employee Access & Permission Management</span>
          </h1>
          <p className="text-xs text-[#6B7280]">
            Admin control center: Provision staff accounts, assign roles, and toggle granular server-enforced permissions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadEmployees}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
          >
            <UserPlus className="h-4 w-4" />
            <span>Create Employee Account</span>
          </button>
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

      {/* Employees Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#6B7280] font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Staff Name & Code</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4 text-center">System Role</th>
                <th className="py-3 px-4 text-center">Configured Permissions</th>
                <th className="py-3 px-4 text-center">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4">
                    <div className="font-bold text-gray-900">{emp.name}</div>
                    <div className="text-[10px] text-gray-500 font-mono">{emp.employeeCode}</div>
                  </td>
                  <td className="py-3 px-4 text-gray-700 font-medium">
                    {emp.email}
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {emp.phone || '—'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                        emp.role === 'admin'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : emp.role === 'manager'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {emp.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {emp.role === 'admin' ? (
                      <span className="text-blue-700 font-bold text-[11px]">ALL (Unrestricted)</span>
                    ) : (
                      <button
                        onClick={() => handleOpenPermissions(emp)}
                        className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:border-blue-400 hover:text-blue-600 shadow-2xs"
                      >
                        {emp.permissions.length} Enabled • Edit Rules →
                      </button>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        emp.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {emp.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {emp.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleStatus(emp)}
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                            emp.status === 'active'
                              ? 'text-red-600 border-red-200 hover:bg-red-50'
                              : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                          }`}
                        >
                          {emp.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE EMPLOYEE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <h3 className="text-base font-bold text-gray-900">Create Employee Account</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Ankit Sharma"
                  className="w-full rounded-lg border border-gray-300 p-2"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Official Email ID *</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="ankit@apexdistribute.com"
                  className="w-full rounded-lg border border-gray-300 p-2"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+91 98200 44556"
                  className="w-full rounded-lg border border-gray-300 p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Role</label>
                  <select
                    value={formRole}
                    onChange={(e: any) => setFormRole(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2 font-medium"
                  >
                    <option value="employee">Employee (Staff)</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Initial Password</label>
                  <input
                    type="password"
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {formLoading ? 'Creating...' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PERMISSIONS MATRIX MODAL */}
      {showPermissionsModal && selectedUserForPerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Configure Permissions: {selectedUserForPerms.name}
                </h3>
                <p className="text-xs text-gray-500">
                  Role: <span className="uppercase font-semibold text-blue-700">{selectedUserForPerms.role}</span> • Code: {selectedUserForPerms.employeeCode}
                </p>
              </div>
              <button onClick={() => setShowPermissionsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 text-xs">
              {PERMISSION_GROUPS.map((grp) => (
                <div key={grp.group} className="border border-gray-200 rounded-lg p-3.5 bg-slate-50/50">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
                    {grp.group}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {grp.permissions.map((p) => {
                      const isEnabled = tempPermissions.includes(p.id);

                      return (
                        <div
                          key={p.id}
                          onClick={() => togglePermission(p.id)}
                          className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer select-none transition ${
                            isEnabled
                              ? 'bg-blue-50 border-blue-300 text-blue-900'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => {}}
                            className="mt-0.5 rounded text-blue-600 focus:ring-0"
                          />
                          <div>
                            <p className="font-bold leading-tight">{p.label}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">{p.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-200 mt-4 flex items-center justify-between">
              <span className="text-[11px] text-gray-500">
                {tempPermissions.length} permissions granted to this user
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPermissionsModal(false)}
                  className="rounded-lg border border-gray-300 px-3.5 py-1.5 font-semibold text-gray-700 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={formLoading}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 font-bold text-white text-xs hover:bg-blue-700 disabled:opacity-50"
                >
                  {formLoading ? 'Saving...' : 'Save & Enforce Permissions'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
