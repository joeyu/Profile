var fs = require('fs');
var path = require('path');
var util = require('util');
var url = require('url');
var http = require('http');
var events = require('events');
var cp = require('child_process');

module.exports.threadedGet = threadedGet;

function threadedGet(srcUrl, destPath, nThreads, md5sum, retry, callback) {
    return new ThreadedGetter(srcUrl, destPath, nThreads, md5sum, retry, callback);
}

function ThreadedGetter(srcUrl, destPath, nThreads, md5sum, retry, callback) {
    this.url = srcUrl;
    this.destPath = destPath;
    this.nThreads = nThreads;
    this.nThreadsRemaining = nThreads;
    this.md5sum = md5sum;
    this.isThreadable = true; // does server support multi-threaded GET?
    this.size = 0; // file size
    this.sizeGot = 0; // file size got
    this.threads = []; 
    this.end = false;
    this.sendqueue = [];
    this.retry = retry;
    this.callback = callback;
    this.requestTimeout = 10000;

    var self = this;
    self.on('_thread_data', function (i, chunk) {
        var t = self.threads[i];
        var sizeGot = chunk.length;
        t.bufs.push(chunk);
        t.sizeGot += sizeGot;
        self.sizeGot += sizeGot;
        //console.log("chunk: size: %d", t.size);
        self.sendqueue.push(['thread_data', i, chunk]);
    }).on('_thread_error', function (i, errCode) {
        var t = self.threads[i];
        console.log("[ERROR] Thread %d: %s -- restarting the thread", i, errCode);
        if (errCode === 'E_REQUEST_SOCKET_TIMEOUT') {
            t.request.abort();
        }
        t.running = false; // to restart the thread
        self.sendqueue.push(['thread_error', i, errCode]);
    }).on('_thread_end', function (i) {
        var t = self.threads[i];
        t.finished = true;
        if (areAllThreadsFinished()) {
            self.emit('_download_finished');
        }
        self.nThreadsRemaining --;
        self.sendqueue.push(['thread_end', i]);
    }).on('_error', function (errCode) {
        if (errCode === 'E_MD5SUM') { //
            var sizeFlush = self.sizeGot;
            if (self.retry) {
                reset();
            }
            self.sendqueue.push(['error', errCode, sizeFlush]);
        }
    }).on('_download_finished', function () {
        var bufs = self.threads.map(function (e) {
            var buf = Buffer.concat(e.bufs, e.sizeGot);
            return buf;
        });
        var bufFile = Buffer.concat(bufs, self.sizeGot);
        var fd = fs.createWriteStream(destPath);
        fd.write(bufFile);
        fd.end();
        fd.on('finish', function () {
            if (self.md5sum) {
                checkmd5sum(function (status) {
                    if (status === 0) { 
                        console.log("[INFO] File '%s' md5sum check succeeded", self.destPath);
                        self.end = true;
                        self.sendqueue.push(['end']);
                    }
                    else {
                        console.log("[ERROR] File '%s' md5sum check failed", self.destPath);
                        self.emit('_error', 'E_MD5SUM');
                    }
                });
            }
        });
    });

    self.callback(self);

    var urlObj = url.parse(self.url);
    var options = {
          hostname: urlObj.hostname,
          port:urlObj.port, 
          path: urlObj.path,
          method: 'HEAD'
    };
    var req = http.request(options, function(res) {
        //console.log('STATUS: ' + res.statusCode);
        //console.log('HEADERS: ' + util.inspect(res.headers, {colors: true}));
        if (res.statusCode != 200) {
            if (res.statusCode == 302 || res.statusCode == 303) {
                self.url = res.headers['location'];
                console.log("[INFO] Redirected to %s", self.url);
                var urlDirectObj = url.parse(self.url);
                var options = {
                      hostname: urlDirectObj.hostname,
                      port:urlDirectObj.port, 
                      path: urlDirectObj.path,
                      method: 'HEAD'
                }
                var req = http.request(options, function (res) {
                    if (res.statusCode != 200) {
                        cosole.log("[ERROR] Failed to get directed url: %s", self.url);
                        return re.statusCode;
                    }
                    getPrepare(res);
                });
                req.setTimeout(self.requestTimeout, function () {
                    console.log("[ERROR] %s", 'E_REQUEST_SOCKET_TIMEOUT');
                });
                req.on('error', function (e) {
                    console.log("[ERROR] Problem with http 'HEAD' request: " + e.message);
                    return res.statusCode;
                }).end();
            }
            else {
                console.log("[ERROR] HTTP 'HEAD' error code: %d", res.statusCode);
                return res.statusCode;
            }
        }
        else {
            getPrepare(res);
        }

        // This function prepares for http.get, real http.get will be invoked by in the timer
        function getPrepare (res) {
            if (res.headers['accept-ranges'] !== 'bytes') {
                console.log("[WARNING] HTTP partial 'GET' is not supported! " + util.inspect(res.headers, {colors: true}));
                this.isThreadadle = false;
            }

            self.size  = res.headers['content-length'];

            // calculate the range for each thread 
            var start = 0;
            var step = self.size / self.nThreads;
            var last = self.size % self.nThreads;
            if (last) {
                step = parseInt(step) + 1;
            }
            
            for (var i = 0; start + step <= self.size; ++ i) {
                self.threads.push(
                    {
                        request: null,
                        start: start,
                        end: start + step - 1,
                        bufs: [], 
                        sizeGot: 0, 
                        running: false,
                        finised: false
                    });
                start += step;
            }
            if (last) {
                self.threads.push({
                    request: null,
                    start: start,
                    end: self.size - 1,
                    bufs: [], 
                    sizeGot: 0, 
                    running: false,
                    finised: false
                });
            }
        }
    });
    req.setTimeout(self.requestTimeout, function () {
        console.log("[ERROR] %s", 'E_REQUEST_SOCKET_TIMEOUT');
    });
    req.on('error', function(e) {
        console.log("[ERROR]  Problem with http 'HEAD' request: " + e.message);
    }).end();

    (function () {
        var msg;
        //process the message queue
        while (msg = self.sendqueue.shift()) {
            if (msg[0] === 'end') {
                self.sendqueue = [];
                break;
            }
            switch (msg.length) {
                case 1:
                    self.emit(msg[0]);
                    break;
                case 2:
                    self.emit(msg[0], msg[1]);
                    break;
                case 3:
                    self.emit(msg[0], msg[1], msg[2]);
                    break;
            }

        }
        if (!self.end) {
            for (var i = 0; i < self.threads.length; ++ i) {
                if (!self.threads[i].running) {
                    getPartialFile(i);
                }
            }
            setTimeout(arguments.callee, 1000);
        }
        //console.log("[DEBUG] nThreadsRemaining: %d", self.nThreadsRemaining);
    })();

    function reset () {
        self.threads.forEach(function (t) {
            t.bufs = [];
            t.running = false; 
            t.finished = false;
            t.sizeGot = 0;
        });
        self.nThreadsRemaining = self.nThreads;
        self.sizeGot = 0;
    }

    function getPartialFile (i) {
        var t = self.threads[i];
        var urlObj = url.parse(self.url);
        var options = {
              hostname: urlObj.hostname,
              port:urlObj.port, 
              path: urlObj.path,
              method: 'GET'
        };
        var req = http.request(options, function(res) {
            if (res.statusCode != 206) {
                self.emit('_thread_error', i, 'E_REQUEST_RANGE');
            }
            // just send events
            res.on('data', function (chunk) {
                self.emit('_thread_data', i, chunk);
            }).on('error', function(e) {
                console.log("[ERROR] fuck thread %d, err: %s", i, util.inspect(e));
                process.exit(1);
            }).on('close', function() {
                if (!t.finished) {
                    t.running = false; // to restart the thread
                    console.log("[ERROR] Thread %d, response closed abnormally", i);
                    process.exit(1);
                }
            }).on('end', function() {
                if (t.end == t.start + t.sizeGot -1) {
                    self.emit('_thread_end', i);
                }
                else {
                    t.running = false; // to restart the thread
                    console.log("[ERROR] Thread %d, response ended abnormally (%d)", i, t.sizeGot);
                    //process.exit(1);
                }
            }).setTimeout(self.requestTimeout, function() {
                console.log("[ERROR] The response of thread %d is timeout", i);
                process.exit(1);
            });
        });
        req.setHeader('range', 'bytes=' + (t.start + t.sizeGot) + '-' + t.end);
        req.setTimeout(self.requestTimeout, function () {
            self.emit('_thread_error', i, 'E_REQUEST_SOCKET_TIMEOUT');
        });
        req.on('close', function(e) {
            if (!t.finished) {
                console.log('[ERROR] Thread %d closed abnormally', i);
            }
        }).on('error', function(e) {
            self.emit('_thread_error', i, e.code);
        }).end();
        t.request = req;
        t.running = true;
    }

    function checkmd5sum (callback) {
        var md5File = self.md5sum + ' *' + path.basename(self.destPath);
        var procVerifyFiles = cp.spawn(
            'md5sum', 
            ['-c', '--status'], 
            {cwd: path.dirname(self.destPath), stdio: ['pipe', 'ignore', process.stderr]});
        procVerifyFiles.stdin.write(md5File);
        procVerifyFiles.stdin.end();
        procVerifyFiles.on('exit', function (code, signal) {
            if (!signal) { // program exits normally
                if (code) { // w/ error, re-download it
                    //process.exit(0);
                    //remove the bad one
                    //if (fs.existsSync(self.destPath)) {
                    //    fs.unlink(self.destPath, function (err) {
                    //        if (err) console.log("[ERROR] " + err);
                    //    });
                    //}
                    console.log('fuck: %s', md5File);
                    callback(-1);
                }
                else { // md5sum succeeded
                    callback(0);
                }
            }
        });
    }

    function areAllThreadsFinished() {
        return self.threads.every(function (e) {return e.finished;});
    }
}

