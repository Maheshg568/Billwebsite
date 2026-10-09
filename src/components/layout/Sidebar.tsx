import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  LayoutDashboard,
  ReceiptText,
  FileSpreadsheet,
  Package,
  Boxes,
  Users,
  Truck,
  ShoppingBag,
  CreditCard,
  BarChart3,
  UserCheck,
  CheckSquare,
  ShieldAlert,
  Settings,
  ChevronRight,
  X,
  Layers,
} from 'lucide-react';
import { Permission } from '../../types/index.ts';

export type NavTabId =
  | 'dashboard'
  | 'billing'
  | 'invoices'
  | 'products'
  | 'inventory'
  | 'customers'
  | 'suppliers'
  | 'purchases'
  | 'payments'
  | 'reports'
  | 'employees'
  | 'approvals'
  | 'audit'
  | 'settings';

interface SidebarItem {
  id: NavTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredPermission?: Permission;
  adminOnly?: boolean;
  badge?: number;
}

interface SidebarProps {
  currentTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  pendingApprovalsCount?: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingApprovalsCount = 0,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { user, hasPermission, isAdmin } = useAuth();

  const allItems: SidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'billing',
      label: 'Create Bill',
      icon: ReceiptText,
      requiredPermission: 'create_bills',
    },
    {
      id: 'invoices',
      label: 'Invoices',
      icon: FileSpreadsheet,
      requiredPermission: 'view_own_bills',
    },
    {
      id: 'products',
      label: 'Products',
      icon: Package,
      requiredPermission: 'view_products',
    },
    {
      id: 'inventory',
      label: 'Stock',
      icon: Boxes,
      requiredPermission: 'view_stock',
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: Users,
      requiredPermission: 'view_customers',
    },
    {
      id: 'suppliers',
      label: 'Suppliers',
      icon: Truck,
      requiredPermission: 'view_suppliers',
    },
    {
      id: 'purchases',
      label: 'Purchases',
      icon: ShoppingBag,
      requiredPermission: 'view_purchases',
    },
    {
      id: 'payments',
      label: 'Payments',
      icon: CreditCard,
      requiredPermission: 'view_payments',
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
      requiredPermission: 'view_sales_reports',
    },
    {
      id: 'employees',
      label: 'Staff',
      icon: UserCheck,
      adminOnly: true,
    },
    {
      id: 'approvals',
      label: 'Approvals',
      icon: CheckSquare,
      badge: pendingApprovalsCount,
    },
    {
      id: 'audit',
      label: 'Audit Logs',
      icon: ShieldAlert,
      adminOnly: true,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      adminOnly: true,
    },
  ];

  // Filter items based on user role and permissions
  const authorizedItems = allItems.filter((item) => {
    if (isAdmin) return true;
    if (item.adminOnly) return false;
    if (item.id === 'invoices') {
      return hasPermission('view_all_bills') || hasPermission('view_own_bills');
    }
    if (item.requiredPermission) {
      return hasPermission(item.requiredPermission);
    }
    return true;
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 md:w-64 shrink-0 border-r border-[#E5E7EB] flex flex-col justify-between h-full md:h-[calc(100vh-4rem)] shadow-lg md:shadow-none ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Mobile Header with Close button */}
        <div className="flex md:hidden items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Layers className="h-4 w-4" />
            </div>
            <span className="font-bold text-gray-900 text-sm">ApexDistribute</span>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-gray-500 hover:bg-gray-200"
            title="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="overflow-y-auto py-3 px-3 space-y-1 flex-1">
          <div className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
            Main Navigation
          </div>

          {authorizedItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile?.();
                }}
                className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-[#2563EB] font-semibold'
                    : 'text-[#1F2937] hover:bg-slate-50 hover:text-blue-600'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive ? 'text-[#2563EB]' : 'text-slate-400 group-hover:text-blue-600'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge !== undefined && item.badge > 0 ? (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">
                      {item.badge}
                    </span>
                  ) : null}
                  {isActive && <ChevronRight className="h-3 w-3 text-[#2563EB]" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Info Box */}
        <div className="border-t border-[#E5E7EB] p-3 bg-[#F8FAFC]">
          <div className="rounded-lg border border-slate-200/80 bg-white p-2.5 shadow-2xs text-[11px]">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span>Terminal</span>
              <span className="font-semibold text-emerald-600">● Online</span>
            </div>
            <div className="text-slate-700 font-medium truncate">
              {user?.name}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">
              Role: {user?.role}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
