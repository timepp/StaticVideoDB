jQuery.fn.shuffleChildren = function(){
    var p = this[0];

    if (p.children.length > 0 && !("original_index" in p.children[0])) {
        for (var i = 0; i < p.children.length; i++) {
            p.children[i].original_index = i;
        }
    }

    for (var i = p.children.length; i > 0; i--) {
        p.appendChild(p.children[Math.random() * i | 0]);
    }
};

function swapElements(a, b) {
    if (a == b) return;
    var bp = b.parentNode, ap = a.parentNode;
    var an = a.nextElementSibling, bn = b.nextElementSibling;
    if (an == b) return bp.insertBefore(b, a);
    if (bn == a) return ap.insertBefore(a, b);
    if (a.contains(b))
        return ap.insertBefore(b, a), bp.insertBefore(a, bn);
    else
        return bp.insertBefore(a, b), ap.insertBefore(b, an);
};

jQuery.fn.unShuffleChildren = function() {
    var p = this[0];
    for (var i = 0; i < p.children.length; i++) {
        while (p.children[i].original_index != i) {
            var j = p.children[i].original_index;
            swapElements(p.children[i], p.children[j]);
        }
    }
};


// persistent settings
var defaultSettings = {
    videoscene: {
        main: {
            style: "table",
            coverViewColumnWidth: 320,
            coverViewRandom: true
        },
        artist: {
            style: "table",
            coverViewColumnWidth: 320,
            coverViewRandom: false
        },
        vendor: {
            style: "table",
            coverViewColumnWidth: 320,
            coverViewRandom: false
        },
        other: {
            style: "table",
            coverViewColumnWidth: 320,
            coverViewRandom: false
        }
    },
    tagfilter: [],
    showTagSelector: true
};

var settings = null;

$(function(){
    init();
});

function init() {

    // read parameters to `param` object from URI
    var param;
    (window.onpopstate = function () {
        var match,
            pl     = /\+/g,  // Regex for replacing addition symbol with a space
            search = /([^&=]+)=?([^&]*)/g,
            decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
            query  = window.location.search.substring(1);

        param = {};
        while (match = search.exec(query))
        param[decode(match[1])] = decode(match[2]);
    })();

    // vdb.html?artist=陈妍希
    // vdb.html?filter=战
    // vdb.html?id=
    // vdb.html?vendor=

    vdb = conformDatabase(vdb);
    conformArtistDB();
    loadSettings();

    if (param.artist) {
        $(document.body).append(createArtistPage(param.artist));
        document.title = param.artist;
        return;
    }

    if (param.id) {
        $(document.body).append(createMoviePage(param.id));
        document.title = param.id;
        return;
    }

    if (param.vendor) {
        $(document.body).append(createVendorPage(param.vendor));
        document.title = param.vendor;
        return;
    }

    if (param.filter) {
        $("#filter").val(param.filter);
    }

    $("#mainpage").show();
    
    initTagFilter();
    refreshView();

    $("#filter").on("change keyup paste", function() {
        refreshView();
    });


    settings.showTagSelector? $("#tagfilter").show() : $("#tagfilter").hide();
    $("#btn_tag").on("click", function(){
        settings.showTagSelector = !settings.showTagSelector;
        saveSettings();
        if (settings.showTagSelector) {
            $("#tagfilter").show();
            layoutTagFilters();
        } else {
            $("#tagfilter").hide();
        }
    });
}

function saveSetting(varName, val) {
    settings[varName] = val;
    saveSettings();
}

function saveSettings() {
    try {
        localStorage.vdbsetting = JSON.stringify(settings);
        // console.log(localStorage.vdbsetting);
    } catch (e) {}
}

function loadSettings() {
    try {
        var settingstr = localStorage.vdbsetting;
        if (settingstr) {
            settings = JSON.parse(settingstr);
            // merge new properties from defaultSettings to setting to support upgrade scenario
            for (var name in defaultSettings) {
                if (!(name in settings)) {
                    settings[name] = defaultSettings[name];
                }
            }
        } else {
            settings = defaultSettings;
        }
    } catch (e) {}
}

