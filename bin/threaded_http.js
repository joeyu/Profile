var fs = require('fs');
var path = require('path');
var util = require('util');
var url = require('url');
var http = require('http');
var events = require('events');
var cp = require('child_process');

module.exports.threadedGet = threadedGet;

function threadedGet(srcUrl, destPath, nThreads, md5sum, callback) {
    return new ThreadedGetter(srcUrl, destPath, nThreads, md5sum, callback);
}

function ThreadedGetter(srcUrl, destPath, nThreads, md5sum, callback) {
    this.url = srcUrl;
    this.destPath = destPath;
    this.nThreads = nThreads;
    this.md5sum = md5sum;
    this.isThreadable = true; // does server support multi-threaded GET?
    this.size = 0; // file size
    this.sizeGot = 0; // file size got
    this.threads = []; 
    this.end = false;
    this.sendqueue = [];
    this.callback = callback;

    var self = this;
    self.on('_thread_data', function (i, chunk) {
        var t = self.threads[i];
        var sizeGot = chunk.length;
        t.bufs.push(chunk);
        t.sizeGot += sizeGot;
        self.sizeGot += sizeGot;
        //console.log("chunk: size: %d", t.size);
        self.emit('thread_data', i, chunk);
    }).on('_thread_error', function (i) {
        var t = self.threads[i];
        t.bufs = [];
        t.started = false; 
        t.finished = false;
        var sizeFlush = t.sizeGot;
        t.sizeGot = 0;
        self.emit('thread_error', i, sizeFlush);
    }).on('_thread_end', function (i) {
        var t = self.threads[i];
        t.finished = true;
        //self.nThreads --;
        if (areAllThreadsFinished()) {
            self.emit('_end');
        }
        self.emit('thread_end', i);
    }).on('_error', function (errCode) {
        self.threads.forEach(function (t) {
            t.bufs = [];
            t.started = false; 
            t.finished = false;
            t.sizeGot = 0;
        });
        var sizeFlush = self.sizeGot;
        self.sizeGot = 0;
        self.sendqueue.push({name: 'error', param1: errCode, param2: sizeFlush});
    }).on('_end', function () {
        var bufs = self.threads.map(function (e) {
            var buf = Buffer.concat(e.bufs, e.sizeGot);
            return buf;
        });
        //console.log("[DEBUG] bufs.length: %d, size: %d", bufs.length, size);
        var bufFile = Buffer.concat(bufs, self.sizeGot);
        var fd = fs.createWriteStream(destPath);
        fd.write(bufFile);
        fd.end();
        checkmd5sum(function (status) {
            if (status === 0) { 
                console.log("[INFO] File '%s' md5sum check succeeded", self.destPath);
                self.end = true;
                self.sendqueue.push({name: 'end'});
            }
            else {
                console.log("[ERROR] File '%s' md5sum check failed", self.destPath);
                self.emit('_error', -1);
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
    http.request(options, function(res) {
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
                http.request(options, function (res) {
                    get(res);
                }).on('error', function (e) {
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
            get(res);
        }

        function get (res) {
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
                        start: start,
                        end: start + step - 1,
                        bufs: [], 
                        sizeGot: 0, 
                        started: false,
                        finised: false
                    });
                start += step;
            }
            if (last) {
                self.threads.push(
                    {
                        start: start,
                        end: self.size - 1,
                        bufs: [], 
                        sizeGot: 0, 
                        started: false,
                        finised: false
                    });
            }
        }
    }).on('error', function(e) {
        console.log("[ERROR] Problem with http 'HEAD' request: " + e.message);
    }).end();

    (function () {
        var msg;
        var end = false;
        while (msg = self.sendqueue.shift()) {
            self.emit(msg.name, msg.param1, msg.param2);
        }
        if (!self.end) {
            for (var i = 0; i < self.threads.length; ++ i) {
                if (!self.threads[i].started) {
                    getPartialFile(i);
                }
            }
            setTimeout(arguments.callee, 1000);
        }

    })();

    function getPartialFile (i) {
        var urlObj = url.parse(self.url);
        var options = {
              hostname: urlObj.hostname,
              port:urlObj.port, 
              path: urlObj.path,
              method: 'GET'
        };
        var req = http.request(options, function(res) {
            if (res.statusCode != 206) {
                console.log("[ERROR] HTTP partial 'GET' failed! " + util.inspect(res.headers, {colors: true}));
                self.emit('_thread_error', i);
            }
            // just send events
            res.on('data', function (chunk) {
                self.emit('_thread_data', i, chunk);
            }).on('end', function() {
                self.emit('_thread_end', i);
            });
        });
        req.setHeader('range', 'bytes=' + self.threads[i].start + '-' + self.threads[i].end);
        req.on('error', function(e) {
            console.log("[ERROR] Problem with http 'GET' request: " + e.message);
            self.emit('_thread_error', i);
        }).end();

        self.threads[i].started = true;
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
                    //remove the bad one
                    if (fs.existsSync(self.destPath)) {
                        fs.unlink(self.destPath, function (err) {
                            if (err) console.log("[ERROR] " + err);
                        });
                    }
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


