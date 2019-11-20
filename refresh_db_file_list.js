var fso = new ActiveXObject("Scripting.FileSystemObject");
// filter: regex for match file or dir
// depth: 1 for immediately children, 0 for fully recursive
// returns:
// [ subdir1\, subdir1\file1, subdir1\file2, subdir1\subdir2\, subdir1\subdir2\file3, subdir3\file5, file6, ...]
function Glob(dir, filter, depth, arr, subdir) {
    if (!arr) arr = [];
    if (!subdir) subdir = "";
    if (depth == undefined) depth = 0;
    depth--;
    var searchingdir = subdir ? dir + "\\" + subdir : dir;
    var d = fso.GetFolder(searchingdir);
    for (var fc = new Enumerator(d.files); !fc.atEnd(); fc.moveNext()) {
        var f = fc.item();
        if (!filter || filter.test(f.Name)) {
            arr.push(subdir + "\\" + f.Name);
        }
    }
    for (var fc = new Enumerator(d.SubFolders); !fc.atEnd(); fc.moveNext()) {
        var f = fc.item();
        //if (!filter || filter.test(f.Name)) {
        if (true) {
            //arr.push(subdir + f.Name + "\\");
            if (depth != 0) {
                Glob(dir, filter, depth, arr, subdir + "\\" + f.Name);
            }
        }
    }
    return arr;
}

function WriteTextFile(text, path, encoding) {
    var stream = new ActiveXObject('ADODB.Stream');
    stream.Type = 2;
    stream.Mode = 3;
    if (encoding) stream.Charset = encoding;
    stream.Open();
    stream.Position = 0;
    stream.WriteText(text);
    stream.SaveToFile(path, 2);
    stream.Close();
}

function GetDir(path) {
    var dir = path.replace(/^(.*)[\\/][^\\/]+$/, "$1");
    if (dir == path) dir = ".";
    return dir;
}

function main() {
    var dir = ".";

/*
    if (WScript.Arguments.length > 0) {
        var arg = WScript.Arguments(0);
        var regex = /^tpvis:refresh\?url=file:\/\/\/(.*)\/[^/]+$/;
        var result = regex.exec(arg);
        if (!result) {
            WScript.Echo("refresh is not supported for " + arg);
            return;
        }
        dir = result[1].replace(/\//g, "\\");
    }
*/
    dir = GetDir(WScript.ScriptFullName);
    
    var files = Glob(dir, null, 0, [], "db");

    WriteTextFile(
        "filelist=`\n" + files.join("\n").replace(/\\/g, "/") + "`;",
        dir + "\\db\\filelist.js", 
        "utf-8");

    WScript.Echo("Refresh complete. Total " + files.length + " files.");
}

try {
    main();
} catch (e) {
    WScript.Echo(e.message);
}
