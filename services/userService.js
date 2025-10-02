const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = require('../models/User');
const Role = require('../models/Role');

// Small helpers
function toInt(v, def) {
  const n = parseInt(v, 10);
  return Number.isNaN(n) || n <= 0 ? def : n;
}

module.exports = {
  // Create a new user with hashed password and optional role
  async createUser(payload) {
    const {
      username,
      password,
      email,
      fullName = '',
      avatarUrl = '',
      role,
      status,
    } = payload || {};

    if (!username || !password || !email) {
      const err = new Error('username, password, and email are required');
      err.status = 400;
      throw err;
    }

    // Validate role if provided
    let roleId = undefined;
    if (role) {
      if (!mongoose.isValidObjectId(role)) {
        const err = new Error('Invalid role id');
        err.status = 400;
        throw err;
      }
      const roleDoc = await Role.findById(role);
      if (!roleDoc) {
        const err = new Error('Role not found');
        err.status = 404;
        throw err;
      }
      roleId = roleDoc._id;
    }

    const hashed = await bcrypt.hash(String(password), 10);

    try {
      const doc = await User.create({
        username: String(username).trim(),
        password: hashed,
        email: String(email).trim(),
        fullName,
        avatarUrl,
        role: roleId,
        status: typeof status === 'boolean' ? status : false,
      });
      // Return sanitized user (no password)
      const obj = doc.toObject();
      delete obj.password;
      return obj;
    } catch (err) {
      if (err && err.code === 11000) {
        const dupField = Object.keys(err.keyPattern || {})[0] || 'field';
        const e = new Error(`${dupField} must be unique`);
        e.status = 409;
        throw e;
      }
      throw err;
    }
  },

  // Get users; if page/limit specified, return a page object, else return a plain array
  async getAllUsers({ page, limit, username, fullName } = {}) {
    const query = { isDelete: false };
    if (username) query.username = { $regex: String(username), $options: 'i' };
    if (fullName) query.fullName = { $regex: String(fullName), $options: 'i' };

    const hasPaging = page || limit;
    if (hasPaging) {
      const p = toInt(page, 1);
      const l = toInt(limit, 10);
      const [items, total] = await Promise.all([
        User.find(query)
          .populate('role', 'name')
          .sort({ createdAt: -1 })
          .skip((p - 1) * l)
          .limit(l)
          .lean({ getters: true }),
        User.countDocuments(query),
      ]);
      items.forEach((it) => delete it.password);
      return { items, total, page: p, limit: l, pages: Math.ceil(total / l) };
    }

    const list = await User.find(query)
      .populate('role', 'name')
      .sort({ createdAt: -1 })
      .lean({ getters: true });
    list.forEach((it) => delete it.password);
    return list;
  },

  async getUserByUsername(username) {
    if (!username) return null;
    const doc = await User.findOne({ username, isDelete: false })
      .populate('role', 'name')
      .lean({ getters: true });
    if (doc) delete doc.password;
    return doc;
  },

  async getUserById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await User.findById(id)
      .populate('role', 'name')
      .lean({ getters: true });
    if (doc) delete doc.password;
    return doc;
  },

  async updateUser(id, updates = {}) {
    if (!mongoose.isValidObjectId(id)) return null;

    const toSet = {};
    const allowed = ['fullName', 'avatarUrl', 'status', 'role', 'email', 'username', 'password'];
    for (const k of allowed) {
      if (updates[k] !== undefined) toSet[k] = updates[k];
    }

    // Handle role validation if provided
    if (toSet.role) {
      if (!mongoose.isValidObjectId(toSet.role)) {
        const err = new Error('Invalid role id');
        err.status = 400;
        throw err;
      }
      const roleDoc = await Role.findById(toSet.role);
      if (!roleDoc) {
        const err = new Error('Role not found');
        err.status = 404;
        throw err;
      }
      toSet.role = roleDoc._id;
    }

    // Hash password if provided
    if (toSet.password) {
      toSet.password = await bcrypt.hash(String(toSet.password), 10);
    }

    try {
      const doc = await User.findByIdAndUpdate(
        id,
        { $set: toSet },
        { new: true, runValidators: true }
      )
        .populate('role', 'name')
        .lean({ getters: true });
      if (doc) delete doc.password;
      return doc;
    } catch (err) {
      if (err && err.code === 11000) {
        const dupField = Object.keys(err.keyPattern || {})[0] || 'field';
        const e = new Error(`${dupField} must be unique`);
        e.status = 409;
        throw e;
      }
      throw err;
    }
  },

  async softDeleteUser(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await User.findByIdAndUpdate(
      id,
      { $set: { isDelete: true } },
      { new: true }
    )
      .populate('role', 'name')
      .lean({ getters: true });
    if (doc) delete doc.password;
    return doc;
  },

  async verifyUser({ email, username }) {
    if (!email || !username) return null;
    const doc = await User.findOneAndUpdate(
      { email, username, isDelete: false },
      { $set: { status: true } },
      { new: true }
    )
      .populate('role', 'name')
      .lean({ getters: true });
    if (doc) delete doc.password;
    return doc;
  },
};
