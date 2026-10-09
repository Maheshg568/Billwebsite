import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Layers, Shield, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { Role } from '../../types/index.ts';

export const LoginView: React.FC = () => {
  const { login, switchDemoRole } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (role: Role) => {
    setError(null);
    setLoading(true);
    try {
      await switchDemoRole(role);
    } catch (err: any) {
      setError(err.message || 'Failed switching demo user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#F8FAFC] py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#2563EB] text-white shadow-md">
          <Layers className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-[#1F2937]">
          ApexDistribute ERP
        </h2>
        <p className="mt-1 text-xs text-[#6B7280]">
          Distributor Billing, Inventory Control & Staff Management Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-xl border border-[#E5E7EB] bg-white px-6 py-8 shadow-sm sm:px-10">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700">Staff Email ID</label>
              <div className="relative mt-1">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@apexdistribute.com"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2 pl-9 text-xs text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                />
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700">Password</label>
              <div className="relative mt-1">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2 pl-9 text-xs text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                />
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Demo Accounts Helper */}
          <div className="mt-6 border-t border-gray-200 pt-5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span>One-Click Demo Account Login</span>
            </div>
            <p className="text-[11px] text-gray-500 mb-3">
              Test role-specific access, permissions, and restrictions:
            </p>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('admin')}
                className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/70 p-2.5 text-left text-xs transition hover:bg-blue-100"
              >
                <div>
                  <div className="font-semibold text-blue-900">Vikram Sharma (Super Admin)</div>
                  <div className="text-[10px] text-blue-700">Full authority: Settings, Employees, Audits, Costs</div>
                </div>
                <span className="text-[10px] font-bold text-blue-600">Login →</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('manager')}
                className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-left text-xs transition hover:bg-amber-100"
              >
                <div>
                  <div className="font-semibold text-amber-900">Priya Patel (Store Manager)</div>
                  <div className="text-[10px] text-amber-700">Purchases, Approvals, Stocks, Bills</div>
                </div>
                <span className="text-[10px] font-bold text-amber-600">Login →</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('employee')}
                className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5 text-left text-xs transition hover:bg-emerald-100"
              >
                <div>
                  <div className="font-semibold text-emerald-900">Rahul Verma (Billing Staff)</div>
                  <div className="text-[10px] text-emerald-700">Restricted POS billing; approvals required for returns</div>
                </div>
                <span className="text-[10px] font-bold text-emerald-600">Login →</span>
              </button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-gray-500">
          ApexDistribute Enterprise Edition • Server-Enforced RBAC • All rights reserved
        </p>
      </div>
    </div>
  );
};
