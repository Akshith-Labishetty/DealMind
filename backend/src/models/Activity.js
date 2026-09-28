import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', index: true },
    company: { type: String, default: '' },
    kind: {
      type: String,
      enum: ['deal', 'interaction', 'memory', 'agent', 'demo'],
      default: 'deal'
    },
    title: { type: String, required: true },
    detail: { type: String, default: '' },
    at: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const Activity = mongoose.models.Activity || mongoose.model('Activity', activitySchema);
