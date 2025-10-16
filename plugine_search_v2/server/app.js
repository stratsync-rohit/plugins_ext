require('dotenv').config();
const express = require('express');
const { fetch } = require('undici'); // npm i undici
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const SavedItem = require('./models/items_model');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS: allow specific origins (safer)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://my-dashboard.vercel.app',
  '*'
  // 'chrome-extension://<REAL_EXT_ID>'
];
app.use(cors({
  origin: function(origin, callback){
    // allow non-browser tools like curl (origin == undefined)
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    return callback(new Error('Not allowed by CORS'), false);
  }
}));

app.use(rateLimit({ windowMs: 60*1000, max: 60 }));

// Use env var for Mongo URI
mongoose.connect("mongodb+srv://rohitchoukiker:rohit%40123@cluster0.0bsze22.mongodb.net/test", { useNewUrlParser: true, useUnifiedTopology: true }) .then(() => console.log('Mongo connected')) .catch(err => console.error("Could not connect to MongoDB", err));

app.get('/api/search', async (req,res) => {
  try{
    const q = req.query.q;
    if(!q) return res.status(400).json({ error:'q required' });
    const start = req.query.start || 1;
    const key = process.env.GOOGLE_API_KEY;
    const cx = process.env.GOOGLE_CX;
    if(!key || !cx) return res.status(500).json({ error: 'Search API key not configured' });

    const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(q)}&start=${start}`;
    const r = await fetch(url);
    if (!r.ok) {
      const text = await r.text();
      console.error('Google API error', r.status, text);
      return res.status(502).json({ error: 'upstream search failed', details: text });
    }
    const json = await r.json();
    res.json(json);
  }catch(err){
    console.error(err);
    res.status(500).json({ error:'search failed' });
  }
});

app.get('/api/items', async (req,res) => {
  try {
    const items = await SavedItem.find().sort({ createdAt:-1 }).limit(1000);
    res.json(items);
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'failed to fetch items' });
  }
});

app.post('/api/items', async (req,res) => {
  try {
    const { title, url, snippet, tags } = req.body;
    const item = new SavedItem({ title, url, snippet, tags });
    await item.save();
    res.json(item);
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'failed to save item' });
  }
});

app.put('/api/items/:id', async (req,res) => {
  try {
    const item = await SavedItem.findByIdAndUpdate(req.params.id, req.body, { new:true });
    res.json(item);
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'failed to update item' });
  }
});

app.delete('/api/items/:id', async (req,res) => {
  try {
    await SavedItem.findByIdAndDelete(req.params.id);
    res.json({ success:true });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'failed to delete item' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=> console.log(`Server listening on http://localhost:${PORT}`));
