const mongoose = require('mongoose');

const scenarioSchema = new mongoose.Schema({
  scenarioId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  severity: { type: String, enum: ['SEV-1', 'SEV-2', 'SEV-3'], default: 'SEV-2' },
  estimatedMinutes: { type: Number, default: 15 },
  tags: [String],
  symptoms: [String],
  affectedServices: [String],
  learningObjectives: [String],
  hints: [
    {
      level: { type: Number, default: 1 },
      title: { type: String, required: true },
      content: { type: String, required: true },
    },
  ],
  active: { type: Boolean, default: true },
  definition: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Scenario', scenarioSchema);
