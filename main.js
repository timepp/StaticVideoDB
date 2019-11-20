/*jshint loopfunc: true */

jQuery.fn.shuffleChildren = function(){
    var p = this[0];

    if (p.children.length > 0 && !("original_index" in p.children[0])) {
        for (let i = 0; i < p.children.length; i++) {
            p.children[i].original_index = i;
        }
    }

    for (let i = p.children.length; i > 0; i--) {
        p.appendChild(p.children[Math.random() * i | 0]);
    }
};

function swapElements(a, b) {
    if (a === b) return;
    var bp = b.parentNode, ap = a.parentNode;
    var an = a.nextElementSibling, bn = b.nextElementSibling;
    if (an === b) return bp.insertBefore(b, a);
    if (bn === a) return ap.insertBefore(a, b);
    if (a.contains(b))
        return ap.insertBefore(b, a), bp.insertBefore(a, bn);
    else
        return bp.insertBefore(a, b), ap.insertBefore(b, an);
}

jQuery.fn.unShuffleChildren = function() {
    var p = this[0];
    if (p.children.length > 0 && !("original_index" in p.children[0])) {
        // the object is unshuffled yet
        return;
    }

    for (var i = 0; i < p.children.length; i++) {
        while (p.children[i].original_index !== i) {
            var j = p.children[i].original_index;
            swapElements(p.children[i], p.children[j]);
        }
    }
};

// persistent settings
var defaultSettings = {
    videoscene: {
        main: {
            layout: "table",
            cover_column_width: 320,
            cover_random: false,
            cover_showinfo: true,
            gallary_column_width: 320,
            gallary_random: false,
            gallary_showinfo: true,
            gallary_showimage: true,
            gallary_showgallary: true,
            gallary_showbookmark: true
        },
        foreign: {
            layout: "table",
            cover_column_width: 320,
            cover_random: false,
            cover_showinfo: true,
            gallary_column_width: 320,
            gallary_random: false,
            gallary_showinfo: true,
            gallary_showimage: true,
            gallary_showgallary: true,
            gallary_showbookmark: true
        }
    },
    tagfilter: [],
    showTagSelector: true
};

var SETTINGS = null;
var UX = {};
var DATABASE;
var PARAM = parseParam();
var FILES = processFilelist(filelist);
var MINIMUM_TAG_WIDTH = 0;

$(function(){
    init(PARAM);
});

function init(param) {
    // vdb.html?_db=xxx&_filter=xxx&prop1=val1&prop2=val2

    if (!("_db" in param)) {
        // get summary page
        for (const name in data) {
            let a = $('<a>', {href: getLink(null, null, name)}).text(name);
            $(document.body).append(a);
            $(document.body).append($('<br>'));
        }
        return;
    }

    loadSettings();
    conformDatabase();
    
    DATABASE = data[param._db];
    UX = presentation[param._db];


    // apply filters
    let property_filter_count = 0;
    let property_filter_name = "";
    Object.keys(param).forEach(name => {
        if (!name.startsWith("_")) {
            property_filter_count++;
            property_filter_name = name;
            DATABASE = DATABASE.filter(item => {
                return matchprop(item[name], param[name]);
            });
        }
    });

    /** We will show a detailed info page for urls like:
     *  - ...name=xxx
     *  - ...artist=yyy
     * 
     *  However, when detailed page is shown, it's ugly to place filter/tags below as usual.
     *  so we will hide them in such case.
     * 
     *  But this lose a freedom to just show filter/tags normally. A special parameter '_vt=normal'
     *  will enforce a normal view. Search `_vt=normal` to learn how to trigger that.
    */
    if (property_filter_count == 1 && param._vt != "normal") {
        let item = null;
        const prop = property_filter_name;
        const val = param[prop];
        const db = prop === "name" ? DATABASE : data[prop];
        const ux = prop === "name" ? UX : presentation[prop];
        if (db) {
            item = db.find(item => aequal(item.name, val)) || { name: val };
            $(document.body).append(createDetailInfoPage(item, ux));
            if (DATABASE.length === 1 && prop === "name") {
                return;
            }
            $(document.body).append(createVideoScene(DATABASE, SETTINGS.videoscene.foreign));
            return;
        }
    }

    if (param._filter) {
        $("#filter").val(param._filter);
    }

    if (property_filter_count > 0) {
        $("#filtericon").addClass("stress");
    }

    let allprops = DATABASE.reduce((v,c) => v.concat(Object.keys(c)), []);
    $("#help_props").text([...new Set(allprops)].join(", "));

    $("#mainpage").show();
    
    initTagFilter();
    refreshView();

    $("#filter").on("change keyup paste", function() {
        refreshView();
    });

    if (SETTINGS.showTagSelector) {
        $("#tagfilter").show();
    } else {
        $("#tagfilter").hide();
    }
        
    $("#btn_tag").on("click", function(){
        SETTINGS.showTagSelector = !SETTINGS.showTagSelector;
        saveSettings();
        if (SETTINGS.showTagSelector) {
            $("#tagfilter").show();
            layoutTagFilters();
        } else {
            $("#tagfilter").hide();
        }
    });

    $("#btn_help").on("click", function() {
        $(this).toggleClass("btn-primary btn-secondary");
        $("#help_card").toggle($(this).hasClass("btn-primary"));
    });

    $("#btn_clear").click(() => {
        $("#filter").val("");
        $("#filter").trigger("change");
    });

    $("#btn_refresh_filelist").click(function(){
        window.open("tpvis:refresh?url=" + window.location, "_self");
    });
}

