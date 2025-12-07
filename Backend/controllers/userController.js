import { userDB } from '../data/users.js';

export const registerUser = (req, res) => {
  const { fullName, username, email, password } = req.body;

  // Optional: validate input

  const newUser = {
    id: 'u' + Math.floor(1000 + Math.random() * 9000),
    fullName,
    username,
    email,
    role: 'customer',
    status: 'active',
    createdAt: new Date().toISOString()
  };

  userDB.push(newUser);

  res.status(201).json({ message: 'Registration successful', user: newUser });
};
