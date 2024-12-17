const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize Sequelize with SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'database.sqlite',
});

// User Model
const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // Ensure usernames are unique
  },
  firstname: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastname: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'user', // Default role is "user"
  },
});

// Initialize Database and Create Default Admin User
const initializeDatabase = async () => {
  await sequelize.sync({ force: true }); // Recreate tables for development
  const hashedPassword = await bcrypt.hash('123456', 10);
  await User.create({
    username: 'haulmatic',
    firstname: 'John',
    lastname: 'Doe',
    password: hashedPassword,
    role: 'admin',
  });
};
initializeDatabase();

// Middleware for JWT Authentication
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, 'secretKey');
    req.user = decoded; // Attach decoded user info to request
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Middleware to Check Admin Role
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }
  next();
};

// Routes
// Login Route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ where: { username } });
  if (!user) return res.status(400).json({ message: 'User not found' });

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) return res.status(400).json({ message: 'Invalid password' });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    'secretKey',
    { expiresIn: '1h' }
  );

  res.json({ message: 'Login successful', token });
});

// Get All Users
app.get('/users', authenticate, async (req, res) => {
  const users = await User.findAll({ attributes: { exclude: ['password'] } }); // Exclude passwords
  res.json(users);
});

// Create New User (Admin Only)
app.post('/users', authenticate, isAdmin, async (req, res) => {
  const { username, firstname, lastname, password, role } = req.body;

  if (!username || !firstname || !lastname || !password) {
    return res.status(400).json({ message: 'Invalid data' });
  }

  const existingUser = await User.findOne({ where: { username } });
  if (existingUser) {
    return res.status(400).json({ message: 'Username already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await User.create({
    username,
    firstname,
    lastname,
    password: hashedPassword,
    role: role || 'user',
  });

  res.status(201).json({ id: newUser.id, username: newUser.username, role: newUser.role });
});

// Update User (Admin Only)
app.put('/users/:id', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { username, firstname, lastname, password, role } = req.body;

  const user = await User.findByPk(id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (username) user.username = username;
  if (firstname) user.firstname = firstname;
  if (lastname) user.lastname = lastname;
  if (password) user.password = await bcrypt.hash(password, 10);
  if (role) user.role = role;

  await user.save();
  res.json({ message: 'User updated successfully', user });
});

// Delete User (Admin Only)
app.delete('/users/:id', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;

  const user = await User.findByPk(id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (user.role === 'admin') {
    return res.status(403).json({ message: 'Cannot delete the default admin user' });
  }
  
  await user.destroy();
  res.json({ message: 'User deleted successfully' });
});

// Start the Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