// compare equality considering aliases
function aequal(a, b) {
    return getAlias(a).indexOf(b) >= 0;
}

function getAlias(value) {
    for (const a of aliases) {
        if (a.indexOf(value) >= 0) return a;
    }
    return [value];
}

function getOtherAlias(value) {
    return getAlias(value).filter(x => x !== value);
}

function parseParam() {
    var match,
    pl     = /\+/g,  // Regex for replacing addition symbol with a space
    search = /([^&=]+)=?([^&]*)/g,
    decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
    query  = window.location.search.substring(1);

    param = {};
    while ((match = search.exec(query)) !== null) {
        param[decode(match[1])] = decode(match[2]);
    }

    return param;
}

function saveSetting(varName, val) {
    SETTINGS[varName] = val;
    saveSettings();
}

function saveSettings() {
    let settingName = PARAM._db + "_setting";
    localStorage[settingName] = JSON.stringify(SETTINGS);
}

function loadSettings() {
    let settingName = PARAM._db + "_setting";
    try {
        var settingstr = localStorage[settingName];
        if (settingstr) {
            SETTINGS = JSON.parse(settingstr);
            // merge new properties from defaultSettings to setting to support upgrade scenario
            for (var name in defaultSettings) {
                if (!(name in SETTINGS)) {
                    SETTINGS[name] = defaultSettings[name];
                }
            }
        } else {
            SETTINGS = defaultSettings;
        }
    } catch (e) {
        SETTINGS = defaultSettings;
    }
}

function getLink(key, value, db) {
    if (!db) db = PARAM._db;
    let url = "vdb.html?_db=" + db;
    if (key) {
        url += "&" + key + "=" + encodeURIComponent(value);
    }
    return url;
}

function processFilelist(filelist) {
    var files = [];
    var re = /^.*\/([^/]+)\.[A-Za-z0-9]+$/i;
    for (const f of filelist.split("\n").filter(s => s.length > 0)) {
        let r = f.match(re);
        if (r) {
            files.push({
                name: r[1],
                path: f,
            });
        }
    }
    return files;
}

// primary image represents the `name`. e.g. the cover image of a movie, the head image of an artist, etc
function getImage(name) {
    for (const f of FILES) {
        if (name.indexOf(f.name) >= 0) {
            return f.path;
        }
    }
}

function getGallaryFiles(name) {
    var r = [];
    for (const f of FILES) {
        let i = f.name.lastIndexOf("_");
        if (i >= 0) {
            let n = f.name.substr(0, i);
            let e = f.name.substr(i+1);
            if (name.indexOf(n) >= 0) {
                r.push(f);
            }
        }
    }
    return r;
}

function conformDatabase() {
    for (const dbname in data) {
        let db = data[dbname];
        if (dbname in presentation) {
            for (const item of db) {
                for (const prop of (presentation[dbname].extra_props || [])) {
                    let val = prop.func(item);
                    if (val !== undefined) {
                        item[prop.name] = prop.func(item);
                    }
                }
            }
        }
        for (const item of db) {
            item._tags = alltags(item, presentation[dbname]);
        }
    }

    Object.keys(presentation).forEach(key => {
        let item = presentation[key];
        item.actions = flatten(item.actions.map(v => v == "defaults"? getDefaultSearchActions() : v));
    });
}

// movie playing needs "play:" protocol registration.
// see "register_play_urlprotocol.bat" for details
function playMovie(itemid, offset) {
    var url = offset? "play:" + itemid + "@" + offset : "play:" + itemid;
    console.log("play video: " + url);
    window.open(url, "_self");
}

function createLinkContent(item, prop, collapse) {
    if (!(prop in item) || !item[prop]) return null;

    if (item[prop] instanceof Array) {
        return createArtistLinks(prop, item[prop], collapse);
    }

    const v = item[prop];
    return createLink(getLink(prop, v), v);
}

function uistr(item, prop, ux) {
    if (!ux) ux = UX;
    if (ux.tostring && ux.tostring[prop]) {
        return ux.tostring[prop](item[prop]);
    }

    if (!item[prop]) return "";

    return String(item[prop]);
}

