const request = require('supertest');
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('./server'); // Adjust path if needed
const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:' }); // Use in-memory DB for tests

let adminToken, userToken;

// Mock User Model
const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  firstname: { type: DataTypes.STRING, allowNull: false },
  lastname: { type: DataTypes.STRING, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, defaultValue: 'user' },
});

beforeAll(async () => {
  // Sync in-memory DB and create test users
  await sequelize.sync({ force: true });

  const hashedAdminPassword = await bcrypt.hash('admin123', 10);
  const hashedUserPassword = await bcrypt.hash('user123', 10);

  // Create admin and non-admin users
  const admin = await User.create({
    username: 'admin',
    firstname: 'Admin',
    lastname: 'User',
    password: hashedAdminPassword,
    role: 'admin',
  });

  const user = await User.create({
    username: 'regularuser',
    firstname: 'Regular',
    lastname: 'User',
    password: hashedUserPassword,
    role: 'user',
  });

  // Generate JWT tokens
  adminToken = jwt.sign({ id: admin.id, username: admin.username, role: admin.role }, 'secretKey', { expiresIn: '1h' });
  userToken = jwt.sign({ id: user.id, username: user.username, role: user.role }, 'secretKey', { expiresIn: '1h' });
});


describe('Non-admin attempts to perform restricted actions', () => {
  test('Non-admin tries to create a user', async () => {
    const response = await request(app)
      .post('/users')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        username: 'newuser',
        firstname: 'New',
        lastname: 'User',
        password: 'newpassword',
        role: 'user',
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Access denied. Admins only.');
  });

  test('Non-admin tries to delete a user', async () => {
    const response = await request(app)
      .delete('/users/1')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Access denied. Admins only.');
  });

  test('Non-admin tries to update a user', async () => {
    const response = await request(app)
      .put('/users/1')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        firstname: 'Updated',
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Access denied. Admins only.');
  });
});

describe('admin login',()=>{
    
    test('Admin logs in successfully', async () => {
        const response = await request(app).post('/login').send({
          username: 'haulmatic',
          password: '123456',
        });
      
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Login successful');
        expect(response.body).toHaveProperty('token');
      });   
})


describe('Admin performs user management actions and non-admin login', () => {
    let adminToken, userToken, nonAdminUserId;
  
    beforeAll(async () => {
      // Login as admin
      const adminLogin = await request(app).post('/login').send({
        username: 'haulmatic',
        password: '123456',
      });
      adminToken = adminLogin.body.token;
  
      // Create a non-admin user and get their ID
      const createUserResponse = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'testuser',
          firstname: 'Test',
          lastname: 'User',
          password: 'user123',
        });
  
      nonAdminUserId = createUserResponse.body.id;
    });

    test('User logs in successfully', async () => {
        const response = await request(app).post('/login').send({
          username: 'testuser',
          password: 'user123',
        });
      
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Login successful');
        expect(response.body).toHaveProperty('token');
      });
  

    test('Admin updates a user', async () => {
      const response = await request(app)
        .put(`/users/${nonAdminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstname: 'UpdatedFirstName',
          lastname: 'UpdatedLastName',
        });
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User updated successfully');
      expect(response.body.user.firstname).toBe('UpdatedFirstName');
      expect(response.body.user.lastname).toBe('UpdatedLastName');
    });
  

    test('Admin deletes a non-admin user', async () => {
      const response = await request(app)
        .delete(`/users/${nonAdminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User deleted successfully');
    });
  });
