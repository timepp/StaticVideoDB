var http = require('http');
var url = require('url');
var querystring = require('querystring');
var fs = require('fs');
var glob = require('glob');
var path = require('path');

var dbdir = process.argv[2];

var server = http.createServer();

server.on("request", function (request, res) {
    let req = url.parse(request.url);
    let reqpath = decodeURI(req.pathname);

    let fspath = reqpath;

    if (fspath === '/') fspath = "/vdb.html";

    if (reqpath.startsWith("/db/")) {
        if (reqpath === "/db/filelist.js") {
            glob(`/**/*`, {root:dbdir}, (err,files)=>{
                let f = files.map(a=>"db" + a.substr(dbdir.length).replace(/\\/g, "/"));
                let data = "filelist=`\n" + f.join("\n") + "`;";
                res.setHeader("Cache-Control", "max-age=864000");
                res.end(data);
                console.log(`${reqpath} -> ${data.length}`);
            });
            return;
        } else {
            fspath = dbdir + "/" + fspath.substr(3);
        }
    } else {
        fspath = "." + fspath;
    }

    fspath = path.normalize(fspath);

    fs.readFile(`${fspath}`, function (err, data) {
        if (err) {
            res.statusCode = 404;
            res.end();
            console.error(`[404] ${reqpath}(${fspath})`);
        } else {
            res.setHeader("Cache-Control", "max-age=864000");
            res.end(data);
            console.log(`${reqpath}(${fspath}) -> ${data.length}`);
        }
    });
});

server.listen(80, function(){
    console.log("server is running");
});
