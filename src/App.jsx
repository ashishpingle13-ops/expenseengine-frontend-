import { BrowserRouter,Routes,Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Add_Worker from "./pages/Add-Worker";
import { DateSelectorPage } from "./pages/DateSelectorPage";
import EditWorker from "./pages/EditWorker";
import ProtectedRoute from "./components/ProtectedRoute";
import MonthlyReport from "./pages/MonthlyReport";
import Profile from "./pages/Profile";
import CashbookPage from "./pages/CashbookPage";
import  Expenses  from "./pages/Expenses";
import WorkerLedger from "./pages/WorkerLedger";
import PickContact from "./pages/PickContact";
import { SWRConfig } from 'swr';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';



function DynamicStatusBar() {
  const location = useLocation();

  useEffect(() => {
    const updateBarColor = async () => {
      const path = location.pathname.toLowerCase();

      let bgColor = '#1048A4'; // Default: Royal Blue (Cashbook, PickContact, AddWorker, WorkerLedger)
      let barStyle = Style.Dark; // White status bar icons

      if (path === '/' || path.includes('login')) {
        bgColor = '#0A3D91'; // Login Page -> Deep Royal Blue
        barStyle = Style.Dark;
      } else if (
        path.includes('home') ||
        path.includes('dashboard') ||
        path.includes('report') ||
        path.includes('monthly') ||
        path.includes('date')
      ) {
        bgColor = '#0E793C'; // Attendance / Dashboard / Report -> Forest Green
        barStyle = Style.Dark;
      } else if (path.includes('expense')) {
        bgColor = '#9D0052'; // Site Expenses -> Maroon
        barStyle = Style.Dark;
      } else if (path.includes('profile')) {
        bgColor = '#FFFFFF'; // Profile Page -> Pure White
        barStyle = Style.Light; // Dark status bar icons
      }

      // 1. Update HTML meta theme-color for WebView / Chrome
      let metaTheme = document.querySelector('meta[name="theme-color"]');
      if (!metaTheme) {
        metaTheme = document.createElement('meta');
        metaTheme.name = 'theme-color';
        document.head.appendChild(metaTheme);
      }
      metaTheme.setAttribute('content', bgColor);

      // 2. Update Native Android Status Bar via Capacitor
      try {
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setBackgroundColor({ color: bgColor });
        await StatusBar.setStyle({ style: barStyle });
      } catch (err) {
        // Ignored on standard desktop web browsers
      }
    };

    updateBarColor();
  }, [location.pathname]);

  return null;
}




// This function syncs SWR cache to localStorage
const localStorageProvider = () => {
  const map = new Map(JSON.parse(localStorage.getItem('expenseengine-cache') || '[]'));
  window.addEventListener('beforeunload', () => {
    const appCache = JSON.stringify(Array.from(map.entries()));
    localStorage.setItem('expenseengine-cache', appCache);
  });
  return map;
};

export default function App() {
  return (
    <SWRConfig value={{ provider: localStorageProvider, revalidateOnFocus: false, dedupingInterval: 10000 }}>
    <BrowserRouter> 
      <DynamicStatusBar />
    <Toaster 
  position="top-center" 
  reverseOrder={false} 
  toastOptions={{
    style: {
      zIndex: 9999,
    },
  }}
    />

    <Routes>
      {/* PUBLIC ROUTE: Anyone can see the login page */}
      <Route path="/" element={<Login/>} />


      {/* 🔒 PROTECTED ROUTES: Only logged-in users can enter */}
      <Route path="/dashboard" element={<ProtectedRoute> <Dashboard/> </ProtectedRoute>} />
      <Route path="/add-worker" element={<ProtectedRoute><Add_Worker/> </ProtectedRoute>} />
      <Route path="/select-date" element={ <ProtectedRoute><DateSelectorPage/> </ProtectedRoute>} />
      <Route path="/edit-worker" element={<ProtectedRoute><EditWorker/> </ProtectedRoute>} />
      <Route path="/report" element={<ProtectedRoute><MonthlyReport/></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile/></ProtectedRoute>} />
      <Route path="/cashbook" element={<ProtectedRoute><CashbookPage/></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute><Expenses/></ProtectedRoute>} />
      <Route path="/worker/:id" element={<ProtectedRoute><WorkerLedger/></ProtectedRoute>} />
      <Route path="/pick-contact" element={ <ProtectedRoute> <PickContact/> </ProtectedRoute> } />

    </Routes>
    </BrowserRouter>
    </SWRConfig>
  );
}