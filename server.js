/*
    globals require console
*/
var Express = require('express');
var Http = require('http');
var Https = require('https');
var Fs = require('fs');
var WebSocketServer = require('ws').Server;
var NetfluxSrv = require('./NetfluxWebsocketSrv');

var config = require('./config');
var websocketPort = config.websocketPort || config.httpPort;

// support multiple storage back ends
var Storage = require(config.storage||'./storage/file');

var app = Express();

var httpsOpts;

var setHeaders = (function () {
    if (typeof(config.httpHeaders) !== 'object') { return function () {}; }

    var headers = JSON.parse(JSON.stringify(config.httpHeaders));
    if (Object.keys(headers).length) {
        return function (res) {
            for (var header in headers) { res.setHeader(header, headers[header]); }
        };
    }
    return function () {};
}());

app.use(function (req, res, next) {
    setHeaders(res);
    next();
});

app.use(Express.static(__dirname + config.publicPath));

Fs.exists(__dirname + "/customize", function (e) {
    if (e) { return; }
    console.log("Cryptpad is customizable, see customize.dist/readme.md for details");
});

app.use("/customize", Express.static(__dirname + '/customize'));
app.use("/customize", Express.static(__dirname + '/customize.dist'));
app.use(/^\/[^\/]*$/, Express.static('customize'));
app.use(/^\/[^\/]*$/, Express.static('customize.dist'));

if (config.privKeyAndCertFiles) {
    var privKeyAndCerts = '';
    config.privKeyAndCertFiles.forEach(function (file) {
        privKeyAndCerts = privKeyAndCerts + Fs.readFileSync(file);
    });
    var array = privKeyAndCerts.split('\n-----BEGIN ');
    for (var i = 1; i < array.length; i++) { array[i] = '-----BEGIN ' + array[i]; }
    var privKey;
    for (var i = 0; i < array.length; i++) {
        if (array[i].indexOf('PRIVATE KEY-----\n') !== -1) {
            privKey = array[i];
            array.splice(i, 1);
            break;
        }
    }
    if (!privKey) { throw new Error("cannot find private key"); }
    httpsOpts = {
        cert: array.shift(),
        key: privKey,
        ca: array
    };
}

app.get('/api/config', function(req, res){
    var host = req.headers.host.replace(/\:[0-9]+/, '');
    res.setHeader('Content-Type', 'text/javascript');
    res.send('define(' + JSON.stringify({
        websocketPath: config.websocketPath,
        websocketURL:'ws' + ((httpsOpts) ? 's' : '') + '://' + host + ':' +
            websocketPort + '/cryptpad_websocket',
    }) + ');');
});

var httpServer = httpsOpts ? Https.createServer(httpsOpts, app) : Http.createServer(app);

httpServer.listen(config.httpPort,config.httpAddress,function(){
    console.log('[%s] listening on port %s', new Date().toISOString(), config.httpPort);
});

var wsConfig = { server: httpServer };
if (websocketPort !== config.httpPort) {
    console.log("setting up a new websocket server");
    wsConfig = { port: websocketPort};
}
var wsSrv = new WebSocketServer(wsConfig);
Storage.create(config, function (store) {
    NetfluxSrv.run(store, wsSrv, config);
});