function createDataTable(db) {
    var tbl = $('<table>').addClass("table table-striped table-bordered datatable responsive");
    
    var properties = UX.table_properties;

    // get data
    var arr = [];
    for (const item of db) {
        var row = [];
        for (const p of properties) {
            let val = null;
            if (p === "name" || opt(UX, "group_properties", []).indexOf(p) >= 0) {
                val = createLinkContent(item, p, true);
            } else {
                val = uistr(item, p);
            }
            row.push(val);
        }
        arr.push(row);
    }

    let columnStatus = [];
    for (let i = 0; i < properties.length; i++) {
        columnStatus[i] = false;
        for (const row of arr) {
            if (row[i]) {
                columnStatus[i] = true;
                break;
            }
        }
    }

    // create thead
    var tr = $('<tr>');
    tbl.append($('<thead>').append(tr));
    for (let i = 0; i < properties.length; i++) {
        const prop = properties[i];
        if (columnStatus[i]) {
            tr.append($('<th>').text(prop).addClass(prop));
        }
    }

    // create tbody
    var tbody = $('<tbody>');
    tbl.append(tbody);
    for (const row of arr) {
        tr = $('<tr>');
        tbody.append(tr);
        for (let i = 0; i < properties.length; i++) {
            const prop = properties[i];
            if (columnStatus[i]) {
                let td = $('<td>').addClass(prop);
                if (row[i] !== null) td.append(row[i]);
                tr.append(td);
            }
        }
    }

    if (tbl.find("thead th").length > 0) {
        tbl.DataTable({paging: false, info: true, filter: false, bAutoWidth: false, responsive: true, order: []});
        //tbl.DataTable({info:true});
    }

    return tbl;
}

function createArtistLinks(prop, arr, collapse) {
    if (!arr || arr.lenght === 0) return null;

    var allspan = $('<span>');
    for (let i = 0; i < arr.length; i++) {
        if (i > 0) {
            allspan.append($('<span>').text(" / "));
        }
        var item = arr[i];
        allspan.append($('<a>', {href: getLink(prop, item)}).text(item));
    }

    if (arr.length <= 4 || !collapse) {
        return allspan;
    }

    // if there are so many artists, return a shorten list with a expand functionality

    var div = $('<div>');
    var shortenspan = $('<span>');
    shortenspan.append(allspan.children().slice(0, 5).clone());
    shortenspan.append(" / ");
    shortenspan.append($('<a>').text("...").on("click", function() {
        shortenspan.hide();
        allspan.show();
    }));

    allspan.hide();
    div.append(allspan).append(shortenspan);
    
    return div;
}

function createPlayLink(name, time, title) {
    return $('<span>').addClass("smallplay").text(title).click(()=>playMovie(name, time));
}

function createFigCaption(arr) {
    var figcaption = $('<figcaption>');
    separate(arr, () => $("<br>")).forEach(x => figcaption.append(x));
    return figcaption;
}

function createGallaryFigure(name, url, gallary, showname) {
    let head = null;
    let cls = "gallary-figure";

    if (url) {
        for (const ext of ["mp4", "wmv", "mkv", "mov"]) {
            if (url.endsWith(ext)) {
                head = $('<video />', {
                    src: url,
                    type: `video/${ext}`,
                    controls: true
                });
            }
        }

        if (!head) {
            head = $('<a>', {href: url, target: "_blank"}).append($('<img>', {src: url}));
        }
    }

    let captions = [];
    if (gallary) {
        if (gallary.name) captions.push($("<span>").text(gallary.name));
        if (gallary.time) {
            captions.push(createPlayLink(name, gallary.time, "▶️ " + gallary.time));
            cls = "bookmark-figure";
        }
        if (gallary.desc) captions.push($("<span>").text(gallary.desc));
    }
    if (showname) captions.push(createLink(getLink("name", name), name));
    
    var figure = $('<figure>').addClass(cls).append(head).append(createFigCaption(captions));
    return figure;
}

// creates a column-based image/video gallary:
// 1. images with increased seq number, stop on first non-exist image.
// 2. explict images/videos in `gallary` property
function createGallary(db, showname) {
    var div = $('<div>').addClass("freewall");
    //setColumnWidth(div, 240);
    
    db.forEach(function(item) {
        let gfs = getGallaryFiles(item.name);
        let usedfiles = {};
        if (item.gallary) {
            item.gallary.forEach(function(g) {
                let f = gfs.find(p => p.path.indexOf(g.name) >= 0);
                if (f) {
                    usedfiles[f.path] = true;
                } else {
                    f = {path:""};
                }
                div.append(createGallaryFigure(item.name, f.path, g, showname));
            });
        }

        for (let f of gfs) {
            if (f.path in usedfiles) continue;
            let gallaryName = ext(f.name, "_");
            if (gallaryName.match(/^[0-9]+$/)) gallaryName = null;
            div.append(createGallaryFigure(item.name, f.path, {name: gallaryName}, showname));
        }
    });

    return div;
}

