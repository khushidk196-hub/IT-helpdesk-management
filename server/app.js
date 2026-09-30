var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var app = express();
app.set('etag', false);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', function(req, res, next) {
  res.set('Cache-Control', 'no-store, private');
  next();
});

app.get('/api/health', function(req, res) {
  res.json({ status: 'ok', service: 'helpdesk-api' });
});

app.use('/api', require('./api'));

module.exports = app;
