const Role = require('../models/Role');

function toInt(v, def) {
  const n = parseInt(v, 10);
  return Number.isNaN(n) || n <= 0 ? def : n;
}

module.exports = {
  async getAllRoles({ name, includeDeleted, page, limit } = {}) {
    const query = {};
    if (!includeDeleted || includeDeleted === 'false') query.isDelete = false;
    if (name) query.name = { $regex: String(name), $options: 'i' };

    const hasPaging = page || limit;
    if (hasPaging) {
      const p = toInt(page, 1);
      const l = toInt(limit, 10);
      const [items, total] = await Promise.all([
        Role.find(query).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean({ getters: true }),
        Role.countDocuments(query),
      ]);
      return { items, total, page: p, limit: l, pages: Math.ceil(total / l) };
    }

    return Role.find(query).sort({ createdAt: -1 }).lean({ getters: true });
  },
};