function getLink(key, value) {
    return "vdb.html?" + key + "=" + encodeURIComponent(value);
}

function getCoverFileName(v) {
    return imagedir + "/cover/" + getVideoFileID(v) + ".jpg";
}

function getPreviewFileName(v) {
    return imagedir + "/preview/" + getVideoFileID(v) + ".gif";
}

function getScreenShotFileName(v) {
    return imagedir + "/screenshot/" + getVideoFileID(v) + ".jpg";
}

function getPortraitFileName(v) {
    return imagedir + "/portrait/" + getVideoFileID(v) + ".jpg";
}

function getVideoFileID(v) {
    return v.id? v.id : v.title;
}

function getVideoDisplayName(v) {
    return v.title? v.title : v.id;
}

function getVideoFullDisplayName(v) {
    return (v.id? v.id + " " : "") + (v.title? v.title : "");
}

function getVideoVendor(v) {
    if (v.id) {
        var result = /^(..[^-]*?)(HD)?-/.exec(v.id);
        return result? result[1] : v.id;
    } else {
        return "UNKNOWN";
    }
}

function conformDatabase(db) {
    // the video db is an array of video objects
    // the video object contains the following properties:
    //   - id:       useful to track a series of videos with shorten name. others may not have an id.
    //   - title:    for video series, they may not have an title.
    //   - artists:  array
    //   - date:     string like "2011-04-23"
    //   - tags:     array. tags is used to filter videos
    //   - bookmark: an object with properties as "offset":"description" format like:
    //               { "00:30:30": "fun", "01:00:03": "joke at about 1 hour" }

    // besides that, the object can contains arbitrary other string properties, 
    // these properties will appear in the video detailed page

    // to get video display name, use `title` then `id`
    // to get video file name, use `id` then `title`

    for (v of db) {

        // Allow writing space seperated values to represent array for convenience
        // We convert here, if needed
        
        if (!v.tags) v.tags = "";
        if (v.tags.constructor != Array) {
            v.tags = v.tags.split(" ").filter(s => s.length > 0);
        }

        if (!v.artists) v.artists = "";
        if (v.artists.constructor != Array) {
            v.artists = v.artists.split(" ").filter(s => s.length > 0);
        }
    }

    return db.filter(v => v.id || v.title);
}

function conformArtistDB() {
    for (a of artistdb) {
        if (a.name.constructor !== Array) {
            a.name = [a.name];
        }
    }
}

function findArtistByName(str) {
    return artistdb.find(a => a.name.indexOf(str) >= 0);
}

// movie playing needs "play:" protocol registration.
// see "register_play_urlprotocol.bat" for details
function playMovie(itemid, offset) {
    var urlprotocol = offset? "play:" + itemid + "@" + offset : "play:" + itemid;
    try {
        // mshta: "windows.open" approach will open an IE frame window asking user confirmation,
        // which is a bad experience. so do special handling here.
        var shellapp = new ActiveXObject("Shell.Application");
        shellapp.ShellExecute(urlprotocol);
    } catch (e) {
        window.open(urlprotocol, "_self");
    }
}

function getAllProperties(db) {
    var properties = [];
    for (var i in db) {
        var item = db[i];
        for (var p in item) {
            if (properties.indexOf(p) == -1) properties.push(p);
        }
    }

    return properties;
}

function createBookmarks(db) {
    var tbl = $('<table>').addClass("table table-striped table-bordered datatable");
    
    var properties = ["id", "time", "comment"];

    // create thead
    var tr = $('<tr>');
    tbl.append($('<thead>').append(tr));
    for (var i in properties) {
        tr.append($('<th>').text(properties[i]).addClass(properties[i]));
    }

    var tbody = $('<tbody>');
    tbl.append(tbody);

    for (item of db) {
        var id = getVideoFileID(item);
        for (var t in item.bookmark) {
            var tr = $('<tr>');
            tbody.append(tr);
            tr.append($('<td>').append($('<a>', {href: getLink("id", id)}).text(id)));
            tr.append($('<td>').text(t));
            tr.append($('<td>').append($('<a>', {onclick: 'playMovie("' + id + '", "' + t + '")'}).text(item.bookmark[t])));
        }
    }

    if (tbody.children().length > 0) {
        tbl.DataTable({paging: false, info: false, filter: false, bAutoWidth: false});
    }

    return tbl;
}

