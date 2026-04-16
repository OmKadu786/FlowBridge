const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Auth
  register: (data) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  // Store
  createStore: (data) => request('/api/store/', { method: 'POST', body: JSON.stringify(data) }),
  getStore: (id) => request(`/api/store/${id}`),
  listStores: () => request('/api/store/'),

  // Products
  listProducts: (storeId) => request(`/api/products/?store_id=${storeId}`),
  createProduct: (data) => request('/api/products/', { method: 'POST', body: JSON.stringify(data) }),
  restockProduct: (id, data) => request(`/api/products/${id}/restock`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/api/products/${id}`, { method: 'DELETE' }),

  // Orders
  listOrders: (storeId) => request(`/api/orders/?store_id=${storeId}`),
  createOrder: (data) => request('/api/orders/', { method: 'POST', body: JSON.stringify(data) }),
  sendInvoice: (orderId) => request(`/api/orders/${orderId}/email`, { method: 'POST' }),
  sendReminder: (orderId) => request(`/api/orders/${orderId}/reminder`, { method: 'POST' }),

  // Customers
  listCustomers: (storeId) => request(`/api/customers/?store_id=${storeId}`),

  // Activity
  listActivity: (storeId) => request(`/api/activity/?store_id=${storeId}`),
  createLog: (data) => request('/api/activity/', { method: 'POST', body: JSON.stringify(data) }),

  // Chat
  chat: (data) => request('/api/chat/', { method: 'POST', body: JSON.stringify(data) }),
};
