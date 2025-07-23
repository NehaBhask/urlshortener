require('dotenv').config();
const bodyParser = require('body-parser');
const dns = require('dns');
const express = require('express');
const urlParser = require('url');
const cors = require('cors');
const { error } = require('console');
const app = express();

mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser:true, useUnifiedTopology:true
})
const urlSchema = new mongoose.Schema({
  original_url: {type: String, required:true},
  short_url: Number
})
let Url = mongoose.model('Url', urlSchema)
app.use(bodyParser.urlencoded({extended:false}))
app.use(bodyParser.json());

const counterSchema = new mongoose.Schema({
  _id: String,
  sequence_value: Number
});
const Counter = mongoose.model('Counter', counterSchema);
app.get('/init-counter', async (req, res) => {
  try {
    const exists = await Counter.findById('url_count');
    if (exists) {
      return res.send('Counter already initialized');
    }

    await Counter.create({ _id: 'url_count', sequence_value: 0 });
    res.send('Counter initialized');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error initializing counter');
  }
});

async function getNextSequenceValue(sequenceName) {
  const counter = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { sequence_value: 1 } },
    { new: true, upsert: true }
  );
  return counter.sequence_value;
}
// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.post('/api/shorturl', async function(req, res) {
 const { url }=req.body
    const parsedurl = new URL(url);
    if (!parsedurl.protocol || !parsedurl.hostname){
      res.json({error:'invalid url'})
    }
    const findresult = await Url.findOne({original_url:url})
    if(!findresult){
        dns.lookup(parsedurl.hostname, async function(err,address){
            if(err){
              res.json({error:'invalid url'})
            }
            else{
               const existing = await Url.findOne({ original_url: url });
              if (existing) {
                return res.json({
                  original_url: existing.original_url,
                  short_url: existing.short_url
                });
              }

              // Create unique short URL
              const shortUrl = await getNextSequenceValue('url_count');

              const newUrl = new Url({
                original_url: url,
                short_url: shortUrl
              
            })
              await newUrl.save();
              return res.json({
                original_url: newUrl.original_url,
                short_url: newUrl.short_url
              });
              
            }
        })
    }
  else{
      res.json({
        original_url:findresult.original_url,
        short_url:findresult.short_url
      })
  }
});

app.get('/api/shorturl/:id?', async function(req,res){
  if(!req.params.id){
    res.json({error:'invalid url'})
  }
  else{
    const {id} = req.params
    const findresult = await Url.findOne({short_url:parseInt(id)})
    if(!findresult){
      res.json({error:'invalid url'})
    }
    else{
      res.redirect(findresult.original_url)
    }
  }
})

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
