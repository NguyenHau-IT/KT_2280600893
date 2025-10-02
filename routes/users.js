const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const roleService = require('../services/roleService');

// Create User
router.post('/', async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    res.status(err.status || 400).json({ message: err.message || 'Create user failed' });
  }
});

// Get all Users with optional filters: username, fullName
router.get('/', async (req, res, next) => {
  try {
    const result = await userService.getAllUsers({
      page: req.query.page,
      limit: req.query.limit,
      username: req.query.username,
      fullName: req.query.fullName,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Fetch users failed' });
  }
});

// Get User by username
router.get('/by-username/:username', async (req, res, next) => {
  try {
    const user = await userService.getUserByUsername(req.params.username);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Fetch user failed' });
  }
});

// Get User by ID
router.get('/:id', async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Invalid id' });
  }
});

// Update User
router.put('/:id', async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(err.status || 400).json({ message: err.message || 'Update user failed' });
  }
});

// Soft delete User
router.delete('/:id', async (req, res, next) => {
  try {
    const user = await userService.softDeleteUser(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User soft-deleted', user });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Invalid id' });
  }
});

// Verify email + username to set status=true
router.post('/verify', async (req, res, next) => {
  try {
    const { email, username, userName } = req.body || {};
    const uname = username || userName;
    if (!email || !uname) {
      return res.status(400).json({ message: 'email and username are required' });
    }
    const user = await userService.verifyUser({ email, username: uname });
    if (!user) return res.status(404).json({ message: 'Invalid email or username' });
    res.json({ message: 'User verified', user });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Verify user failed' });
  }
});

// Alias to match frontend: /users/activate
router.post('/activate', async (req, res) => {
  try {
    const { email, username, userName } = req.body || {};
    const uname = username || userName;
    if (!email || !uname) {
      return res.status(400).json({ message: 'email and username are required' });
    }
    const user = await userService.verifyUser({ email, username: uname });
    if (!user) return res.status(404).json({ message: 'Invalid email or username' });
    res.json({ message: 'User verified', user });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Activate user failed' });
  }
});

module.exports = router;
// ---------------- UI ROUTES (EJS) ----------------

// List Users (UI)
router.get('/ui', async (req, res, next) => {
  try {
    const { username, fullName, page, limit } = req.query;
    const result = await userService.getAllUsers({ username, fullName, page, limit });
    res.render('users/list', {
      usersPage: result,
      filters: { username: username || '', fullName: fullName || '' },
      title: 'Users',
    });
  } catch (err) {
    next(err);
  }
});

// New User form
router.get('/ui/new', async (req, res, next) => {
  try {
    const roles = (await roleService.getAllRoles({ limit: 1000 })).items || [];
    res.render('users/form', { title: 'Create User', user: null, roles });
  } catch (err) {
    next(err);
  }
});

// Create User (UI submit)
router.post('/ui', async (req, res, next) => {
  try {
    await userService.createUser(req.body);
    res.redirect('/users/ui');
  } catch (err) {
    next(err);
  }
});

// Edit User form
router.get('/ui/:id/edit', async (req, res, next) => {
  try {
    const [user, rolesPage] = await Promise.all([
      userService.getUserById(req.params.id),
      roleService.getAllRoles({ limit: 1000 }),
    ]);
    if (!user) return res.status(404).render('error', { message: 'User not found', error: {} });
    res.render('users/form', { title: 'Edit User', user, roles: rolesPage.items || [] });
  } catch (err) {
    next(err);
  }
});

// Update User (UI submit)
router.post('/ui/:id', async (req, res, next) => {
  try {
    await userService.updateUser(req.params.id, req.body);
    res.redirect('/users/ui');
  } catch (err) {
    next(err);
  }
});

// Soft delete User (UI)
router.post('/ui/:id/delete', async (req, res, next) => {
  try {
    await userService.softDeleteUser(req.params.id);
    res.redirect('/users/ui');
  } catch (err) {
    next(err);
  }
});

// Verify User (UI)
router.post('/ui/verify', async (req, res, next) => {
  try {
    const { email, username } = req.body;
    await userService.verifyUser({ email, username });
    res.redirect('/users/ui');
  } catch (err) {
    next(err);
  }
});