function ext(s, splitter) {
    let p = s.lastIndexOf(splitter);
    if (p >= 0) return s.substr(p+1);
    return p;
}

function createImageLink(img, url) {
    var div = $('<div>');
    var cover_img = $('<img>', {src: img, alt: "no image"});
    
    if (url) {
        div.append($('<a>', {href: url}).append(cover_img));
    } else {
        div.append(cover_img);
    }

    return div;
}

function createCoverWall(db) {
    var wall = $('<div>').addClass("freewall");
    db.forEach(function(item){
        var caption = $('<figcaption>');
        opt(UX, "wall_actions", []).forEach(function(actname) {
            const action = UX.actions.find(x => x.name === actname);
            let actspan = createActionSpan(action, actname, item.name);
            caption.append(actspan);
            caption.append(" ");
        });

        let props = UX.wall_properties.map(x => item[x])
                                      .filter(x => x)
                                      .map(x => $('<span>').text(x));
        separate(props, () => $('<br>')).forEach(x => caption.append(x));

        var figure = $('<figure>');
        figure.append(createImageLink(getImage(item.name), getLink("name", item.name)));
        figure.append(caption);
        wall.append(figure);

        // chrome failed to layout correctly. it place at least 2 into one columns then start to consider the its right column.
        // for example if we only have 2 items, these 2 items will all in the first column, leaving other columns empty.
        // the following code solves chrome layout issue.
        wall.append($('<div>'));
    });
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
    console.log(`set column count: ${columnCount}`);
   
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
    for (const prop in item) {
        if (typeof item[prop] === "object") {
            if (match(item[prop], text)) return true;
        } else {
            var str = item[prop].toString();
            if (str.toLowerCase().indexOf(text.toLowerCase()) !== -1) return true;
            let r = PinyinMatch.match(str.toLowerCase(), text.toLowerCase());
            console.log(r);
            if (r) return true;
        }
    }

    return false;
}

function matchprop(propval, text) {
    if (propval === undefined && text == "undefined") {
        return true;
    }
    return arraylize(propval).find(x => aequal(x, text)) !== undefined;
}

function applyTagFilter(db, filters) {
    if (!filters || !filters.length) return db;

    var filteredDB = [];
    for (const item of db) {
        var tags = item._tags;
        for (const filtergroup of filters) {
            var meet = true;
            for (const f of filtergroup.tags) {
                let index = tags.indexOf(f.tagname);
                if (!f.invert && index < 0 || f.invert && index >= 0) {
                    meet = false;
                    break;
                }
            }
            if (meet) {
                filteredDB.push(item);
                break;
            }
        }
    }

    return filteredDB;
}

function applyTextFilter(db, filter) {
    if (!filter) return db;

    var filterfunc = null;

    // if filter contains >, =, <, we will treat filter as js expression
    if (isExpFilter(filter)) {
        /* jshint -W061 */
        eval("filterfunc = function(item, i) { " +
            "    with (item) {" +
            "        try { if (" + filter + ") return true; } catch (e) {}" +
            "    }" +
            "    return false;" +
            "};");
    }

    if (filterfunc === null) {
        var terms = filter.split(" ");
        filterfunc = function (item, i) {
            for (const term of terms) {
                if (term.length > 0 && !match(item, term)) return false;
            }
            return true;
        };
    }

    var filteredDB = [];
    db.forEach((item, i) => {
        if (filterfunc(item, i)) filteredDB.push(item);
    });

    return filteredDB;
}

// propertyFunc : function(v) => string  or  function(v) => [string, ...]
function createLinksGroupbyProperty(db, prop) {
    var div = $('<div>');

    var propertyValues = db.reduce((a, v) => a.concat(v[prop.name]), []);
    propertyValues = propertyValues.map(v=>getAlias(v)[0]);
    var group = groupSame(propertyValues);

    for (const g of group.sortedArray) {
        div.append($('<a>', {href:getLink(prop.name, g)}).text(g?g:"<empty>"));
        if (group.frequency[g] > 1)
            div.append('(' + group.frequency[g].toString() + ')');
        div.append(' ');
    }

    if (prop.chart) {
        let canvas = $("<canvas>").attr("height", 50);
        div.append(canvas);

        let labels = group.sortedArray;
        if (prop.sort == "value") {
            labels = labels.sort();
        }

        let ctx = canvas[0].getContext("2d");
        var chart = new Chart(ctx, {
            type: prop.chart,
            data: {
                labels: labels,
                datasets: [{
                    label: prop.name,
                    data: labels.map(v => group.frequency[v]),
                    backgroundColor: labels.map(l => "rgb(" + hashcolor(l, 0.5, 0.8).join(",") + ")"),
                    maintainAspectRatio: false
                }]
            }
        });
    }

    return div;
}

