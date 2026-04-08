import { Navigate, Route, Routes } from 'react-router-dom'
import { GuestOnly, RequireRole } from '../components/auth/RouteGuards'
import CustomerLayout from '../layouts/CustomerLayout'
import AdminLayout from '../layouts/AdminLayout'
import WarehouseLayout from '../layouts/WarehouseLayout'

import Home from '../pages/customer/Home'
import Product from '../pages/customer/Product'
import Cart from '../pages/customer/Cart'
import Checkout from '../pages/customer/Checkout'
import OrderTracking from '../pages/customer/OrderTracking'
import Community from '../pages/customer/Community'
import Login from '../pages/customer/Login'
import Register from '../pages/customer/Register'
import Unauthorized from '../pages/Unauthorized'

import AdminDashboard from '../pages/admin/Dashboard'
import AdminUsers from '../pages/admin/Users'
import AdminAIConfig from '../pages/admin/AIConfig'
import AdminReports from '../pages/admin/Reports'

import WarehouseInventory from '../pages/warehouse/Inventory'
import WarehouseOrders from '../pages/warehouse/Orders'
import WarehouseUploadProduct from '../pages/warehouse/UploadProduct'

export default function AppRoutes() {
	return (
		<Routes>
			<Route path="/unauthorized" element={<Unauthorized />} />

			<Route element={<CustomerLayout />}>
				<Route path="/" element={<Home />} />
				<Route path="/product/:id" element={<Product />} />
				<Route path="/cart" element={<RequireRole roles={[ 'customer' ]}><Cart /></RequireRole>} />
				<Route path="/checkout" element={<RequireRole roles={[ 'customer' ]}><Checkout /></RequireRole>} />
				<Route path="/orders" element={<RequireRole roles={[ 'customer' ]}><OrderTracking /></RequireRole>} />
				<Route path="/community" element={<Community />} />
				<Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
				<Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
			</Route>

			<Route path="/admin" element={<RequireRole roles={[ 'admin' ]}><AdminLayout /></RequireRole>}>
				<Route index element={<Navigate to="/admin/dashboard" replace />} />
				<Route path="dashboard" element={<AdminDashboard />} />
				<Route path="users" element={<AdminUsers />} />
				<Route path="ai-config" element={<AdminAIConfig />} />
				<Route path="reports" element={<AdminReports />} />
			</Route>

			<Route path="/warehouse" element={<RequireRole roles={[ 'warehouse' ]}><WarehouseLayout /></RequireRole>}>
				<Route index element={<Navigate to="/warehouse/inventory" replace />} />
				<Route path="inventory" element={<WarehouseInventory />} />
				<Route path="upload" element={<WarehouseUploadProduct />} />
				<Route path="orders" element={<WarehouseOrders />} />
				<Route path="reports" element={<AdminReports />} />
			</Route>
		</Routes>
	)
}
