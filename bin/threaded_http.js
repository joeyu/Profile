var fs = require('fs');
var util = require('util');
var url = require('url');
var http = require('http');

function multiThreadedHttpGet(srcUrl, destPath, nThreads, callback) {
    //console.log("[DEBUG] srcUrl: %s, destPath: %s, nThreads: %d", srcUrl, destPath, nThreads);
    var url = require('url');
    var urlObj = url.parse(srcUrl);

    var options = {
          hostname: urlObj.hostname,
          port:urlObj.port, 
          path: urlObj.path,
          method: 'HEAD'
    };

    http.request(options, function(res) {
        var i;
        //console.log('STATUS: ' + res.statusCode);
        //console.log('HEADERS: ' + util.inspect(res.headers, {colors: true}));
        if (res.statusCode != 200) {
            console.log("[ERROR] HTTP 'HEAD' error code: " + res.statusCode);
            exit(1);
        }
        if (res.headers['accept-ranges'] !== 'bytes') {
            console.log("[ERROR] HTTP partial 'GET' is not supported! " + util.inspect(res.headers, {colors: true}));
            exit(1);
        }
        var sizeFile = res.headers['content-length'];
        options.method = 'GET';

        var threads = [];
        for (i = 0; i < nThreads; i ++) {
            threads.push({bufs: [], size: 0, finised: false});
        }
        //console.log(threads);

        var start = 0;
        var step = sizeFile / nThreads;
        var last = sizeFile % nThreads;
        if (last) {
            step = parseInt(step) + 1;
        }
        i = 0;
        //console.log("fuck: %d, %d, %d", start, step, last);
        while (start + step <= sizeFile) {
            getPartialFile(i, start, start + step - 1);
            start += step;
            i ++;
        }
        if (last) {
            getPartialFile(i, start, sizeFile - 1);
        }

        (function timerCallback () {
            var size = 0;
            if (threads.every(function (e) {return e.finished;})) { // GOT all
                var bufs = threads.map(function (e) {
                    //console.log("[DEBUG] e.bufs.length: %d, e.size: %d", e.bufs.length, e.size);
                    var buf = Buffer.concat(e.bufs, e.size);
                    size += e.size;
                    return buf;
                });
                //console.log("[DEBUG] bufs.length: %d, size: %d", bufs.length, size);
                var bufFile = Buffer.concat(bufs, size);
                var fd = fs.createWriteStream(destPath);
                fd.write(bufFile);
                fd.end();
            }
            else {
                threads.forEach(function (e) {
                    size += e.size;
                });
                //console.log("threads size: %d", size);

                callback(destPath, size, nThreads);

                setTimeout(timerCallback, 3000);
            }
        })();

        function getPartialFile (i, start, end) {
            var req = http.request(options, function(res) {
                if (res.statusCode != 206) {
                    console.log("[ERROR] HTTP partial 'GET' failed! " + util.inspect(res.headers, {colors: true}));
                    exit(1);
                }
        console.log('HEADERS: ' + util.inspect(res.headers, {colors: true}));
                res.on('data', function (chunk) {
                    var t = threads[i];
                    t.bufs.push(chunk);
                    t.size += chunk.length; 
                    //console.log("chunk: size: %d", t.size);

                }).on('end', function() {
                    var t = threads[i];
                    t.finished = true;
                    nThreads --;
                    //console.log(t);
                });

            });
            req.setHeader('range', 'bytes=' + start + '-' + end);
            req.end();
        }
    }).on('error', function(e) {
        console.log("[ERROR] Problem with http 'HEAD' request: " + e.message);
    }).end();
    
}
