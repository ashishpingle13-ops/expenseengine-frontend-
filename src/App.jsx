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

export default function App() {
  return (
    <BrowserRouter> 

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
      <Route path="/edit-worker/" element={<ProtectedRoute><EditWorker/> </ProtectedRoute>} />
      <Route path="/report" element={<ProtectedRoute><MonthlyReport/></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile/></ProtectedRoute>} />
      <Route path="/cashbook" element={<ProtectedRoute><CashbookPage/></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute><Expenses/></ProtectedRoute>} />
      <Route path="/worker/:id" element={<ProtectedRoute><WorkerLedger/></ProtectedRoute>} />


    </Routes>
    </BrowserRouter>
  );
}