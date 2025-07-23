require('dotenv').config();
const bodyParser = require('body-parser');
const dns = require('dns');
const express = require('express');
const urlParser = require('url');
const cors = require('cors');
const { error } = require('console');
const app = express();

let idcount=1;
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
              const urlDoc = new Url({
                original_url:url,
                short_url:idcount
              })
              await urlDoc.save()
              idcount++
              res.json({
                original_url:url,
                short_url:idcount-1
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

app.get('/api/shorturl/:id', async function(req,res){
  const {id} = req.params
  const findresult = await Url.findOne({short_url:id})
  if(!findresult){
    res.json({error:'invalid url'})
  }
  else{
    res.redirect(findresult.original_url)
    res.json({
      original_url:findresult.original_url,
      short_url:findresult.short_url
    })
    res.end()
  }
})

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
