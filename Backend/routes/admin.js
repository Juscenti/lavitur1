// Backend/routes/admin.js — admin-only routes (Supabase JWT + role check)
import express from 'express';
import multer from 'multer';
import { verifySupabaseToken, requireAdmin } from '../middleware/supabaseAuth.js';
import * as adminUsers from '../controllers/adminUsersController.js';
import * as adminOrders from '../controllers/adminOrdersController.js';
import * as adminDashboard from '../controllers/adminDashboardController.js';
import * as adminDiscounts from '../controllers/adminDiscountsController.js';
import * as adminContent from '../controllers/adminContentController.js';
import * as adminSupport from '../controllers/adminSupportController.js';
import * as adminAnalytics from '../controllers/adminAnalyticsController.js';
import * as adminLoyalty from '../controllers/adminLoyaltyController.js';
import * as adminRoles from '../controllers/adminRolesController.js';
import * as adminSecurity from '../controllers/adminSecurityController.js';
import * as adminSettings from '../controllers/adminSettingsController.js';
import * as adminDatabase from '../controllers/adminDatabaseController.js';
import * as adminPromotions from '../controllers/adminPromotionsController.js';
import {
  listAdminProducts,
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct,
  listProductMedia,
  uploadProductMedia,
  deleteProductMedia,
  reassignMediaColor,
  setPrimaryMedia,
  listColorVariants,
  createColorVariant,
  updateColorVariant,
  deleteColorVariant,
} from '../controllers/productsController.js';

const router = express.Router();

// All admin routes require valid Supabase token and admin/representative role
router.use(verifySupabaseToken);
router.use(requireAdmin);

// Users
router.get('/users', adminUsers.listUsers);
router.get('/users/:id', adminUsers.getUser);
router.patch('/users/:id/status', adminUsers.updateUserStatus);
router.patch('/users/:id/role', adminUsers.updateUserRole);

// Products
router.get('/products', listAdminProducts);
router.post('/products', createProduct);
router.patch('/products/:id', updateProduct);
router.patch('/products/:id/status', updateProductStatus);
router.delete('/products/:id', deleteProduct);

// Product media (multer memory storage for multipart)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
router.get('/products/:id/media', listProductMedia);
router.post('/products/:id/media', upload.array('files', 10), uploadProductMedia);
router.delete('/products/:id/media/:mediaId', deleteProductMedia);
router.patch('/products/:id/media/:mediaId/color', reassignMediaColor);
router.patch('/products/:id/media/:mediaId/primary', setPrimaryMedia);

// Colour variants
router.get('/products/:id/color-variants', listColorVariants);
router.post('/products/:id/color-variants', createColorVariant);
router.patch('/products/:id/color-variants/:variantId', updateColorVariant);
router.delete('/products/:id/color-variants/:variantId', deleteColorVariant);

// Orders
router.get('/orders', adminOrders.listOrders);
router.get('/orders/:id', adminOrders.getOrder);
router.patch('/orders/:id/status', adminOrders.updateOrderStatus);
router.delete('/orders/:id', adminOrders.deleteOrder);

// Dashboard
router.get('/dashboard', adminDashboard.getMetrics);

// Discounts
router.get('/discounts', adminDiscounts.listDiscounts);
router.post('/discounts', adminDiscounts.createDiscount);
router.patch('/discounts/:id/active', adminDiscounts.updateDiscountActive);

// Content
router.get('/content-blocks', adminContent.listContentBlocks);

// Support
router.get('/support/tickets', adminSupport.listTickets);

// Analytics
router.get('/analytics/overview', adminAnalytics.getOverview);

// Promotions (discount codes + ambassador performance)
router.get('/promotions/discount-codes', adminPromotions.listDiscountCodes);

// Loyalty
router.get('/loyalty/overview', adminLoyalty.getOverview);
router.get('/loyalty/tiers', adminLoyalty.getTiers);

// Roles
router.get('/roles/users', adminRoles.listRoleUsers);
router.get('/roles/matrix', adminRoles.getRoleMatrix);

// Security
router.get('/security/overview', adminSecurity.getOverview);
router.get('/security/events', adminSecurity.listLoginEvents);

// Settings
router.get('/settings', adminSettings.getSettings);
router.patch('/settings', adminSettings.updateSettings);

// Database tools
router.get('/database/health', adminDatabase.getHealth);
router.get('/database/jobs', adminDatabase.listJobs);
router.post('/database/jobs', adminDatabase.createJob);

export default router;
