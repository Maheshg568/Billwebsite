import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Search,
  Bell,
  Shield,
  User as UserIcon,
  LogOut,
  ChevronDown,
  AlertTriangle,
  FileCheck2,
  Package,
  Layers,
  Sparkles,
  Menu,
} from 'lucide-react';
import { Role } from '../../types/index.ts';

interface NavbarProps {
  onOpenSearch: () => void;
  pendingApprovalsCount?: number;
  lowStockCount?: number;
  onNavigate: (tab: string) => void;
  onToggleMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSearch,
  pendingApprovalsCount = 0,
  lowStockCount = 0,
  onNavigate,
  onToggleMobileSidebar,
}) => {
  const { user, logout, switchDemoRole } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  const totalNotifications = pendingApprovalsCount + (lowStockCount > 0 ? 1 : 0);

  const getRoleBadgeColor = (role: Role) => {
    switch (role) {
      case 'admin':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'manager':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'employee':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#E5E7EB] bg-white px-3 sm:px-4 md:px-6 shadow-xs">
      {/* Brand & Mobile Hamburger */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition shrink-0"
          title="Toggle Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-[#2563EB] text-white shadow-xs shrink-0">
          <Layers className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0">
          <span className="text-sm sm:text-base font-bold text-gray-900 block leading-tight truncate">ApexDistribute</span>
          <p className="text-[10px] sm:text-[11px] text-gray-500 hidden sm:block">Billing & Inventory</p>
        </div>
      </div>

      {/* Global Quick Search - Desktop Full Bar */}
      <div className="hidden sm:flex flex-1 max-w-md mx-4">
        <button
          onClick={onOpenSearch}
          className="flex w-full items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-3.5 py-2 text-sm text-[#6B7280] transition hover:border-blue-400 hover:bg-white focus:outline-hidden"
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <span className="text-xs sm:text-sm">Search products, invoices, customers...</span>
          </div>
          <kbd className="hidden md:inline-block rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-500 shadow-2xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Actions & User Profile */}
      <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
        {/* Mobile Search Button */}
        <button
          onClick={onOpenSearch}
          className="sm:hidden p-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
          title="Search"
        >
          <Search className="h-4 w-4" />
        </button>
        {/* Quick Demo Role Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setShowRoleSwitcher(!showRoleSwitcher);
              setShowNotifications(false);
              setShowProfileMenu(false);
            }}
            className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/70 px-2 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-100/80"
            title="Switch demo account to test different permissions"
          >
            <Shield className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <span className="font-semibold uppercase text-[10px] sm:text-xs">{user?.role}</span>
            <ChevronDown className="h-3 w-3 opacity-70 shrink-0" />
          </button>

          {showRoleSwitcher && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-2 shadow-lg z-50">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-800">Quick Test Role Switcher</p>
                <p className="text-[11px] text-gray-500">Instantly test granular permissions & access</p>
              </div>
              <div className="space-y-1 p-1">
                <button
                  onClick={() => {
                    switchDemoRole('admin');
                    setShowRoleSwitcher(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition ${
                    user?.role === 'admin' ? 'bg-blue-50 font-semibold text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div>
                    <div className="font-medium text-gray-900">Vikram Sharma (Super Admin)</div>
                    <div className="text-[11px] text-gray-500">Full system authority, all 28 permissions</div>
                  </div>
                  {user?.role === 'admin' && <span className="h-2 w-2 rounded-full bg-blue-600"></span>}
                </button>

                <button
                  onClick={() => {
                    switchDemoRole('manager');
                    setShowRoleSwitcher(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition ${
                    user?.role === 'manager' ? 'bg-blue-50 font-semibold text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div>
                    <div className="font-medium text-gray-900">Priya Patel (Store Manager)</div>
                    <div className="text-[11px] text-gray-500">Purchases, stock adjustments & approvals</div>
                  </div>
                  {user?.role === 'manager' && <span className="h-2 w-2 rounded-full bg-blue-600"></span>}
                </button>

                <button
                  onClick={() => {
                    switchDemoRole('employee');
                    setShowRoleSwitcher(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition ${
                    user?.role === 'employee' ? 'bg-blue-50 font-semibold text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div>
                    <div className="font-medium text-gray-900">Rahul Verma (Billing Staff)</div>
                    <div className="text-[11px] text-gray-500">Billing only; no cost view, restricted discounts</div>
                  </div>
                  {user?.role === 'employee' && <span className="h-2 w-2 rounded-full bg-blue-600"></span>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowRoleSwitcher(false);
              setShowProfileMenu(false);
            }}
            className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            {totalNotifications > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                {totalNotifications}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-200 bg-white p-3 shadow-lg z-50">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-xs font-semibold text-gray-900">Notifications</span>
                <span className="text-[11px] text-gray-500">{totalNotifications} pending</span>
              </div>
              <div className="divide-y divide-gray-100 py-2 space-y-2">
                {pendingApprovalsCount > 0 ? (
                  <div
                    onClick={() => {
                      onNavigate('approvals');
                      setShowNotifications(false);
                    }}
                    className="flex cursor-pointer items-start gap-2.5 rounded-lg p-2 text-xs hover:bg-amber-50"
                  >
                    <FileCheck2 className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">{pendingApprovalsCount} Approval Request(s)</p>
                      <p className="text-[11px] text-gray-500">Requires supervisor review</p>
                    </div>
                  </div>
                ) : null}

                {lowStockCount > 0 ? (
                  <div
                    onClick={() => {
                      onNavigate('inventory');
                      setShowNotifications(false);
                    }}
                    className="flex cursor-pointer items-start gap-2.5 rounded-lg p-2 text-xs hover:bg-red-50"
                  >
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">{lowStockCount} Products in Low Stock</p>
                      <p className="text-[11px] text-gray-500">Stock below minimum threshold</p>
                    </div>
                  </div>
                ) : null}

                {totalNotifications === 0 && (
                  <div className="py-4 text-center text-xs text-gray-500">All systems up to date. No pending alerts.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowRoleSwitcher(false);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-xs font-semibold text-white">
              {user?.name.charAt(0) || 'U'}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-semibold text-gray-900 leading-tight">{user?.name}</p>
              <p className="text-[10px] text-gray-500">{user?.employeeCode}</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400 hidden sm:block" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-lg z-50">
              <div className="border-b border-gray-100 px-3 py-2">
                <p className="text-xs font-bold text-gray-900">{user?.name}</p>
                <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span
                    className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase ${getRoleBadgeColor(
                      user?.role || 'employee'
                    )}`}
                  >
                    {user?.role}
                  </span>
                  <span className="text-[10px] text-gray-400">{user?.employeeCode}</span>
                </div>
              </div>

              <div className="p-1">
                <button
                  onClick={() => {
                    onNavigate('settings');
                    setShowProfileMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
                >
                  <UserIcon className="h-3.5 w-3.5" />
                  <span>Business Profile</span>
                </button>
                <button
                  onClick={() => {
                    logout();
                    setShowProfileMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Secure Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
