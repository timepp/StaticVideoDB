var http = require('http');
var url = require('url');
var querystring = require('querystring');
var fs = require('fs');
var glob = require('glob');

var dbdir = process.argv[2];

var server = http.createServer();

server.on("request", function (request, res) {
    let req = url.parse(request.url);
    let path = decodeURI(req.pathname);

    let fspath = path;

    if (fspath === '/') fspath = "/vdb.html";

    if (path.startsWith("/db/")) {
        if (path === "/db/filelist.js") {
            glob(`/**/*`, {root:dbdir}, (err,files)=>{
                let f = files.map(a=>"db" + a.substr(dbdir.length).replace(/\\/g, "/"));
                let data = "filelist=`\n" + f.join("\n") + "`;";
                res.setHeader("Cache-Control", "max-age=864000");
                res.end(data);
                console.log(`${path} -> ${data.length}`);
            });
            return;
        } else {
            fspath = dbdir + fspath.substr(3);
            fspath = fspath.replace(/\//g, "\\");
        }
    } else {
        fspath = "." + fspath;
    }

    fs.readFile(`${fspath}`, function (err, data) {
        if (err) {
            res.statusCode = 404;
            res.end();
            console.error(`[404] ${path}`);
        } else {
            res.setHeader("Cache-Control", "max-age=864000");
            res.end(data);
            console.log(`${path} -> ${data.length}`);
        }
    });
});

server.listen(3000, function(){
    console.log("server is running");
});
