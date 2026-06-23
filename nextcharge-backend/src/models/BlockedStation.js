const mongoose = require('mongoose');

const blockedStationSchema = new mongoose.Schema({
  stationId: { type: String, required: true, unique: true },
  blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: String
}, { timestamps: true });

module.exports = mongoose.model('BlockedStation', blockedStationSchema);
