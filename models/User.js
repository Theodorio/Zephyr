// Import the mongoose library
const mongoose = require('mongoose');

// Define the schema for a Task
const taskSchema = new mongoose.Schema({
  // Title of the task (e.g. "Retweet this post")
  title: String,

  // Description of the task (e.g. "Retweet the tweet and tag 3 friends")
  description: String,

  // Frequency of the task (e.g. "daily", "weekly")
  frequency: String,

  // Status of the task (e.g. "pending", "completed")
  status: String,

  // Type of airdrop (e.g. "Twitter", "Discord", "On-chain")
  airdropType: String,

  // Amount of funding or reward associated with the task
  fundingAmount: Number,

  // Hour (0–23) for when to send a reminder
  reminderHour: {
    type: Number,
    min: 0,   // Minimum hour (0 = 12 AM)
    max: 23,  // Maximum hour (11 PM)
    required: true // Must be provided
  },

  // Minute (0–59) for the reminder time
  reminderMinute: {
    type: Number,
    min: 0,   // Minimum minute
    max: 59,  // Maximum minute
    required: true // Must be provided
  }
}, {
  // Adds createdAt and updatedAt timestamps automatically
  timestamps: true
});

// Export the model named 'Task', based on the 'Tasks' collection in MongoDB
module.exports = mongoose.model('Task', taskSchema, 'Tasks');