util.inherits(ThreadedGetter, events.EventEmitter);

function humanReadableSize(bytes) {
   var s;

   if (bytes >= 1000000) {
       s = bytes / 1000000;
       s = s.toFixed(2) + 'MB';
   }
   else if (bytes >= 1000) {
       s = bytes / 1000;
       s = s.toFixed(2) + 'KB';
   }
   else if (bytes >= 1000) {
       s = bytes + 'B';
   }

   return s;
}

module.exports.hrs = humanReadableSize;

function percentage(a, b, dec) {
    return parseFloat(a * 100 / b).toFixed(dec);
}
module.exports.per = percentage;

function humanReadableTime(ms, units) {
    var s = ms / 1000;
        ms = ms % 1000;
    var m = s / 60;
        s = s % 60;
    var h = m / 60;
        m = m % 60;
    var d = h / 24;
        h = h / 24;
    var w = d / 7;
        d = d % 7;
    var txt = '';
    if (!units) {
        units = 6; // get all units;
    }
    if (w && units) {
        txt += w + 'Weeks';
        units --;
    }
    if (d && units) {
        txt += d + 'Days';
        units --;
    }
    if (h && units) {
        txt += h + 'Hours';
        units --;
    }
    if (m && units) {
        txt += m + 'Minutes';
        units --;
    }
    if (s && units) {
        txt += s + 'Seconds';
        units --;
    }
    if (ms && units) {
        txt += ms + 'MiliSeconds';
        units --;
    }
}
module.exports.hrt = humanReadableTime;

//Stopwatch
function StopWatch() {
    this.start = new Date();
}

StopWatch.prototype.stop = function (unit) {
    var delta = new Date() - this.start;
    if (unit === 'second') {
        return delta / 1000;
    }
    else {
        return delta;
    }
}
   
module.exports.StopWatch = StopWatch;

function Print () {
    this.line = '';
}

Print.prototype.lp = function () {
    var i;
    var args = [];
    for (i = 0; i < arguments.length; ++ i) {
        args.push('arguments[' + i + ']');
    }
    args = args.join(',');
    var newline = eval('util.format(' + args + ')');
    var backspaces = '';
    for (i = 0; i < this.line.length; ++ i) {
        backspaces += '\b';
    }
    util.print(backspaces + newline);
    this.line = newline;
}

var print = new Print();
module.exports.print = print;

   
