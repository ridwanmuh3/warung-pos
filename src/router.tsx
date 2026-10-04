import {
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { AppShell } from './components/AppShell'
import { MenuPage } from './pages/MenuPage'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { SuccessPage } from './pages/SuccessPage'
import { OrdersPage } from './pages/OrdersPage'
import { ReceiptPage } from './pages/ReceiptPage'
import { SummaryPage } from './pages/SummaryPage'
import { ProductsPage } from './pages/ProductsPage'
import { NotFoundPage } from './pages/NotFoundPage'

const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: NotFoundPage,
})

const menuRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: MenuPage,
})

const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/keranjang',
  component: CartPage,
})

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkout',
  component: CheckoutPage,
})

const successRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sukses/$orderId',
  component: SuccessPage,
})

const ordersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/riwayat',
  component: OrdersPage,
})

const receiptRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/riwayat/$orderId',
  component: ReceiptPage,
})

const summaryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ringkasan',
  component: SummaryPage,
})

const productsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/produk',
  component: ProductsPage,
})

const routeTree = rootRoute.addChildren([
  menuRoute,
  cartRoute,
  checkoutRoute,
  successRoute,
  ordersRoute,
  receiptRoute,
  summaryRoute,
  productsRoute,
])

export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFoundPage,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
