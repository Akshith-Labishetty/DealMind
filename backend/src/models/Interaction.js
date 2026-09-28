import mongoose from 'mongoose';

const extractionSchema = new mongoose.Schema(
  {
    summary: { type: String, default: '' },
    facts: [{ type: String }],
    requirements: [{ type: String }],
    objections: [
      {
        subject: String,
        detail: String,
        status: { type: String, enum: ['unresolved', 'resolved'], default: 'unresolved' },
        stakeholder: String
      }
    ],
    stakeholders: [{ name: String, role: String }],
    competitors: [{ type: String }],
    commitments: [{ type: String }],
    outcomes: [{ type: String }],
    nextSteps: [{ text: String, due: String }],
    positiveSignals: [{ type: String }],
    riskFlags: [{ type: String }],
    newInformation: { type: Boolean, default: true }
  },
  { _id: false }
);

const interactionSchema = new mongoose.Schema(
  {
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', required: true, index: true },
    seq: { type: Number, default: 1 },
    date: { type: Date, required: true },
    type: {
      type: String,
      enum: ['Discovery', 'Technical', 'Security', 'Commercial', 'Follow-up', 'Call', 'Email', 'Workshop'],
      default: 'Call'
    },
    participants: [{ type: String }],
    notes: { type: String, required: true, trim: true },
    extraction: extractionSchema,
    memoryStored: { type: Boolean, default: false },
    memoryError: { type: String, default: '' },
    memoryIds: [{ type: String }]
  },
  { timestamps: true }
);

export const Interaction = mongoose.models.Interaction || mongoose.model('Interaction', interactionSchema);
