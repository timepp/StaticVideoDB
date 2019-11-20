// param: play:VIDEO_NAME@TIME_OFFSET
// examples:
//   play:风声@22:00
//   play:月光宝盒
// the video name is not required to be full name, part name is OK.
// requires everything to work properly.

var fso = new ActiveXObject("Scripting.FileSystemObject");

function play(path, offset) {
    var shell = new ActiveXObject("WScript.Shell");
    var value = offset + "=" + path;

    try {
        shell.RegDelete("HKEY_CURRENT_USER\\SOFTWARE\\Daum\\PotPlayerMini64\\RememberFiles\\");
    } catch (e) {}
    
    shell.RegWrite("HKEY_CURRENT_USER\\SOFTWARE\\Daum\\PotPlayerMini64\\RememberFiles\\0", value);
    shell.RegWrite("HKEY_CURRENT_USER\\SOFTWARE\\Daum\\PotPlayerMini64\\Settings\\RememberPosition", 1);
        
    var shellapp = new ActiveXObject("Shell.Application");
    shellapp.ShellExecute(path);
}

// filter: regex for match file or dir
// depth: 1 for immediately children, 0 for fully recursive
// returns:
// [ subdir1\, subdir1\file1, subdir1\file2, subdir1\subdir2\, subdir1\subdir2\file3, subdir3\file5, file6, ...]
function glob(dir, filter, depth, arr, subdir) {
    if (!arr) arr = [];
    if (!subdir) subdir = "";
    if (depth == undefined) depth = 0;
    depth--;
    var d = fso.GetFolder(subdir ? dir + "\\" + subdir : dir);
    for (var fc = new Enumerator(d.files); !fc.atEnd(); fc.moveNext()) {
        var f = fc.item();
        if (!filter || filter.test(f.Name)) {
            arr.push(subdir + (subdir? "\\" : "") + f.Name);
        }
    }
    for (var fc = new Enumerator(d.SubFolders); !fc.atEnd(); fc.moveNext()) {
        var f = fc.item();
        if (!filter || filter.test(f.Name)) {
            arr.push(subdir + (subdir? "\\" : "") + f.Name + "\\");
        }
        if (depth != 0) {
            glob(dir, filter, depth, arr, subdir + (subdir? "\\" : "") + f.Name);
        }
    }
    return arr;
}

function findMediaUsingEverything(keyword) {
    var cmd = "es.exe \"MATCHER\"".replace("MATCHER", keyword);
    //WScript.Echo(cmd);
    var content = RunCommandAndGetResult(cmd).output;
    var paths = content.split(/\r?\n/);
    var videofilepattern = /.*\.(avi|mp4|rmvb|mkv|wmv|mpg)$/;
    for (var i in paths) {
        var path = paths[i];
        if (path.match(videofilepattern)) return path;
    }
    return null;
}

function findMedia(itemid) {
    itemid = decodeURIComponent(itemid);
    var itemidprefix = itemid.split(" ")[0];
    var path = null;

    if (path == null) path = findMediaInMediaFolder(itemid);
    if (path == null) path = findMediaInMediaFolder(itemidprefix);
//    if (path == null) path = findMediaUsingEverything(itemid);
//    if (path == null) path = findMediaUsingEverything(itemidprefix);

    if (path == null) throw { message: "cannot find video file for [" + itemid + "]\n" };
    return path;
}

function findMediaInMediaFolder(itemid) {
    var dirs = mediaDirs();
    var filter = new RegExp(itemid + ".*\.(avi|mp4|rmvb|mkv|wmv|mpg)$", "i");
    for (var i in dirs) {
        var dir = dirs[i];
        var files = glob(dir, filter, 2);
        if (files.length > 0) return dir + "\\" + files[0];
    }
    return null;
}

function mediaDirs() {
    var shell = new ActiveXObject("WScript.Shell");
    var suffix = ":\\" + shell.ExpandEnvironmentStrings("%mediafolder%");
    var dirs = [];
    for (var i = 65; i < 90; i++) {
        var dir = String.fromCharCode(i) + suffix;
        if (fso.FolderExists(dir)) {
            dirs.push(dir);
        }
    }
    return dirs;
}

// time to milleseconds
function parseTime(timestr) {
    var arr = timestr.split(":");
    var ms = 0;
    for (var i in arr) {
        ms = ms * 60 + parseInt(arr[i]);
    }
    return ms * 1000;
}

function RunCommandAndGetResult(cmdline, of, ef) {
    var shell = new ActiveXObject("WScript.Shell");

    var outfile = of ? of : shell.ExpandEnvironmentStrings("%temp%") + "\\" + fso.GetTempName();
    var errfile = ef ? ef : shell.ExpandEnvironmentStrings("%temp%") + "\\" + fso.GetTempName();

    try {
        fso.DeleteFile(outfile);
        fso.DeleteFile(errfile);
    } catch (e) { }

    cmdline = "cmd.exe /C " + "chcp 65001 && " + cmdline + ' > "OUT" 2> "ERR"'.replace("OUT", outfile).replace("ERR", errfile);
    shell.Run(cmdline, 0, true);
    var ret = {
        output: ReadTextFile(outfile, "utf-8"),
        errors: ReadTextFile(errfile, "utf-8")
    };

    try {
        if (!of) fso.DeleteFile(outfile);
        if (!ef) fso.DeleteFile(errfile);
    } catch (e) {}

    return ret;
}

function ReadTextFileSimple(filename) {
    var content = "";
    try {
        var ofile = fso.OpenTextFile(filename, 1);
        content = ofile.ReadAll();
        ofile.Close();
    }
    catch (e) {
        //alert(e.message);
    }
    return content;
}

function ReadTextFile (path, encoding) {
    var stream = new ActiveXObject('ADODB.Stream');
    stream.Type = 2;
    stream.Mode = 3;
    if (encoding) stream.Charset = encoding;
    stream.Open();
    stream.Position = 0;

    stream.LoadFromFile(path);
    var size = stream.Size;
    var text = stream.ReadText();

    stream.Close();

    return text;
}

function main() {
    var shellapp = new ActiveXObject("Shell.Application");
    var arg = WScript.Arguments(0);
    //WScript.Echo(arg);
    var regex = /^play:([^@]+)(@(.*))?$/;
    var result = regex.exec(arg);
    if (!result) {
        WScript.Echo("invalid format string");
        return;
    }

    var itemid = result[1];
    var timestr = result[3];
    if (!timestr) timestr = "0";
    var ms = parseTime(timestr);

    var mediaPath = findMedia(itemid);

    play(mediaPath, ms);
}

try {
    main();
} catch (e) {
    WScript.Echo(e.message);
}
