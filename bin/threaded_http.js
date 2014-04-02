var fs = require('fs');
var util = require('util');
var url = require('url');
var http = require('http');
var events = require('events');

modules.exports = threadedGet;

function threadedGet(srcUrl, destPath, nThreads, md5sum, callback) {
    return new ThreadedGetor(srcUrl, destPath, nThreads, md5sum, callback);
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

    var urlObj = url.parse(srcUrl);
    var options = {
          hostname: urlObj.hostname,
          port:urlObj.port, 
          path: urlObj.path,
          method: 'HEAD'
    };
    this.callback = callback;

    self = this;
    self.on('thread_data', function (i, chunk) {
        var t = self.threads[i];
        t.bufs.push(chunk);
        t.sizeGot += chunk.length; 
        self.sizeGot += chunk.length;
        //console.log("chunk: size: %d", t.size);
    }).on('thread_finished') {
        var t = self.threads[i];
        t.finished = true;
        self.nThreads --;

        if (areAllThreadsFinished()) {
            self.emit('all_threads_finished');
        }

        //console.log(t);
    }).on('all_threads_finished') {
        var bufs = self.threads.map(function (e) {
            var buf = Buffer.concat(e.bufs, e.sizeGot);
            return buf;
        });
        //console.log("[DEBUG] bufs.length: %d, size: %d", bufs.length, size);
        var bufFile = Buffer.concat(bufs, self.sizeGot);
        var fd = fs.createWriteStream(destPath);
        fd.write(bufFile);
        fd.end();
    });

    self.callback(self);

    http.request(options, function(res) {
        //console.log('STATUS: ' + res.statusCode);
        //console.log('HEADERS: ' + util.inspect(res.headers, {colors: true}));
        if (res.statusCode != 200) {
            console.log("[ERROR] HTTP 'HEAD' error code: " + res.statusCode);
            return res.statusCode;
        }
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
            getPartialFile(i, start, self.size - 1);
        }

        // Start
        function getPartialFile (i, start, end) {
            options.method = 'GET';
            var req = http.request(options, function(res) {
                if (res.statusCode != 206) {
                    console.log("[ERROR] HTTP partial 'GET' failed! " + util.inspect(res.headers, {colors: true}));
                    exit(1); 
                }
                // just send events
                res.on('data', function (chunk) {
                    self.emit('thread_data', i, chunk);
                }).on('end', function() {
                    self.emit('thead_finished', i);
                });
            });
            req.setHeader('range', 'bytes=' + start + '-' + end);
            req.end();
        }
        options.method = 'GET';
    }).on('error', function(e) {
        console.log("[ERROR] Problem with http 'HEAD' request: " + e.message);
    }).end();

    function areAllThreadsFinished() {
        return self.threads.every(function (e) {return e.finished;});
    }
}

util.inherit(ThreadedGetter, events.EventEmitter);


