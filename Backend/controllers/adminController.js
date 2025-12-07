// backend/controllers/adminController.js

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWT_SECRET } from '../config/keys.js';
import { admins } from '../models/Admin.js'; // ✅ Only for admin login
import { userDB } from '../data/users.js';    // ✅ For customers/employees only

// ADMIN LOGIN
export const adminLogin = async (req, res) => {
  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail || !password) {
    return res.status(400).json({ message: 'Missing credentials' });
  }

  // Find admin by username OR email (case-insensitive)
  const needle = usernameOrEmail.toLowerCase();
  const admin = admins.find(
    a => a.username.toLowerCase() === needle || a.email.toLowerCase() === needle
  );

  if (!admin) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isMatch = await bcrypt.compare(password, admin.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: admin.id, role: 'admin', username: admin.username },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  return res.status(200).json({ token, role: 'admin' });
};

// 🔒 USER MANAGEMENT (non-admins)
export const getAllUsers = (req, res) => {
  res.status(200).json(userDB);
};

export const updateUserStatus = (req, res) => {
  const { id } = req.params;

  const user = userDB.find(u => u.id === id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.status = user.status === 'active' ? 'suspended' : 'active';
  res.status(200).json({ message: 'Status updated', user });
};

export const getSingleUser = (req, res) => {
  const { id } = req.params;

  const user = userDB.find(u => u.id === id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  res.status(200).json(user);
};

export const updateUserRole = (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  const validRoles = [
    'admin',
    'representative',
    'senior',
    'employee',
    'ambassador',
    'customer'
  ];

  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid role value' });
  }

  const user = userDB.find(u => u.id === id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (user.role === 'admin' && role !== 'admin') {
    return res.status(403).json({ message: 'Cannot demote Admin' });
  }

  user.role = role;
  res.status(200).json({ message: 'User role updated', user });
};

// PRODUCTS
let productDB = [
  {
    id: 'p001',
    name: 'Midnight Utility Jacket',
    price: 185,
    stock: 12,
    published: true,
    category: 'Outerwear'
  },
  {
    id: 'p002',
    name: 'Lavitúr Statement Tee',
    price: 65,
    stock: 0,
    published: false,
    category: 'Essentials'
  },
  {
    id: 'p003',
    name: 'Panther Denim Cargo',
    price: 120,
    stock: 6,
    published: true,
    category: 'Bottomwear'
  }
];

export const getAllProducts = (req, res) => {
  res.status(200).json(productDB);
};