function createDataTable(db) {
    var tbl = $('<table>').addClass("table table-striped table-bordered datatable responsive");
    
    // It's not a good idea to table all properties, we just pick the most useful properties here
    var allprops = ["id", "title", "artists", "date"];
    var properties = [];
    for (var i in allprops) {
        var prop = allprops[i];
        for (var j in db) {
            var item = db[j];
            if (item[prop] && item[prop].length > 0) {
                properties.push(prop);
                break;
            }
        }
    }

    // create thead
    var tr = $('<tr>');
    tbl.append($('<thead>').append(tr));
    for (var i in properties) {
        tr.append($('<th>').text(properties[i]).addClass(properties[i]));
    }

    // create tbody
    var tbody = $('<tbody>');
    tbl.append(tbody);
    for (var i in db) {
        var item = db[i];
        var tr = $('<tr>');
        tbody.append(tr);
        for (var j in properties) {
            var p = properties[j];
            if (p == "id" || p == "title") {
                tr.append($('<td>').addClass(p)
                          .append($('<a>', {href: getLink("id", getVideoFileID(item))}).text(item[p])));
            } else if (p == "artists") {
                tr.append($('<td>').addClass(p).append(createArtistLinks(item, true)));
            } else {
                tr.append($('<td>').addClass(p).text(item[p]).addClass(p));
            }
        }
    }

    if (db.length > 0) {
        tbl.DataTable({paging: false, info: false, filter: false, bAutoWidth: false, responsive: true});
    }

    return tbl;
}

function createArtistLinks(item, collapse) {
    var allspan = $('<span>');
    var artists = item.artists;
    for (var i in artists) {
        if (i > 0) {
            allspan.append(" / ");
        }
        var artist = artists[i];
        allspan.append($('<a>', {href: getLink("artist", artist)}).text(artist));
    }

    if (item.artists.length <= 4 || !collapse) {
        return allspan;
    }

    // if there are so many artists, return a shorten list with a expand functionality
    var div = $('<div>');
    var shortenspan = $('<span>');
    for (var i in artists) {
        if (i > 0) {
            shortenspan.append(" / ");
        }
        var artist = artists[i];
        shortenspan.append($('<a>', {href: getLink("artist", artist)}).text(artist));
        if (i >= 2) break;
    }

    shortenspan.append(" / ");
    shortenspan.append($('<a>').text("...").on("click", function(s, a){
        return function() {
            s.hide();
            a.show();
        }
    }(shortenspan, allspan)));

    allspan.hide();
    div.append(allspan).append(shortenspan);
    
    return div;
}

function createBookmarkLinks(item) {
    var span = $('<span>');
    var i = 0;
    for (var t in item.bookmark) {
        if (i > 0) {
            span.append(" / ");
        }

        span.append($('<a>', {onclick: 'playMovie("' + getVideoFileID(item) + '", "' + t + '")'}).text(item.bookmark[t]));
        
        i++;
    }
    return span;
}

function createBigPlayButton(item) {
    return $('<button>').addClass("btn btn-lg btn-success")
        .click(function() {playMovie(getVideoFileID(item)); })
        .text("Play Movie");
}

function createSmallPlayButton(item) {
    return $('<span aria-hidden="true">').addClass("glyphicon glyphicon-play smallplay")
        .click(function() {playMovie(getVideoFileID(item)); });
}

