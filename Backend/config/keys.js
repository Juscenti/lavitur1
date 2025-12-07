// backend/config/keys.js

import dotenv from 'dotenv';
dotenv.config();

// backend/config/keys.js
export const JWT_SECRET = process.env.JWT_SECRET || 'change_me_dev_secret';
