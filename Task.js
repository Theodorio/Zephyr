const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: String,
  description: String,
  frequency: String,
  status: String,
  airdropType: String,
  fundingAmount: Number,
reminderHour: { type: Number, min: 0, max: 23, required: true },
  reminderMinute: { type: Number, min: 0, max: 59, required: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('Task', taskSchema, 'Tasks');
