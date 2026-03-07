// Backend/routes/products.js — public product listing + product reviews
import express from 'express';
import { verifySupabaseToken } from '../middleware/supabaseAuth.js';
import { listPublicProducts, getOnePublicProduct } from '../controllers/productsController.js';
import {
  listProductReviews,
  createProductReview,
  deleteProductReview,
} from '../controllers/productReviewsController.js';

const router = express.Router();
router.get('/', listPublicProducts);
// More specific routes first (before /:id)
router.get('/:id/reviews', listProductReviews);
router.post('/:id/reviews', verifySupabaseToken, createProductReview);
router.delete('/:id/reviews/:reviewId', verifySupabaseToken, deleteProductReview);
router.get('/:id', getOnePublicProduct);
export default router;
