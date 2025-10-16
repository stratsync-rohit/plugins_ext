const mongoose = require('mongoose');
const saveSearch = new mongoose.Schema({
  title: String,
  url: { type: String, required: true },
  snippet: String,
  tags: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
saveSearch.pre('save', function(next){ this.updatedAt = Date.now(); next(); });
module.exports = mongoose.model('SavedItem', saveSearch);