function createGroupedLinks(db) {
    var div = $('<div>');

    for (let prop of UX.group_properties) {
        if (typeof prop !== "object") {
            prop = {name: prop};
        }
        div.append(createPanel(createLinksGroupbyProperty(db, prop), "panel-info", "by " + prop.name));
    }

    return div;
}

function unused_1() {
    
}

function createLink(url, text) {
    return $('<a>', {href:url}).text(text);
}

function isExpFilter(f) {
    return f.indexOf(">") >= 0 || f.indexOf("<") >= 0 || f.indexOf("=") >= 0;
}

function refreshView() {
    var filter = $('#filter').val();
    var view = $('#main_view');

    if (filter == "") {
        $("#btn_clear").hide();
    } else {
        $("#btn_clear").show();
    }

    if (isExpFilter(filter)) {
        $('#filter').addClass("expfilter");
    } else {
        $('#filter').removeClass("expfilter");
    }

    var db = applyTagFilter(DATABASE, SETTINGS.tagfilter);
    db = applyTextFilter(db, filter);
    var newkey = db.reduce((r, v) => r + v.name, "");
    updateTagHitCounts(db);

    $("#item_count").text(" " + db.length);

    var oldkey = view.data("key");
    if (oldkey === newkey) return;
    view.data("key", newkey);

    var child = null;
    var savedScene = view.data("savedScene");
    if (!savedScene) {
        savedScene = {};
        view.data("savedScene", savedScene);
    }

    if (newkey in savedScene) {
        child = savedScene[newkey];
        console.log("cache hit");
    } else {
        child = createVideoScene(db, SETTINGS.videoscene.main);
        savedScene[newkey] = child;
        view.append(child);
        console.log("create new scene");
    }

    if (oldkey in savedScene)
        savedScene[oldkey].hide();
    
    child.show();
    // it's needed because the old, saved scene may be not in latest layout
    child.find("#btn_" + SETTINGS.videoscene.main.layout + "_layout").click();
}

function createDetailInfoPage(item, presentor) {
    var div = $('<div>').addClass("movie_info");
    var tbl = $('<table>').addClass("table movie_info table-striped table-bordered proptable");
    Object.keys(item).filter(p => p != "gallary" && !p.startsWith("_")).forEach(p => {
        var content = $('<td>');
        let text = item[p];
        let k = p;
        
        if (p === "name") {
            let aliases = getOtherAlias(item.name);
            if (aliases.length > 0) {
                text = text + " (" + aliases.join(", ") + ")";
            }
            content.text(text);
            k = $("<a>").text(p).click(()=>{
                window.location = window.location + "&_vt=normal";
            });
        } else if (opt(presentor, "group_properties", []).indexOf(p) >= 0) {
            content.append(createLinkContent(item, p, false));
        } else {
            content.append(uistr(item, p, presentor));
        }
        
        tbl.append($('<tr>')
                   .append($('<td class="shrink">').append(k))
                   .append(content)
        );
    });

    div.append(tbl);

    // create action bar
    let actions = getDefaultSearchActions();
    if (presentor && presentor.actions) {
        actions = presentor.actions;
    }
    let actionbar = $("<div>").addClass("btn-toolbar");
    actions.forEach(function(act) {
        let btn = $("<button>").addClass("btn detail-toolbar-btn").text(act.name);

        var rgbstr = "rgb(" + hashcolor(act.name, 0.1, 1).join(",") + ")";
        
        btn.css("background-color", rgbstr);
        
        btn.click(() => getAlias(item.name).forEach(n => act.action(n)));
        actionbar.append(btn);
    });

    div.append(actionbar).append($("<br>"));

    var imgfile = getImage(item.name);
    if (imgfile) {
        var coverimg = $('<img>', {src: imgfile}).addClass("cover");
        var cover = $('<a>', {href: imgfile}).append(coverimg);
        div.append(cover);
    }

    var gallary = createGallary([item], false);
    if (gallary.children().length > 0) {
        div.append(createPanel(gallary, "panel-default", "gallary"));
    }
   
    return div;
}

function createActionSpan(act, actname, itemname) {
    return $("<span>").addClass("action").text(actname).click(() => act.action(itemname));
}

function createPanel(content, panelStyle, heading) {
    var panel = $('<div>').addClass("card mb-3").addClass(panelStyle);
    panel.append($('<div>').addClass("card-header").text(heading));
    panel.append($('<div class="card-body">').append(content));
    return panel;
}