// creates a column-based image gallary that shows images with increased seq number.
// stop on first non-exist image.
function createImageGallary(prefix) {
    var div = $('<div>').addClass("freewall");
    div.data("nextImageID", 1);
    
    var loadNextImage = function() {
        var imageid = div.data("nextImageID");
        div.data("nextImageID", imageid + 1);
        var url = prefix + "_" + imageid.toString() + ".jpg";
        div.append($('<figure>').append($('<a>', {href: url, target: "_blank"})
                      .append($('<img>', {src: url}).load(function(){
                          loadNextImage();
                      }).error(function() {
                          $(this).parent().parent().hide();
                          div.show();
                      })
        )));
    };

    //div.append($('<div>'));
    setColumnWidth(div, 240);
    div.hide();

    for (var i = 0; i < 3; i++)
        loadNextImage();

    return div;
}

// append 2 image layer to `obj`
// if mouse hover and preview image exists, show the preview image, otherwise show the base image
function createHoverPreviewWidget(baseimg, previewimg, target) {
    var div = $('<div>');
    var cover_img = $('<img>', {src: baseimg, alt: "no image"});

    var preview_img = $('<div>')
        .css("background-image", "url('" + previewimg + "'), url('" + baseimg + "')")
        .css("background-position", "center center")
        // use `contain` to see the full zoomed background
        .css("background-size", "cover")
        .css("background-repeat", "no-repeat");

    preview_img.hide();
    
    if (target) {
        div.append($('<a>', {href: target}).append(cover_img).append(preview_img));
        //preview_img.click(clickfn).css("cursor", "pointer");
    } else {
        div.append(cover_img).append(preview_img);
    }

    fp = function (ci, pi) {
        return function () {
            pi.height(ci.height());
            pi.width(ci.width());
            pi.show();
            ci.hide();
        }
    }(cover_img, preview_img);

    fc = function (ci, pi) {
        return function () {
            ci.show();
            pi.hide();
        }
    }(cover_img, preview_img);

    cover_img.on("mouseenter touchstart", fp);
    cover_img.on("touchend", fc);
    preview_img.on("mouseleave", fc);

    return div;
}

function createCoverWall(db) {
    var wall = $('<div>').addClass("freewall");
    for (var i in db)
    {
        var item = db[i];
        var caption = $('<figcaption>');
        caption.append(createSmallPlayButton(item));
        caption.append(" ");
        caption.append(getVideoFullDisplayName(item));
        caption.append($('<br>'));
        caption.append(createArtistLinks(item));

        var figure = $('<figure>');
        figure.append(createHoverPreviewWidget(
            getCoverFileName(item), 
            getPreviewFileName(item),
            getLink("id", getVideoFileID(item))
        ));
        figure.append(caption);

        wall.append(figure);

        // chrome failed to layout correctly. it place at least 2 into one columns then start to consider the its right column.
        // for example if we only have 2 items, these 2 items will all in the first column, leaving other columns empty.
        // the following code solves chrome layout issue.
        wall.append($('<div>'));
    }
    return wall;
}

// cross-browser-css
function cbcss(obj, vn, val) {
    if (val) {
        obj.css(vn, val);
        obj.css("-moz-" + vn, val);
        obj.css("-webkit-" + vn, val);
    }
    else {
        return obj.css(vn) || obj.css("-moz-" + vn) || obj.css("-webkit-" + vn);
    }
}

function setColumnWidth(wall, columnWidth) {
    cbcss(wall, "column-width", columnWidth + "px");
}

// column_width * column_count + gap * (column_count-1) <= width
// -> column_width <= (width - gap * (column_count-1)) / column_count
// -> column_count <= (width - gap) / (column_width + gap)
function setColumnCount(wall, columnCount) {
    if (!columnCount) return;
   
    var width = wall.innerWidth();
    var gap = parseInt(cbcss(wall, "column-gap"));
    var columnWidth = Math.floor((width - gap * (columnCount-1)) / columnCount) - 1;
    setColumnWidth(wall, columnWidth);

    return columnWidth;
}
function getColumnCount(wall) {
    var width = wall.innerWidth();
    var gap = parseInt(cbcss(wall, "column-gap"));
    var columnWidth = parseInt(cbcss(wall, "column-width"));
    return Math.floor((width + gap) / (columnWidth + gap));
}

