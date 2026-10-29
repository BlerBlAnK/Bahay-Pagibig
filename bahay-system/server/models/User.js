/**
 * users — Appendix H
 * role carries the Super Admin / Admin split the panel asked for (item 9).
 * Appendix H currently reads "Admin, Authorized Staff"; see DATA-DICTIONARY-NOTES.md.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['Super Admin', 'Admin'];

const userSchema = new mongoose.Schema({
  full_name:     { type: String, required: true, trim: true },
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true, select: false },
  position:      { type: String, trim: true },          // Operations Head, Social Worker, …
  role:          { type: String, enum: ROLES, default: 'Admin' },
  status:        { type: String, enum: ['Active', 'Disabled'], default: 'Active' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

userSchema.methods.setPassword = async function (plain) {
  this.password_hash = await bcrypt.hash(plain, 12);
};

userSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.password_hash);
};

userSchema.methods.toSafeJSON = function () {
  const { _id, full_name, email, position, role, status, created_at } = this;
  return { _id, full_name, email, position, role, status, created_at };
};

userSchema.statics.ROLES = ROLES;

module.exports = mongoose.model('User', userSchema, 'users');