function applyCheckState(obj, val) {
    //obj.find("i").removeClass("fa-square").removeClass("fa-check-square").addClass(val? "fa-check-square" : "fa-square");
    obj.removeClass("btn-secondary btn-success").addClass(val? "btn-success" : "btn-secondary");
}

function createVideoScene(db, sceneSetting) {
    var div = $('<div>');

    let applyTextState = function(state, obj, btn) {
        applyCheckState(btn, state);
        if (state) {
            obj.find("figcaption").show();
        } else {
            obj.find("figcaption").hide();
        }
    };

    let applyImageState = function(state, obj, btn) {
        applyCheckState(btn, state);
        if (state) {
            obj.find("video").show();
            obj.find("img").show();
        } else {
            obj.find("video").hide();
            obj.find("img").hide();
        }
    };

    let applyRandomState = function(state, obj, btn) {
        applyCheckState(btn, state);
        if (!obj.hasClass("freewall")) obj = obj.find(".freewall");
        if (state) {
            obj.shuffleChildren();
        } else {
            obj.unShuffleChildren();
        }
    };

    let applyGallaryState = function(type, state, obj, btn) {
        applyCheckState(btn, state);
        if (!obj.hasClass("freewall")) obj = obj.find(".freewall");
        if (state) {
            obj.find(`.${type}-figure`).show();
        } else {
            obj.find(`.${type}-figure`).hide();
        }
    };

    // the name align with the buttons defined in scenetoolbar
    var viewFactory = {
        table: createDataTable,
        cover: function (db) {
            let v = createCoverWall(db);
            setColumnWidth(v, sceneSetting.cover_column_width);
            applyTextState(sceneSetting.cover_showinfo, v, div.find(".cover-layout-tools .showinfo"));
            applyRandomState(sceneSetting.cover_random, v, div.find(".cover-layout-tools .random"));
            return v;
        },
        group: createGroupedLinks,
        gallary: function (db) {
            let v = createGallary(db, true);
            setColumnWidth(v, sceneSetting.gallary_column_width);
            applyTextState(sceneSetting.gallary_showinfo, v, div.find(".gallary-layout-tools .showinfo"));
            applyRandomState(sceneSetting.gallary_random, v, div.find(".gallary-layout-tools .random"));
            applyImageState(sceneSetting.gallary_showimage, v, div.find(".gallary-layout-tools .image"));
            applyGallaryState("gallary", sceneSetting.gallary_showgallary, v, div.find(".gallary-layout-tools .gallary"));
            applyGallaryState("bookmark", sceneSetting.gallary_showbookmark, v, div.find(".gallary-layout-tools .bookmark"));
            return v;
        }
    };
    var views = {};
    
    div.append($('#templates > #scenetoolbar').clone());
    for (const name in viewFactory) {
        views[name] = $("<div>");
        views[name].addClass("scene_view");
        views[name].addClass(name + "_view");
        div.append(views[name]);
    }

    div.find(".layout_btn").click(function() {
        var myid = $(this).attr('id');
        var r = /^btn_(.*)_layout$/.exec(myid);
        var layout = r[1];

        console.log("swith to " + layout + " layout");
        div.find(".scene_view").hide();
        let newview = div.find("." + layout + "_view");
        if (newview.children().length === 0) {
            newview.append(viewFactory[layout](db));
        }
        newview.show();
        div.find(".layout_btn").removeClass("btn-primary").addClass("btn-secondary");
        $(this).removeClass("btn-secondary").addClass("btn-primary");

        div.find(".layout-tools").hide();
        div.find(`.${layout}-layout-tools`).show();
        div.data("layout", layout);
        div.data("current_view", newview);

        sceneSetting.layout = layout;
        saveSettings();
    });

    div.find(".zoomin").click(function(){
        sceneSetting[`${div.data("layout")}_column_width`] = decreaseColumn(div.data("current_view").find(".freewall"));
        saveSettings();
    });

    div.find(".zoomout").click(function(){
        sceneSetting[`${div.data("layout")}_column_width`] = increaseColumn(div.data("current_view").find(".freewall"));
        saveSettings();
    });

    div.find(".showinfo").click(function() {
        let propname = `${div.data("layout")}_showinfo`;
        sceneSetting[propname] = !sceneSetting[propname];
        saveSettings();
        applyTextState(sceneSetting[propname], div.data("current_view"), $(this));
    });

    div.find(".random").click(function() {
        let propname = `${div.data("layout")}_random`;
        sceneSetting[propname] = !sceneSetting[propname];
        saveSettings();
        applyRandomState(sceneSetting[propname], div.data("current_view"), $(this));
    });

    div.find(".image").click(function() {
        let propname = `${div.data("layout")}_showimage`;
        sceneSetting[propname] = !sceneSetting[propname];
        saveSettings();
        applyImageState(sceneSetting[propname], div.data("current_view"), $(this));
    });
    div.find(".gallary").click(function() {
        let propname = `${div.data("layout")}_showgallary`;
        sceneSetting[propname] = !sceneSetting[propname];
        saveSettings();
        applyGallaryState("gallary", sceneSetting[propname], div.data("current_view"), $(this));
    });
    div.find(".bookmark").click(function() {
        let propname = `${div.data("layout")}_showbookmark`;
        sceneSetting[propname] = !sceneSetting[propname];
        saveSettings();
        applyGallaryState("bookmark", sceneSetting[propname], div.data("current_view"), $(this));
    });

    div.find("#btn_" + sceneSetting.layout + "_layout").click();

    return div;
}