function increaseColumn(wall) {
    var columnCount = getColumnCount(wall);
    var targetColumnCount = columnCount + 1;
    return setColumnCount(wall, targetColumnCount);
}
function decreaseColumn(wall) {
    var columnCount = getColumnCount(wall);
    var targetColumnCount = columnCount <= 1? 1: columnCount - 1;
    return setColumnCount(wall, targetColumnCount);
}

function match(item, text) {
    for (var i in item) {
        var str = item[i].toString();
        if (str.toLowerCase().indexOf(text.toLowerCase()) != -1) return true;
    }

    // make sure we can find item by artist's other names
    for (var i in artistdb) {
        var artist = artistdb[i];
        if (matchArtistPartial(artist, text)) {
            for (var i in artist.name) {
                if (item.artists.indexOf(artist.name[i]) != -1) return true;
            }
        }
    }

    return false;
}

function matchArtistPartial(artist, text) {
    var lt = text.toLowerCase();
    for (var i in artist.name) {
        if (artist.name[i].toLowerCase().indexOf(lt) != -1) return true;
    }
    return false;
}

function getArtistNames(str) {
    var a = artistdb.find(a => a.name.indexOf(str) >= 0);
    return a? a.name : [str];
}

function getArtistPrimaryName(a) {
    return getArtistNames(a)[0];
}

function matchArtist(item, str) {
    var names = getArtistNames(str);
    for (var i = 0; i < names.length; i++) {
        if (item.artists.indexOf(names[i]) != -1) {
            return true;
        }
    }
    return false;
}

function applyTagFilter(db, filter) {
    if (!filter || !filter.length) return db;

    var filteredDB = [];
    for (var i in db) {
        var item = db[i];
        var meet = true;
        for (var j in filter) {
            if (item.tags.indexOf(filter[j]) < 0) {
                meet = false;
                break;
            }
        }
        if (meet) filteredDB.push(item);
    }

    return filteredDB;
}

function applyTextFilter(db, filter) {
    if (!filter) return db;

    var filterfunc = null;

    // if filter contains >, =, <, we will treat filter as js expression
    if (filter[0] == ' ') {
        eval("filterfunc = function(item) { " +
            "    with (item) {" +
            "        try { if (" + filter + ") return true; } catch (e) {}" +
            "    }" +
            "    return false;" +
            "};");
    }

    if (filterfunc == null) {
        var terms = filter.split(" ");
        filterfunc = function (item) {
            for (var i in terms) {
                if (terms[i].length > 0 && !match(item, terms[i])) return false;
            }
            return true;
        }
    }

    var filteredDB = [];
    for (var i in db) {
        var item = db[i];
        if (filterfunc(item)) filteredDB.push(item);
    }

    return filteredDB;
}

// propertyFunc : function(v) => string  or  function(v) => [string, ...]
function createLinksGroupbyProperty(db, propertyName, propertyFunc) {
    var div = $('<div>');
    var propertyValues = db.reduce((a, v) => a.concat(propertyFunc(v)), []);
    var group = groupSame(propertyValues);

    for (g of group.sortedArray) {
        div.append($('<a>', {href:getLink(propertyName, g)}).text(g));
        if (group.frequency[g] > 1)
            div.append('(' + group.frequency[g].toString() + ')');
        div.append(' ');
    }

    return div;
}

function createGroupedLinks(db) {
    var div = $('<div>');

    var getVideoArtists = v => v.artists.map(a => getArtistPrimaryName(a));
    div.append(createPanel(createLinksGroupbyProperty(db, "artist", getVideoArtists), "panel-danger", "by artist"));

    div.append(createPanel(createLinksGroupbyProperty(db, "vendor", getVideoVendor), "panel-info", "by vendor"));

    return div;
}

function incCounter(obj, prop) {
    obj[prop] = (obj[prop] || 0) + 1;
}

// input: ["b", "a", "b", "a", "c", "a"]
// output: {sortedArray: ["a", "b", "c"], frequency: {"a":3, "b":2, "c":1}}
function groupSame(arr) {
    var frequency = {};
    for (var i in arr) incCounter(frequency, arr[i]);
    var sortedArray = Object.keys(frequency).sort(function(a,b) { return frequency[b] - frequency[a]; });
    return {sortedArray: sortedArray, frequency: frequency};
}

