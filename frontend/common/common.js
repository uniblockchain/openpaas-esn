define([
    '/api/config?cb=' + Math.random().toString(16).slice(2),
    '/customize/messages.js',
    '/bower_components/chainpad-crypto/crypto.js',
    '/bower_components/jquery/dist/jquery.min.js',
], function (Config, Messages, Crypto) {
/*  This file exposes functionality which is specific to Cryptpad, but not to
    any particular pad type. This includes functions for committing metadata
    about pads to your local storage for future use and improved usability.

    Additionally, there is some basic functionality for import/export.
*/
    var $ = window.jQuery;

    var common = {
        Messages: Messages,
    };

    var getWebsocketURL = common.getWebsocketURL = function () {
        if (!Config.websocketPath) { return Config.websocketURL; }
        var path = Config.websocketPath;
        if (/^ws{1,2}:\/\//.test(path)) { return path; }

        var protocol = window.location.protocol.replace(/http/, 'ws');
        var host = window.location.host;
        var url = protocol + '//' + host + path;

        return url;
    };

    var isArray = function (o) { return Object.prototype.toString.call(o) === '[object Array]'; };

    var hexToBase64 = common.hexToBase64 = function (hex) {
        var hexArray = hex
            .replace(/\r|\n/g, "")
            .replace(/([\da-fA-F]{2}) ?/g, "0x$1 ")
            .replace(/ +$/, "")
            .split(" ");
        var byteString = String.fromCharCode.apply(null, hexArray);
        return window.btoa(byteString).replace(/\//g, '-').slice(0,-2);
    };

    var base64ToHex = common.base64ToHex = function (b64String) {
        var hexArray = [];
        atob(b64String.replace(/-/g, '/')).split("").forEach(function(e){
            var h = e.charCodeAt(0).toString(16);
            if (h.length === 1) { h = "0"+h; }
            hexArray.push(h);
        });
        return hexArray.join("");
    };

    var parseHash = common.parseHash = function (hash) {
        var parsed = {};
        if (hash.slice(0,1) !== '/' && hash.length >= 56) {
            // Old hash
            parsed.channel = hash.slice(0, 32);
            parsed.key = hash.slice(32);
            parsed.version = 0;
            return parsed;
        }
        var hashArr = hash.split('/');
        if (hashArr[1] && hashArr[1] === '1') {
            parsed.version = 1;
            parsed.mode = hashArr[2];
            parsed.channel = hashArr[3];
            parsed.key = hashArr[4];
            parsed.present = hashArr[5] && hashArr[5] === 'present';
            return parsed;
        }
        return;
    };
    var getEditHashFromKeys = common.getEditHashFromKeys = function (chanKey, keys) {
        if (typeof keys === 'string') {
            return chanKey + keys;
        }
        return '/1/edit/' + hexToBase64(chanKey) + '/' + Crypto.b64RemoveSlashes(keys.editKeyStr);
    };
    var getHashFromKeys = common.getHashFromKeys = getEditHashFromKeys;

    var getSecrets = common.getSecrets = function () {
        var secret = {};
        if (!/#/.test(window.location.href)) {
            secret.keys = Crypto.createEditCryptor();
            secret.key = Crypto.createEditCryptor().editKeyStr;
        } else {
            var hash = window.location.hash.slice(1);
            if (hash.length === 0) {
                secret.keys = Crypto.createEditCryptor();
                secret.key = Crypto.createEditCryptor().editKeyStr;
                return secret;
            }
            // old hash system : #{hexChanKey}{cryptKey}
            // new hash system : #/{hashVersion}/{b64ChanKey}/{cryptKey}
            if (hash.slice(0,1) !== '/' && hash.length >= 56) {
                // Old hash
                secret.channel = hash.slice(0, 32);
                secret.key = hash.slice(32);
            }
            else {
                // New hash
                var hashArray = hash.split('/');
                if (hashArray.length < 4) {
                    common.alert("Unable to parse the key");
                    throw new Error("Unable to parse the key");
                }
                var version = hashArray[1];
                /*if (version === "1") {
                    secret.channel = base64ToHex(hashArray[2]);
                    secret.key = hashArray[3].replace(/-/g, '/');
                    if (secret.channel.length !== 32 || secret.key.length !== 24) {
                        common.alert("The channel key and/or the encryption key is invalid");
                        throw new Error("The channel key and/or the encryption key is invalid");
                    }
                }*/
                if (version === "1") {
                    var mode = hashArray[2];
                    if (mode === 'edit') {
                        secret.channel = base64ToHex(hashArray[3]);
                        var keys = Crypto.createEditCryptor(hashArray[4].replace(/-/g, '/'));
                        secret.keys = keys;
                        secret.key = keys.editKeyStr;
                        if (secret.channel.length !== 32 || secret.key.length !== 24) {
                            common.alert("The channel key and/or the encryption key is invalid");
                            throw new Error("The channel key and/or the encryption key is invalid");
                        }
                    }
                    else if (mode === 'view') {
                        secret.channel = base64ToHex(hashArray[3]);
                        secret.keys = Crypto.createViewCryptor(hashArray[4].replace(/-/g, '/'));
                        if (secret.channel.length !== 32) {
                            common.alert("The channel key is invalid");
                            throw new Error("The channel key is invalid");
                        }
                    }
                }
            }
        }
        return secret;
    };

    var replaceHash = common.replaceHash = function (hash) {
        if (window.history && window.history.replaceState) {
            if (!/^#/.test(hash)) { hash = '#' + hash; }
            return void window.history.replaceState({}, window.document.title, hash);
        }
        window.location.hash = hash;
    };

    var getHash = common.getHash = function () {
        return window.location.hash.slice(1);
    };

    var parsePadUrl = common.parsePadUrl = function (href) {
        var patt = /^https*:\/\/([^\/]*)\/(.*?)\//i;

        var ret = {};
        var hash = href.replace(patt, function (a, domain, type, hash) {
            ret.domain = domain;
            ret.type = type;
            return '';
        });
        ret.hash = hash.replace(/#/g, '');
        return ret;
    };

    Messages._applyTranslation();

    return common;
});