function updateTagHitCounts(db) {
    $('#tagfilter > div').each(function() {
        var count = 0;
        var tag = $(this).data("tag");
        for (var item of db) {
            if (item._tags.indexOf(tag) >= 0) count++;
        }
        $(this).find(".count").text("(" + count + ")");
    });
}

function getDefaultSearchActions() {
    return [
        {
            name: "google",
            action: x => window.open("https://www.google.com/search?q=" + x),
        },
        {
            name: "baidu",
            action: x => window.open("http://www.baidu.com/s?wd=" + x),
        },
        {
            name: "bing",
            action: x => window.open("https://www.bing.com/search?q=" + x),
        },
        {
            name: "豆瓣",
            action: x => window.open("https://www.douban.com/search?q=" + x),
        },
        {
            name: "115",
            // https://115.com/?url={/?aid=-1&search_value=TEXT&ct=file&ac=search&is_wl_tpl=1&submode=wangpan&mode=search}

            action: x => {
                const midpart=encodeURIComponent("/?aid=-1&search_value=" + x + "&ct=file&ac=search&is_wl_tpl=1");
                window.open(`https://115.com/?url=${midpart}&submode=wangpan&mode=search`);
            }
        }
    ];
}

function alltags(item, ux) {
    var tags = [];
    for (const prop of ux.taggble_properties) {
        if (prop in item) {
            if (item[prop] instanceof Array) {
                for (const arrayitem of item[prop]) {
                    tags.push(String(arrayitem));
                }
            } else {
                tags.push(String(item[prop]));
            }
        }
    }
    return tags;
}

function getTagFilterString(filters) {
    return filters.map(g => g.tags.map(x => (x.invert?"!":"") + x.tagname).join("+")).join(" ");
}

function cleanupUnknownTags(filters, obj) {
    let ret = [];
    for (let f of filters) {
        let g = f.tags.filter(x => x.tagname in obj);
        if (g.length > 0) ret.push({tags:g, colorIndex:f.colorIndex});
    }
    return ret;
}

function removeTag(filters, tag) {
    let ret = [];
    for (let f of filters) {
        let g = f.tags.filter(x => x.tagname != tag);
        if (g.length > 0) ret.push({tags:g, colorIndex:f.colorIndex});
    }
    return ret;
}

function findGroup(filters, tagname) {
    for (const f of filters) {
        const t = f.tags.find(x => x.tagname == tagname);
        if (t) {
            return [f.colorIndex, t];
        }
    }
    return [-1, null];
}

function findUnusedColorIndex(filters) {
    for (let i = 0; i < 100; i++) {
        used = false;
        for (const f of filters) {
            if (f.colorIndex == i) {
                used = true;
                break;
            } 
        }
        if (!used) return i;
    }
    return -1;
}

function updateTagColor(t, colorIndex) {
    const predefinedHues = [120, 0, 240, 180, 300, 60];
    if (colorIndex == -1) {
        t.css("color", "");
        t.css("background-color", "");
    } else {
        const hue = colorIndex < predefinedHues.length? predefinedHues[colorIndex] : hash(`filtergroup${colorIndex}`) * 360;
        if (t.hasClass("invertselected")) {
            t.css("background-color", "black");
            t.css("color", "rgb(" + hsv2rgb255(hue, 0.9, 1).join(",") + ")");
        } else {
            t.css("background-color", "rgb(" + hsv2rgb255(hue, 0.2, 1).join(",") + ")");
            t.css("color", "");
        }
    }
}

