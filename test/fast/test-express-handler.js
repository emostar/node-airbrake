var express = require('express');
var app = express.createServer();
var common = require('../common');
var airbrake = require(common.dir.root).createClient(common.key);
var assert = require('assert');
var sinon = require('sinon');
var http = require('http');

sinon.spy(airbrake, 'notify');

app.error(airbrake.expressHandler());
app.listen(common.port);

app.get('/caught', function(req, res, next) {
  var err = new Error('i am caught!');
  next(err);
});

app.get('/uncaught', function(req, res, next) {
  // This actually gets handled by app.error() as well, express will catch
  // this one for us.
  var err = new Error('i am quasi uncaught!');
  throw err;
});

app.get('/caught-403', function(req, res, next) {
  var err = new Error('I am a 403 error');
  err.status = 403;
  next(err);
});

app.get('/caught-500', function(req, res, next) {
  var err = new Error('I am a 403 error');
  err.status = 500;
  next(err);
});


process.on('exit', function() {
  assert.equal(airbrake.notify.callCount, 4);
  process.exit();
});

http.request({port: common.port, path: '/caught'}, function() {
  assert.equal(airbrake.notify.callCount, 1);
  http.request({port: common.port, path: '/caught-403'}, function() {
    assert.equal(airbrake.notify.callCount, 1);
    http.request({port: common.port, path: '/caught-500'}, function() {
      assert.equal(airbrake.notify.callCount, 2);
      http.request({port: common.port, path: '/uncaught'}, function () {
        assert.equal(airbrake.notify.callCount, 3);
        throw new Error('I am really uncaught');
      }).end();
    }).end();
  }).end();
}).end();
