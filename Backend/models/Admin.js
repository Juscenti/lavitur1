// backend/models/Admin.js
import bcrypt from 'bcryptjs';

const passwordHash = bcrypt.hashSync('@dm1nL0g1n', 10);

export const admins = [
  {
    id: 'lavitur_admin_001',
    username: 'Juscent1theAdm1n', // no dot
    email: 'admin@lavitur.com',
    passwordHash
  }
];
