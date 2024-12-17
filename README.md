# Backend

This backend is a RESTful API built with **Node.js**, **Express**, and **Sequelize** for managing users in an application. The API supports basic authentication, user management, and administrative features, with **JWT (JSON Web Tokens)** used for secure authentication.

## Features:
- **User Authentication**: Users can log in with their username and password. The system generates a JWT token upon successful login, which is used for authenticating subsequent requests.
- **Role-Based Access Control**: The backend includes role-based access, with an **admin** role that has permission to create, update, and delete users, while regular users can only view their own data.
- **User Management**: The API allows the admin to:
  - **Create** new users.
  - **Update** user details such as username, password, and role.
  - **Delete** users, with restrictions to prevent deletion of the default admin user.
  - **List** all users, excluding sensitive information like passwords.
- **Database**: The backend uses **SQLite** as the database, with **Sequelize** as the ORM for interacting with the database. The `User` model includes fields for `username`, `firstname`, `lastname`, `password`, and `role`.

## Technologies Used:
- **Node.js** and **Express** for server-side logic and routing.
- **Sequelize** for database interaction (SQLite as the database).
- **JWT** for secure token-based authentication.
- **bcryptjs** for password hashing and verification.
- **CORS** and **body-parser** for handling cross-origin requests and parsing incoming request bodies.

## Endpoints:
- **POST /login**: Logs in a user and returns a JWT token.
- **GET /users**: Retrieves a list of all users (authenticated users only).
- **POST /users**: Creates a new user (admin only).
- **PUT /users/:id**: Updates a user (admin only).
- **DELETE /users/:id**: Deletes a user (admin only).