function getDbKey(db) {
    if (db == null) return "";
    var key = "";
    for (var i in db) {
        key += getVideoFileID(db[i]);
    }
    return key;
}

function refreshView() {
    var filter = $('#filter').val();
    var view = $('#main_view');

    var db = applyTagFilter(vdb, settings.tagfilter);
    db = applyTextFilter(db, filter);
    var key = getDbKey(db);
    updateTagHitCounts(db);

    var savedKey = view.data("key");
    if (savedKey == key) return;
    view.data("key", key);

    var child = null;
    var savedScene = view.data("savedScene");
    if (!savedScene) {
        savedScene = {};
        view.data("savedScene", savedScene);
    }

    if (key in savedScene) {
        child = savedScene[key];
        console.log("cache hit");
    } else {
        child = createVideoScene(db, settings.videoscene.main);
        savedScene[key] = child;
        view.append(child);
        console.log("create new scene");
    }

    if (savedKey in savedScene)
        savedScene[savedKey].hide();
    child.show();
    child.find("#btn_" + settings.videoscene.main.style + "_layout").click();
}

function getDefaultSearchEngines(term) {
    return [
        {
            text: "google",
            url: "https://www.google.com/search?q=" + term
        },
        {
            text: "baidu",
            url: "http://www.baidu.com/s?wd=" + term
        },
        {
            text: "bing",
            url: "https://www.bing.com/search?q=" + term
        },
        {
            text: "豆瓣",
            url: "https://www.douban.com/search?q=" + term
        },
        {
            text: "115",
            // https://115.com/?url={/?aid=-1&search_value=TEXT&ct=file&ac=search&is_wl_tpl=1&submode=wangpan&mode=search}

            url: "https://115.com/?url="
                 + encodeURIComponent("/?aid=-1&search_value=" + term + "&ct=file&ac=search&is_wl_tpl=1")
                 + "&submode=wangpan&mode=search"
        }
    ];
}

function createSearchLinks(text) {
    var engines = getDefaultSearchEngines(text);
    if (window.getSearchEngines) {
        engines = engines.concat(getSearchEngines(text));
    }

    var p = $('<span>');
    for (var i in engines) {
        var eng = engines[i];
        p.append($('<a>', {href: eng.url, target: "_blank"})
                 .append(eng.text))
         .append("  ");
    }

    return p;
}


function createMoviePage(itemid) {
    var div = $('<div>').addClass("movie_info");
    var item = vdb.find(a => a.id == itemid || a.title == itemid);

    var tbl = $('<table>').addClass("table movie_info table-striped table-bordered proptable");
    for (var p in item) {
        var content = $('<td>');
        if (p == "artists") {
            content.append(createArtistLinks(item));
        } else if (p == "bookmark") {
            content.append(createBookmarkLinks(item));
        } else {
            content.text(item[p]);
        }
        
        tbl.append($('<tr>')
                   .append($('<td class="shrink">' + p + '</td>'))
                   .append(content)
        );
    }

    tbl.append($('<tr>')
        .append($('<td class="shrink">').append(createSmallPlayButton(item)))
        .append($('<td>').text("Search in: ").append(createSearchLinks(itemid))));

    var coverfile = getCoverFileName(item);
    var previewfile = getPreviewFileName(item);
    var coverimg = $('<img>', {src: getCoverFileName(item)}).addClass("cover");
    var previewimg = $('<img>', {src: getPreviewFileName(item)}).addClass("cover").error(function(){
        $(this).parent().hide();
    });
    var cover = $('<a>', {href: coverfile}).append(coverimg);
    var preview = $('<a>', {href: previewfile}).append(previewimg);
    
    div
        .append(tbl)
        .append(cover)
        .append(preview)
        .append($('<br>'))
        .append($('<br>'))
        .append(createPanel(createImageGallary(imagedir + "/gallary/" + itemid), "panel-default", "image gallary"))
    ;

    div.find("#play").click(() => playMovie(itemid));
    
    return div;
}

