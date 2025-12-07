
import bcrypt from 'bcryptjs';

export const userDB = [
  {
    id: 'u003',
    fullName: 'Juscent Lavitur',
    username: 'Juscent1theAdm1n',
    email: 'admin@lavitur.com',
    role: 'admin',
    status: 'active',
    createdAt: '2025-03-01',
    passwordHash: bcrypt.hashSync('@dm1nL0g1n', 10) // ✅ Must be exactly this
  },
  {
    id: 'u001',
    fullName: 'Marissa Blake',
    username: 'mariblake',
    email: 'marissa@lavitur.com',
    role: 'customer',
    createdAt: '2025-04-01',
    status: 'active'
  },
  {
    id: 'u002',
    fullName: 'Theo Mendez',
    username: 'theom',
    email: 'theo@lavitur.com',
    role: 'customer',
    createdAt: '2025-04-03',
    status: 'suspended'
  },
];