function initTagFilter() {
    var div = $('#tagfilter');

    var tg = groupSame(DATABASE.reduce(function(r, x) {
        r.push(...x._tags);
        return r;
    }, []));

    SETTINGS.tagfilter = cleanupUnknownTags(SETTINGS.tagfilter, tg.frequency);
    saveSettings();

    $("#btn_tag").text(getTagFilterString(SETTINGS.tagfilter));

    let tagClickHandler = function() {
        const tagname = $(this).data("tag");
        let newfilter = removeTag(SETTINGS.tagfilter, tagname);

        if (newfilter.length == 0) newfilter.push({tags:[], colorIndex:0});
        
        if ($("#btn_tag_group").hasClass("invertselected")) {
            $("#btn_tag_group").click();
            if (newfilter[newfilter.length-1].tags.length > 0) {
                newfilter.push({tags:[], colorIndex:findUnusedColorIndex(newfilter)});
            }
        }
        
        let activeFilterGroup = newfilter[newfilter.length - 1];

        if ($("#btn_tag_invert").hasClass("invertselected")) {
            $(this).removeClass("selected").addClass("invertselected");
            activeFilterGroup.tags.push({invert: true, tagname: tagname});
            $("#btn_tag_invert").click();
        } else {
            // invselected => unselected
            // selected => unselected
            // unselected => selected
            if ($(this).hasClass("invertselected")) {
                $(this).removeClass("invertselected").removeClass("selected");
            } else {
                $(this).toggleClass("selected");
            }
            if ($(this).hasClass("selected")) {
                activeFilterGroup.tags.push({invert: false, tagname: tagname});
            }
        }
        SETTINGS.tagfilter = newfilter;
        updateTagColor($(this), findGroup(SETTINGS.tagfilter, tagname)[0]);
        $("#btn_tag").text(getTagFilterString(SETTINGS.tagfilter));
        saveSettings();
        refreshView();
    };

    tags = tg.sortedArray;
    if (UX.tag_order) {
        // put tag_order to the begining, then others
        tags = [...UX.tag_order.filter(x => tg.sortedArray.includes(x)),
                ...tg.sortedArray.filter(x => !UX.tag_order.includes(x))];
    }

    let maxwidth = 0;
    tags.forEach(function(t){
        var s = $('<div class="tag">');
        s.append($('<div class="glyphicon glyphicon-tag tagimg"/>'));
        s.append(t);
        s.append($('<div class="count">'));

        const r = findGroup(SETTINGS.tagfilter, t);
        if (r[1]) {
            s.addClass(r[1].invert? "invertselected" : "selected");
        }
        updateTagColor(s, r[0]);

        s.data("tag", t);
        s.click(tagClickHandler);

        div.append(s);
        div.append($('<div class="tagspacer">'));
        if (s.outerWidth() > maxwidth) maxwidth = s.outerWidth();
    });

    // inverse selector
    let is = $('<div class="tag" id="btn_tag_invert">');
    is.append("☯ INVERSE");
    is.click(function(){
        $(this).toggleClass("invertselected");
    });
    div.append(is);
    div.append($('<div class="tagspacer">'));

    // group selector
    let gs = $('<div class="tag" id="btn_tag_group">');
    gs.append("+ GROUP");
    gs.click(function(){
        $(this).toggleClass("invertselected");
    });
    div.append(gs);
    div.append($('<div class="tagspacer">'));

    MINIMUM_TAG_WIDTH = maxwidth + 70;

    layoutTagFilters();
    $(window).resize(function(){
        layoutTagFilters();
    });
}

function layoutTagFilters() {
    var div = $('#tagfilter');
    
    // div.width() will return a rounded value, which sometimes is not accurate
    var w = div[0].getBoundingClientRect().width;
    var tags = div.find(".tag");
    var spacers = div.find(".tagspacer");
    let spacer_width = 5;

    spacers.show();

    // MINIMUM_TAG_WIDTH * cols + (cols-1) * spacer_width + extra_room = w
    const cols = Math.floor((w + spacer_width) / (MINIMUM_TAG_WIDTH + spacer_width));
    const extra_room = w - MINIMUM_TAG_WIDTH * cols - (cols - 1) * spacer_width;

    if (cols === 0) {
        tags.outerWidth(MINIMUM_TAG_WIDTH);
        spacers.width(0);
        spacers.hide();
        return;
    } else if (cols >= tags.length) {
        tags.outerWidth(MINIMUM_TAG_WIDTH);
        spacers.width(spacer_width);
        spacers.eq(spacers.length - 1).width(0);
        return;
    }

    // extend tags width to consume extra_room as much as possible
    let tags_width = MINIMUM_TAG_WIDTH + Math.floor(extra_room / cols);
    tags.outerWidth(tags_width);
    
    // extend first (extra_room % cols) spacers to consume the remaining extra_room
    const remaining = extra_room % cols;
    for (let i = 0; i < tags.length; i++) {
        const col = i % cols;
        let spacer = spacers.eq(i);
        if (col === cols - 1) {
            spacer.width(0);
            spacer.hide();
        } else if (col < Math.floor(remaining)) {
            spacer.width(spacer_width + 1);
        } else if (col == Math.floor(remaining)) {
            spacer.width(spacer_width + remaining % 1);
        }
        else {
            spacer.width(spacer_width);
        }
    }

    //console.log("div resize: " + w );
    //console.log([cols, extra_room, MINIMUM_TAG_WIDTH, tags_width, remaining]);
}
