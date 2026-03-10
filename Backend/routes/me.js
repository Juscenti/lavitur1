// Backend/routes/me.js — authenticated user profile + wishlist
import express from 'express';
import { verifySupabaseToken } from '../middleware/supabaseAuth.js';
import { getMe, updateMe } from '../controllers/meController.js';
import {
  getWishlist,
  addWishlistItem,
  removeWishlistByProduct,
  removeWishlistById,
} from '../controllers/meWishlistController.js';
import {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
} from '../controllers/meCartController.js';
import { createOrder, listMyOrders } from '../controllers/meOrdersController.js';
import { listMyActivity } from '../controllers/meActivityController.js';
import {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../controllers/meAddressesController.js';

const router = express.Router();
router.use(verifySupabaseToken);

// Profile
router.get('/', getMe);
router.patch('/', updateMe);

// Wishlist (more specific routes first)
router.get('/wishlist', getWishlist);
router.post('/wishlist', addWishlistItem);
router.delete('/wishlist/product/:productId', removeWishlistByProduct);
router.delete('/wishlist/:id', removeWishlistById);

// Cart
router.get('/cart', getCart);
router.post('/cart', addCartItem);
router.patch('/cart/:id', updateCartItem);
router.delete('/cart/:id', removeCartItem);

// Orders
router.get('/orders', listMyOrders);
router.post('/orders', createOrder);

// Activity
router.get('/activity', listMyActivity);

// Addresses (saved for checkout)
router.get('/addresses', listAddresses);
router.post('/addresses', createAddress);
router.patch('/addresses/:id', updateAddress);
router.delete('/addresses/:id', deleteAddress);
router.patch('/addresses/:id/default', setDefaultAddress);

export default router;
