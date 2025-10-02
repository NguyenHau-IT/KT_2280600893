const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  isDelete: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Role', RoleSchema);
