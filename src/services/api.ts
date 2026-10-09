import {
  User,
  Product,
  Customer,
  Supplier,
  Invoice,
  PaymentRecord,
  Purchase,
  InventoryMovement,
  ApprovalRequest,
  AuditLog,
  BusinessSettings,
  DashboardMetrics,
} from '../types/index.ts';

const TOKEN_KEY = 'apex_distribute_token';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY);
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
      headers['x-session-token'] = this.token;
    }

    const res = await fetch(`/api${endpoint}`, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.error || `Request failed with status ${res.status}`;
      const err = new Error(errorMsg);
      (err as any).status = res.status;
      (err as any).data = data;
      throw err;
    }

    return data as T;
  }

  // --- Auth ---
  public async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(res.token);
    return res;
  }

  public async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/me');
  }

  public async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    } finally {
      this.setToken(null);
    }
  }

  public async switchDemoRole(role: 'admin' | 'manager' | 'employee'): Promise<{ token: string; user: User }> {
    const res = await this.request<{ token: string; user: User }>('/auth/switch-demo', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
    this.setToken(res.token);
    return res;
  }

  // --- Dashboard ---
  public async getDashboard(): Promise<DashboardMetrics> {
    return this.request<DashboardMetrics>('/dashboard');
  }

  // --- Products ---
  public async getProducts(): Promise<Product[]> {
    return this.request<Product[]>('/products');
  }

  public async createProduct(product: Partial<Product>): Promise<Product> {
    return this.request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  }

  public async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    return this.request<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // --- Customers ---
  public async getCustomers(): Promise<Customer[]> {
    return this.request<Customer[]>('/customers');
  }

  public async createCustomer(customer: Partial<Customer>): Promise<Customer> {
    return this.request<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  }

  public async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    return this.request<Customer>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // --- Suppliers ---
  public async getSuppliers(): Promise<Supplier[]> {
    return this.request<Supplier[]>('/suppliers');
  }

  public async createSupplier(supplier: Partial<Supplier>): Promise<Supplier> {
    return this.request<Supplier>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplier),
    });
  }

  // --- Invoices & Billing ---
  public async getInvoices(): Promise<Invoice[]> {
    return this.request<Invoice[]>('/invoices');
  }

  public async getInvoiceById(id: string): Promise<Invoice> {
    return this.request<Invoice>(`/invoices/${id}`);
  }

  public async finalizeInvoice(payload: {
    customerId?: string;
    items: Array<{ productId: string; quantity: number; discountType?: string; discountValue?: number }>;
    paymentMethod: string;
    amountReceived: number;
    notes?: string;
    isDraft?: boolean;
  }): Promise<Invoice> {
    return this.request<Invoice>('/invoices/finalize', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async cancelInvoice(id: string, reason: string): Promise<{ message: string; approvalRequired?: boolean; invoice?: Invoice }> {
    return this.request(`/invoices/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // --- Inventory & Stock ---
  public async getInventoryMovements(): Promise<InventoryMovement[]> {
    return this.request<InventoryMovement[]>('/inventory/movements');
  }

  public async adjustStock(payload: {
    productId: string;
    quantityChange: number;
    reason: string;
    type?: string;
  }): Promise<{ message: string; approvalRequired?: boolean; movement?: InventoryMovement }> {
    return this.request('/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Purchases ---
  public async getPurchases(): Promise<Purchase[]> {
    return this.request<Purchase[]>('/purchases');
  }

  public async createPurchase(payload: {
    supplierId: string;
    supplierInvoiceRef: string;
    date: string;
    items: Array<{ productId: string; quantity: number; purchasePrice: number; taxRate?: number }>;
    amountPaid?: number;
    notes?: string;
  }): Promise<Purchase> {
    return this.request<Purchase>('/purchases', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Payments ---
  public async getPayments(): Promise<PaymentRecord[]> {
    return this.request<PaymentRecord[]>('/payments');
  }

  public async recordCustomerDuePayment(payload: {
    customerId: string;
    amount: number;
    paymentMethod: string;
    referenceNumber?: string;
    notes?: string;
  }): Promise<{ receipt: PaymentRecord; newOutstandingBalance: number }> {
    return this.request('/payments/customer-due', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Approvals ---
  public async getApprovals(): Promise<ApprovalRequest[]> {
    return this.request<ApprovalRequest[]>('/approvals');
  }

  public async reviewApproval(id: string, decision: 'APPROVE' | 'REJECT', reviewComments?: string): Promise<{ message: string; request: ApprovalRequest }> {
    return this.request(`/approvals/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, reviewComments }),
    });
  }

  // --- Employees (Admin) ---
  public async getEmployees(): Promise<User[]> {
    return this.request<User[]>('/employees');
  }

  public async createEmployee(payload: Partial<User> & { password?: string }): Promise<User> {
    return this.request<User>('/employees', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async updateEmployee(id: string, updates: Partial<User> & { password?: string }): Promise<User> {
    return this.request<User>(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // --- Reports ---
  public async getSalesReport(): Promise<{
    summary: {
      totalInvoices: number;
      totalGross: number;
      totalDiscounts: number;
      totalTaxable: number;
      totalTax: number;
      totalRevenue: number;
      totalCostOfGoods: number | null;
      estimatedProfit: number | null;
      profitMarginPercent: number | null;
    };
    topProducts: Array<{ name: string; sku: string; unitsSold: number; totalSales: number; estimatedCost: number }>;
    employeePerformance: Array<{ name: string; billsCount: number; totalRevenue: number }>;
  }> {
    return this.request('/reports/sales');
  }

  // --- Audit Logs ---
  public async getAuditLogs(): Promise<AuditLog[]> {
    return this.request<AuditLog[]>('/audit-logs');
  }

  // --- Settings ---
  public async getSettings(): Promise<BusinessSettings> {
    return this.request<BusinessSettings>('/settings');
  }

  public async updateSettings(updates: Partial<BusinessSettings>): Promise<BusinessSettings> {
    return this.request<BusinessSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  public async resetDemoData(): Promise<void> {
    await this.request('/system/reset-demo', { method: 'POST' });
  }

  public async getBackup(): Promise<any> {
    return this.request('/system/backup');
  }
}

export const api = new ApiClient();
