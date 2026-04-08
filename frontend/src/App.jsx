import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { GuestOnly, RequireRole } from './components/auth/RouteGuards'

// Layouts
import CustomerLayout from './components/layout/CustomerLayout'
import AdminLayout from './components/layout/AdminLayout'
import WarehouseLayout from './components/layout/WarehouseLayout'

// Customer / Guest pages
import Home from './pages/customer/Home'
import Product from './pages/customer/Product'
import Cart from './pages/customer/Cart'
import Checkout from './pages/customer/Checkout'
import OrderTracking from './pages/customer/OrderTracking'
import Login from './pages/customer/Login'
import Register from './pages/customer/Register'
import Unauthorized from './pages/Unauthorized'

// Admin pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminUsers from './pages/admin/Users'
import AdminAIConfig from './pages/admin/AIConfig'
import AdminReports from './pages/admin/Reports'

// Warehouse pages
import WarehouseInventory from './pages/warehouse/Inventory'
import WarehouseOrders from './pages/warehouse/Orders'

function App() {
  return (
    <div className="light-theme">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Customer / Guest Routes */}
            <Route element={<CustomerLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/product/:id" element={<Product />} />
              <Route path="/cart" element={<RequireRole roles={[ 'customer' ]}><Cart /></RequireRole>} />
              <Route path="/checkout" element={<RequireRole roles={[ 'customer' ]}><Checkout /></RequireRole>} />
              <Route path="/orders" element={<RequireRole roles={[ 'customer' ]}><OrderTracking /></RequireRole>} />
              <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
              <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin" element={<RequireRole roles={[ 'admin' ]}><AdminLayout /></RequireRole>}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="ai-config" element={<AdminAIConfig />} />
              <Route path="reports" element={<AdminReports />} />
            </Route>

            {/* Warehouse Routes */}
            <Route path="/warehouse" element={<RequireRole roles={[ 'warehouse' ]}><WarehouseLayout /></RequireRole>}>
              <Route index element={<Navigate to="/warehouse/inventory" replace />} />
              <Route path="inventory" element={<WarehouseInventory />} />
              <Route path="orders" element={<WarehouseOrders />} />
              <Route path="reports" element={<AdminReports />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  )
}

export default App