function createArtistPage(artist) {
    console.log("creating artist page for " + artist);
    var artistInfo = findArtistByName(artist) || {};
    var primaryName = ("name" in artistInfo) ? artistInfo.name[0] : artist;
    var div = $('<div>');
    
    var adb = [];
    for (var i in vdb) {
        var item = vdb[i];
        if (matchArtist(item, primaryName)) {
            adb.push(item);
        }
    }

    var searchSpan = $('<span>').text("Search '" + primaryName + "' in: ").append(createSearchLinks(primaryName));

    var proptable = $('<table>').addClass("table table-striped table-bordered proptable");
    for (var p in artistInfo) {
        proptable.append($('<tr>')
                   .append($('<td class="shrink">' + p + '</td>'))
                   .append($('<td>').text(artistInfo[p])));
    }
    proptable.append($('<tr>')
               .append($('<td colspan=2>').append(searchSpan)));

    div.append(proptable);
    
    div.append(createPanel(createVideoScene(adb, settings.videoscene.artist), "panel-info", "contributions"));
    var gallary = createPanel(createImageGallary(imagedir + "/gallary/" + primaryName), "panel-danger", "image gallary");
    div.append(gallary);
    return div;
}

function createPanel(content, panelStyle, heading) {
    var panel = $('<div>').addClass("panel").addClass(panelStyle);
    panel.append($('<div>').addClass("panel-heading").text(heading));
    panel.append($('<div class="panel-body">').append(content));
    return panel;
}

function createVendorPage(vendor) {
    var db = vdb.filter(function(item){
        return getVideoVendor(item) == vendor;
    });

    return createVideoScene(db, settings.videoscene.other);
}

function createVideoScene(db, sceneSetting) {
    var div = $('<div>');

    // the name align with the buttons defined in scenetoolbar
    var views = {
        table: createDataTable(db),
        wall: createCoverWall(db),
        group: createGroupedLinks(db),
        bookmark: createBookmarks(db)
    };
    setColumnWidth(views.wall, sceneSetting.coverViewColumnWidth);

    div.append($('#templates > #scenetoolbar').clone());
    for (var i in views) {
        views[i].addClass("scene_view");
        views[i].addClass(i + "_view");
        div.append(views[i]);
    }

    div.find(".layout_btn").click((function(d){
        return function() {
            var myid = $(this).attr('id');
            var r = /^btn_(.*)_layout$/.exec(myid);
            var layout = r[1];

            console.log("swith to " + layout + " layout");
            d.find(".scene_view").hide();
            d.find("." + layout + "_view").show();
            d.find(".layout_btn").removeClass("btn-primary").addClass("btn-default");
            $(this).removeClass("btn-default").addClass("btn-primary");

            if (layout == "wall") {
                d.find(".walltools").show();
            } else {
                d.find(".walltools").hide();
            }

            sceneSetting.style = layout;
            saveSettings();
        }
    })(div));

    div.find("#zoomin").click((function(w){
        return function() {
            sceneSetting.coverViewColumnWidth = decreaseColumn(w);
            saveSettings();
        }
    })(views.wall));

    div.find("#zoomout").click((function(w){
        return function() {
            sceneSetting.coverViewColumnWidth = increaseColumn(w);
            saveSettings();
        }
    })(views.wall));

    div.find("#showinfo").click((function(w){
        return function() {
            if ($(this).hasClass("btn-primary")) {
                $(this).removeClass("btn-primary").addClass("btn-default");
                w.find("figcaption").hide();
            }
            else {
                $(this).removeClass("btn-default").addClass("btn-primary");
                w.find("figcaption").show();
            }
        }
    })(views.wall));

    div.find("#random").click((function(w){
        return function() {
            if ($(this).hasClass("btn-primary")) {
                $(this).removeClass("btn-primary").addClass("btn-default");
                w.unShuffleChildren();
                sceneSetting.coverViewRandom = false;
                saveSettings();
            }
            else {
                $(this).removeClass("btn-default").addClass("btn-primary");
                w.shuffleChildren();
                sceneSetting.coverViewRandom = true;
                saveSettings();
            }
        }
    })(views.wall));

    div.find("#item_count").text(" " + db.length);
    div.find("#btn_" + sceneSetting.style + "_layout").click();
    if (sceneSetting.coverViewRandom) {
        div.find("#random").click();
    }
    return div;
}

