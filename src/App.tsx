import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/layout/Navbar.tsx';
import { Sidebar, NavTabId } from './components/layout/Sidebar.tsx';
import { LoginView } from './features/auth/LoginView.tsx';
import { DashboardView } from './features/dashboard/DashboardView.tsx';
import { BillingPOSView } from './features/billing/BillingPOSView.tsx';
import { InvoiceHistoryView } from './features/invoices/InvoiceHistoryView.tsx';
import { ProductsView } from './features/products/ProductsView.tsx';
import { InventoryView } from './features/inventory/InventoryView.tsx';
import { CustomersView } from './features/customers/CustomersView.tsx';
import { SuppliersView } from './features/suppliers/SuppliersView.tsx';
import { PurchasesView } from './features/purchases/PurchasesView.tsx';
import { PaymentsView } from './features/payments/PaymentsView.tsx';
import { ReportsView } from './features/reports/ReportsView.tsx';
import { EmployeeManagementView } from './features/employees/EmployeeManagementView.tsx';
import { ApprovalsView } from './features/approvals/ApprovalsView.tsx';
import { AuditLogsView } from './features/audit/AuditLogsView.tsx';
import { SettingsView } from './features/settings/SettingsView.tsx';
import { InvoicePrintModal } from './components/modals/InvoicePrintModal.tsx';
import { GlobalSearchModal } from './components/modals/GlobalSearchModal.tsx';
import { api } from './services/api.ts';
import { Invoice, BusinessSettings } from './types/index.ts';

const AppShell: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTabId>('dashboard');
  const [settings, setSettings] = useState<BusinessSettings | null>(null);

  // Notifications counts
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  // Modals
  const [activePrintInvoice, setActivePrintInvoice] = useState<Invoice | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Load business settings and alerts
  const loadInitialSettingsAndAlerts = async () => {
    try {
      const [s, dash] = await Promise.all([
        api.getSettings(),
        api.getDashboard().catch(() => null),
      ]);
      setSettings(s);
      if (dash) {
        setPendingApprovalsCount(dash.pendingApprovalsCount);
        setLowStockCount(dash.lowStockCount);
      }
    } catch (e) {
      console.warn('Initial data load:', e);
    }
  };

  useEffect(() => {
    if (user) {
      loadInitialSettingsAndAlerts();
    }
  }, [user]);

  // Global Ctrl+K / Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F8FAFC]">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-xs font-semibold text-gray-500">Initializing ApexDistribute ERP...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const defaultSettings: BusinessSettings = settings || {
    businessName: 'Apex Distribute Enterprise',
    tagline: 'Authorized Electronics & Appliances Distribution',
    address: 'Plot 42, Midc Industrial Area, Andheri East',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400093',
    phone: '+91 98200 12345',
    email: 'billing@apexdistribute.com',
    gstin: '27AABCA1234F1Z5',
    pan: 'AABCA1234F',
    invoicePrefix: 'APX-26-',
    invoiceNextNumber: 1045,
    termsAndConditions: 'Goods once sold cannot be returned without supervisor approval.',
    bankDetails: {
      bankName: 'HDFC Bank Ltd',
      accountNumber: '50200012345678',
      ifscCode: 'HDFC0000123',
      branch: 'Andheri East, Mumbai',
      upiId: 'apexdistribute@hdfcbank',
    },
    currencySymbol: '₹',
    currencyCode: 'INR',
    discountApprovalThreshold: 10,
    allowNegativeStock: false,
    defaultPrintLayout: 'a4',
  };

  const handleInvoiceFinalized = (inv: Invoice) => {
    setActivePrintInvoice(inv);
    loadInitialSettingsAndAlerts();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-[#1F2937] w-full overflow-x-hidden">
      {/* Top Navbar */}
      <Navbar
        onOpenSearch={() => setIsSearchOpen(true)}
        pendingApprovalsCount={pendingApprovalsCount}
        lowStockCount={lowStockCount}
        onNavigate={(tab) => {
          setCurrentTab(tab as NavTabId);
          setIsMobileSidebarOpen(false);
        }}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      <div className="flex flex-1 relative w-full overflow-x-hidden min-h-0">
        {/* Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setIsMobileSidebarOpen(false);
          }}
          pendingApprovalsCount={pendingApprovalsCount}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-full overflow-y-auto p-2.5 sm:p-4 md:p-6 min-w-0">
          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigate={setCurrentTab}
              onSelectInvoice={(inv) => setActivePrintInvoice(inv)}
            />
          )}

          {currentTab === 'billing' && (
            <BillingPOSView
              settings={defaultSettings}
              onInvoiceCreated={handleInvoiceFinalized}
            />
          )}

          {currentTab === 'invoices' && (
            <InvoiceHistoryView
              settings={defaultSettings}
              onSelectInvoiceToPrint={(inv) => setActivePrintInvoice(inv)}
            />
          )}

          {currentTab === 'products' && <ProductsView />}

          {currentTab === 'inventory' && <InventoryView />}

          {currentTab === 'customers' && <CustomersView settings={defaultSettings} />}

          {currentTab === 'suppliers' && <SuppliersView settings={defaultSettings} />}

          {currentTab === 'purchases' && <PurchasesView />}

          {currentTab === 'payments' && <PaymentsView />}

          {currentTab === 'reports' && <ReportsView />}

          {currentTab === 'employees' && <EmployeeManagementView />}

          {currentTab === 'approvals' && <ApprovalsView />}

          {currentTab === 'audit' && <AuditLogsView />}

          {currentTab === 'settings' && (
            <SettingsView
              settings={defaultSettings}
              onSettingsUpdated={(newSettings) => setSettings(newSettings)}
            />
          )}
        </main>
      </div>

      {/* Global Invoice Print Modal */}
      {activePrintInvoice && (
        <InvoicePrintModal
          invoice={activePrintInvoice}
          settings={defaultSettings}
          onClose={() => setActivePrintInvoice(null)}
        />
      )}

      {/* Global Quick Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectProduct={(p) => {
          setCurrentTab('billing');
        }}
        onSelectInvoice={(inv) => {
          setActivePrintInvoice(inv);
        }}
        onSelectCustomer={(c) => {
          setCurrentTab('customers');
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
