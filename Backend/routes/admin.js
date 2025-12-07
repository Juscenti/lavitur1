// backend/routes/admin.js
import express from 'express';
import {
  adminLogin,
  getAllUsers,
  getSingleUser,
  updateUserStatus,
  updateUserRole,
  getAllProducts,
} from '../controllers/adminController.js';

import { verifyAdminToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', adminLogin); // login route is public

// everything else is protected
router.use(verifyAdminToken);

router.get('/users', getAllUsers);
router.get('/users/:id', getSingleUser);
router.patch('/users/:id/status', updateUserStatus);
router.patch('/users/:id/role', updateUserRole);
router.get('/products', getAllProducts);

export default router;