function shuffle(a) {
    var j, x, i;
    for (i = a.length; i; i--) {
        j = Math.floor(Math.random() * i);
        x = a[i - 1];
        a[i - 1] = a[j];
        a[j] = x;
    }
}

function removeFromArray(a, b) { 
    var pos = a.indexOf(b);
    if (pos >= 0) {
        a.splice(pos, 1); 
        return true; 
    } 
    return false; 
}

function updateTagHitCounts(db) {
    $('#tagfilter > div').each(function() {
        var count = 0;
        var tag = $(this).data("tag");
        for (var i in db) {
            var item = db[i];
            if (item.tags.indexOf(tag) >= 0) count++;
        }
        $(this).find(".count").text("(" + count + ")");
    });
}

function initTagFilter() {
    var div = $('#tagfilter');
    var tags = [];
    for (var i in vdb) {
        var item = vdb[i];
        for (var j in item.tags) {
            tags.push(item.tags[j]);
        }
    }

    var tg = groupSame(tags);

    for (var i in settings.tagfilter) {
        var tag = settings.tagfilter[i];
        if (!(tag in tg.frequency))
            removeFromArray(settings.tagfilter, tag);
    }
    saveSettings();

    $("#btn_tag").text(settings.tagfilter.join(" "));

    for (var i in tg.sortedArray) {
        var t = tg.sortedArray[i];
        var s = $('<div class="tag">');
        s.append($('<div class="glyphicon glyphicon-tag tagimg"/>'));
        s.append(t);
        s.append($('<div class="count">'));
        if (settings.tagfilter.indexOf(t) >= 0) {
            s.addClass("selected");
        }

        s.data("tag", t);
        s.on("click", function() {
            $(this).toggleClass("selected");
            if ($(this).hasClass("selected")) {
                settings.tagfilter.push($(this).data("tag"));
            } else {
                removeFromArray(settings.tagfilter, $(this).data("tag"));
            }
            $("#btn_tag").text(settings.tagfilter.join(" "));
            saveSettings();
            refreshView();
        });

        div.append(s);
        div.append($('<div class="tagspacer">'));
    }

    layoutTagFilters();
    $(window).resize(function(){
        layoutTagFilters();
    });
}

function clearTagFilters() {
    var tags = $('#tagfilter').find(".tag");
    tags.each(function(){
        $(this).removeClass("selected");
    });
    settings.tagfilter = [];
}

function layoutTagFilters() {
    var div = $('#tagfilter');
    // div.width() will return a rounded value, which sometimes is not accurate
    var w = div[0].getBoundingClientRect().width;
    var tags = div.find(".tag");
    var spacers = div.find(".tagspacer");
    var e = tags.outerWidth();

    spacers.show();

    // e * cols + (cols-1) * 5 < w
    var cols = Math.floor((w + 5) / (e + 5));
    if (cols == 0) {
        spacers.width(0);
        spacers.hide();
        return;
    } else if (cols == 1) {
        // set spacer width + tag width == w - 1 to make sure line break
        spacers.width(w - 1 - e);
        return;
    }

    var totalspace = w - e * cols;
    var count = tags.length;
    var singlespace = Math.floor(totalspace / (cols - 1));
    var reminder = totalspace % (cols - 1);

    console.log("div resize: " + w + "," + e);
    console.log("cols: "+ cols + ", spaces: " + totalspace + "," + singlespace);

    for (var i = 0; i < count; i++) {
        var col = i % cols;
        var space = singlespace;
        if (col == cols - 1) {
            space = 0;
        } else if (col >= cols - 1 - reminder) {
            space = singlespace + 1;
        }

        spacers.eq(i).width(space);
    }
}
