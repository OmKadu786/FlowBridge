import { useState, useEffect, createContext, useContext } from 'react';
import './styles/index.css';
import Topnav from './components/Topnav';
import Sidebar from './components/Sidebar';
import AIChat from './pages/AIChat';
import Toast from './components/Toast';
import AuthModal from './components/AuthModal';
import OnboardingModal from './components/OnboardingModal';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import POS from './pages/POS';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Payments from './pages/Payments';
import Activity from './pages/Activity';

// Global app context
export const AppContext = createContext(null);

export function useApp() {
  return useContext(AppContext);
}

const SYM = { USD: '$', EUR: '€', GBP: '£', INR: '₹', AED: 'AED ', CAD: 'CA$' };

export default function App() {
  const [user, setUser] = useState(null); // null = show auth
  const [store, setStore] = useState(null); // null = show onboarding (if logged in)
  const [page, setPage] = useState('dashboard');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [toast, setToast] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);

  const fmt = (n) => (SYM[store?.currency] || '$') + parseFloat(n || 0).toFixed(2);

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const ctx = {
    user, setUser,
    store, setStore,
    page, setPage,
    products, setProducts,
    orders, setOrders,
    customers, setCustomers,
    activity, setActivity,
    toast, showToast,
    chatOpen, setChatOpen,
    fmt,
  };

  // 1. If not logged in, show login/signup
  if (!user) {
    return (
      <AppContext.Provider value={ctx}>
        <AuthModal />
        <Toast />
      </AppContext.Provider>
    );
  }

  // 2. If logged in but no store, show onboarding
  if (!store) {
    return (
      <AppContext.Provider value={ctx}>
        <OnboardingModal />
        <Toast />
      </AppContext.Provider>
    );
  }

  const renderPage = () => {
    switch (page) {
      case 'chat': return <AIChat />;
      case 'products': return <Products />;
      case 'inventory': return <Inventory />;
      case 'pos': return <POS />;
      case 'orders': return <Orders />;
      case 'customers': return <Customers />;
      case 'payments': return <Payments />;
      case 'activity': return <Activity />;
      default: return <Dashboard />;
    }
  };

  return (
    <AppContext.Provider value={ctx}>
      <div className="app-layout">
        <Topnav />
        <div className="body-wrap">
          <Sidebar />
          <div className="main-content">
            {renderPage()}
          </div>
        </div>
      </div>
      <Toast />
    </AppContext.Provider>
  );
}
