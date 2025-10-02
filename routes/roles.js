var express = require('express');
var router = express.Router();
var Role = require('../models/Role');

// Create Role
router.post('/', async function(req, res) {
  try {
    const { name, description } = req.body;
    const role = await Role.create({ name, description });
    res.status(201).json(role);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Role name must be unique' });
    }
    res.status(400).json({ message: err.message });
  }
});

// Get all Roles (filter by name contains), exclude soft-deleted by default
router.get('/', async function(req, res) {
  try {
    const { name, includeDeleted } = req.query;
    const query = {};
    if (!includeDeleted || includeDeleted === 'false') {
      query.isDelete = false;
    }
    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }
    const roles = await Role.find(query).sort({ createdAt: -1 });
    res.json(roles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Role by name
router.get('/by-name/:name', async function(req, res) {
  try {
    const role = await Role.findOne({ name: req.params.name });
    if (!role) return res.status(404).json({ message: 'Role not found' });
    res.json(role);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Role by id
router.get('/:id', async function(req, res) {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ message: 'Role not found' });
    res.json(role);
  } catch (err) {
    res.status(400).json({ message: 'Invalid id' });
  }
});

// Update Role
router.put('/:id', async function(req, res) {
  try {
    const { name, description, isDelete } = req.body;
    const role = await Role.findByIdAndUpdate(
      req.params.id,
      { $set: { name, description, isDelete } },
      { new: true, runValidators: true }
    );
    if (!role) return res.status(404).json({ message: 'Role not found' });
    res.json(role);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Role name must be unique' });
    }
    res.status(400).json({ message: err.message });
  }
});

// Soft delete Role
router.delete('/:id', async function(req, res) {
  try {
    const role = await Role.findByIdAndUpdate(
      req.params.id,
      { $set: { isDelete: true } },
      { new: true }
    );
    if (!role) return res.status(404).json({ message: 'Role not found' });
    res.json({ message: 'Role soft-deleted', role });
  } catch (err) {
    res.status(400).json({ message: 'Invalid id' });
  }
});

module.exports = router;
