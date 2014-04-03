var fs = require('fs');
var util = require('util');
var url = require('url');
var http = require('http');
var events = require('events');

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
    this.callback = callback;

    self = this;
    self.on('_thread_data', function (i, chunk) {
        var t = self.threads[i];
        var sizeGot = chunk.length;
        t.bufs.push(chunk);
        t.sizeGot += sizeGot;
        self.sizeGot += sizeGot;
        //console.log("chunk: size: %d", t.size);
        self.emit('thread_data', i, chunk);
    }).on('_thread_end', function (i) {
        var t = self.threads[i];
        t.finished = true;
        self.nThreads --;
        if (areAllThreadsFinished()) {
            self.emit('_end');
        }
        //console.log(t);
        self.emit('thread_finished', i);
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
        self.end = true;
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
                console.log(["[INFO] Redirected to %s", self.url);
                var urlDirectObj = url.parse(self.url);
                var options = {
                      hostname: urlDirectObj.hostname,
                      port:urlDirectObj.port, 
                      path: urlDirectObj.path,
                      method: 'HEAD'
                }
                http.request(options, function (res) {
                    response(res);
                }).on('error', function (e) {
                    console.log("[ERROR] Problem with http 'GET' request: " + e.message);
                    return res.statusCode;
                }).end();
            }
            else {
                console.log("[ERROR] HTTP 'HEAD' error code: %d", res.statusCode);
                return res.statusCode;
            }
        }
        else {
            response(res);
        }

        function response (res) {
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
                        bufs: [], 
                        start: start,
                        end: start + step - 1,
                        sizeGot: 0, 
                        finised: false
                    });
                getPartialFile(i, start, start + step - 1);
                start += step;
            }
            if (last) {
                self.threads.push(
                    {
                        bufs: [], 
                        start: start,
                        end: self.size - 1,
                        sizeGot: 0, 
                        finised: false
                    });
                getPartialFile(i, start, self.size - 1);
            }

            // Start
            function getPartialFile (i, start, end) {
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
                        exit(1); 
                    }
                    // just send events
                    res.on('data', function (chunk) {
                        self.emit('_thread_data', i, chunk);
                    }).on('end', function() {
                        self.emit('_thread_end', i);
                    });
                });
                req.setHeader('range', 'bytes=' + start + '-' + end);
                req.on('error', function(e) {
                    console.log("[ERROR] Problem with http 'GET' request: " + e.message);
                }).end();
            }
        }
    }).on('error', function(e) {
        console.log("[ERROR] Problem with http 'HEAD' request: " + e.message);
    }).end();

    (function () {
        if (self.end) {
            self.emit('end');
        }
        else {
            setTimeout(arguments.callee, 1000);
        }
    })();

    function areAllThreadsFinished() {
        return self.threads.every(function (e) {return e.finished;});
    }
}

util.inherits(ThreadedGetter, events.EventEmitter);


