// param: play:VIDEO_NAME@TIME_OFFSET
// examples:
//   play:风声@22:00
//   play:月光宝盒
// the video name is not required to be full name, part name is OK.
// requires everything to work properly.

function play(path, offset) {
    var shell = new ActiveXObject("WScript.Shell");
    var value = offset + "=" + path;
    try {
        shell.RegDelete("HKEY_CURRENT_USER\\SOFTWARE\\Daum\\PotPlayerMini64\\RememberFiles\\");
        shell.RegWrite("HKEY_CURRENT_USER\\SOFTWARE\\Daum\\PotPlayerMini64\\RememberFiles\\0", value);
    } catch (e) {
        
    }
    var shellapp = new ActiveXObject("Shell.Application");
    shellapp.ShellExecute(path);
}

function findMediaUsingEverything(keyword) {
    var cmd = "es.exe \"MATCHER\"".replace("MATCHER", keyword);
    var content = RunCommandAndGetResult(cmd).output;
    var paths = content.split(/\r?\n/);
    var videofilepattern = /.*\.(avi|mp4|rmvb|mkv|wmv|mpg)$/;
    for (var i in paths) {
        var path = paths[i];
        if (path.match(videofilepattern)) return path;
    }
    return "";
}

function findMedia(itemid) {
    var fso = new ActiveXObject("Scripting.FileSystemObject");

    var path = findMediaUsingEverything(itemid);
    if (fso.FileExists(path)) {
        return path;
    }

    path = findMediaUsingEverything(decodeURIComponent(itemid));
    if (fso.FileExists(path)) {
        return path;
    }    

    var dir = mediaRoot();
    var exts = ["mp4", "mkv", "wmv", "avi"];
    var tried_paths = [];
    for (var i in exts) {
        var path = dir + "\\" + itemid + "." + exts[i];
        tried_paths.push(path);
        if (fso.FileExists(path)) {
            return path;
        }
    }

    throw { message: "cannot find video file for [" + itemid + "]\n" };
}

function mediaRoot() {
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    var suffix = ":\\" + shell.ExpandEnvironmentStrings("%mediafolder%");
    for (var i = 65; i < 90; i++) {
        var dir = String.fromCharCode(i) + suffix;
        if (fso.FolderExists(dir)) {
            return dir;
        }
    }
    return "";
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
    var fso = new ActiveXObject("Scripting.FileSystemObject");

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
    var fso = new ActiveXObject("Scripting.FileSystemObject");

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
