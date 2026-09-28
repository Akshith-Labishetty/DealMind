import mongoose from 'mongoose';

const objectionSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true },
    detail: { type: String, default: '' },
    status: { type: String, enum: ['unresolved', 'resolved'], default: 'unresolved' },
    stakeholder: { type: String, default: '' },
    raisedAt: { type: Date },
    source: { type: String, default: '' }
  },
  { _id: false }
);

const stakeholderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    role: { type: String, default: '' },
    notes: { type: String, default: '' }
  },
  { _id: false }
);

const nextStepSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    due: { type: String, default: '' },
    done: { type: Boolean, default: false },
    source: { type: String, default: '' }
  },
  { _id: false }
);

const riskSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    level: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    source: { type: String, default: '' }
  },
  { _id: false }
);

const dealSchema = new mongoose.Schema(
  {
    company: { type: String, required: true, trim: true },
    industry: { type: String, default: '' },
    contactName: { type: String, default: '' },
    contactRole: { type: String, default: '' },
    title: { type: String, default: 'Enterprise Software Platform' },
    plan: { type: String, default: 'Enterprise' },
    value: { type: Number, default: 0 },
    stage: {
      type: String,
      enum: ['Discovery', 'Technical Evaluation', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
      default: 'Discovery'
    },
    health: { type: String, enum: ['healthy', 'attention', 'risk'], default: 'healthy' },
    summary: { type: String, default: '' },
    bankId: { type: String, required: true, unique: true },
    requirements: [{ type: String }],
    objections: [objectionSchema],
    stakeholders: [stakeholderSchema],
    competitors: [{ type: String }],
    commitments: [{ type: String }],
    nextSteps: [nextStepSchema],
    risks: [riskSchema],
    nextMeetingAt: { type: Date, default: null },
    lastInteractionAt: { type: Date, default: null }
  },
  { timestamps: true }
);

dealSchema.index({ company: 'text', title: 'text' });

export const Deal = mongoose.models.Deal || mongoose.model('Deal', dealSchema);
