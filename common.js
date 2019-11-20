function opt(obj, prop, defaultVal) {
    if (prop in obj) return obj[prop];
    return defaultVal;
}

function arraylize(x) {
    return (x instanceof Array)? x : [x];
}

/** flatten([1,[2,3],[[4],[5]]]) => [1,2,3,4,5] */
function flatten(arr) {
    let ret = [];
    for (const x of arr) {
        if (x instanceof Array) {
            ret = ret.concat(flatten(x));
        } else {
            ret.push(x);
        }
    }
    return ret;
}

/**  separate arr by element `x`
 * 
 *   e.g. 
 * 
 *   - `separate([1,2,3], 4)` => [1,4,2,4,3]
 *   - `separate(elements, ()=>$("<br>"))` => insert a line break between each html elements
*/
function separate(arr, x) {
    let r = [];
    let firstitem = true;
    for (const v of arr) {
        if (!firstitem) {
            if (typeof x === "function") {
                r.push(x());
            }
            else {
                r.push(x);
            }
        }
        r.push(v);
        firstitem = false;
    }
    return r;
}

/**
`["b", "a", "b", "a", "c", "a"]`
=>
`{sortedArray: ["a", "b", "c"], frequency: {"a":3, "b":2, "c":1}}`
*/
function groupSame(arr) {
    var frequency = {};
    for (var v of arr) frequency[v] = (frequency[v] || 0) + 1;
    var sortedArray = Object.keys(frequency).sort(function(a,b) { return frequency[b] - frequency[a]; });
    return {sortedArray: sortedArray, frequency: frequency};
}


// r, g, b in [0, 1]
// h in [0, 360]
// s,v in [0, 1]
function rgb2hsv(r, g, b) {
    let cmax = max(r, g, b);
    let cmin = min(r, g, b);
    let chroma = cmax - cmin;

    let hue = 0;
    if (chroma == 0) hue = 0;
    else if (r == cmax) hue = (g - b) / chroma + 0;
    else if (g == cmax) hue = (b - r) / chroma + 2;
    else if (b == cmax) hue = (r - g) / chroma + 4;
    hue = hue % 6 * 60;
    if (hue < 0) hue += 360;

    let value = cmax;

    let saturation = value == 0? 0: chroma / value;
}

function hsv2rgb(h, s, v) {
    let chroma =v * s; 
    let h1 = h / 60;
    let x = chroma * (1 - Math.abs(h1 % 2 - 1));
   
    let r1 = 0;
    let g1 = 0;
    let b1 = 0;

    if (h1>=0 && h1<=1)  { r1=chroma; g1=x; }
    if (h1>1  && h1<=2)  { r1=x; g1=chroma; }
    if (h1>2  && h1<=3)  { g1=chroma; b1=x; }
    if (h1>3  && h1<=4)  { g1=x; b1=chroma; }
    if (h1>4  && h1<=5)  { r1=x; b1=chroma; }
    if (h1>5  && h1<=6)  { r1=chroma; b1=x; }
    
    let m = v - chroma; 
  
    return [r1 + m, g1 + m, b1 + m]  
}

function hsv2rgb255(h, s, v) {
    return hsv2rgb(h, s, v).map(x => Math.floor(x * 255));
}

// return from 0 to 1, (nearly) uniformly distributed hash value for a string
function hash(str) {
    var p1 = 2654435761, p2 = 1597334677, h1 = 0xdeadbeef | 0, h2 = 0x41c6ce57 | 0;
    for (var i = 0; i < str.length; i++)
        ch = str.charCodeAt(i), h1 = Math.imul(h1 + ch, p1), h2 = Math.imul(h2 + ch, p2);
    h1 = Math.imul(h1 ^ h1 >>> 16, p2), h2 = Math.imul(h2 ^ h2 >>> 15, p1);
    var h3 = (h2 & 2097151) * 4294967296 + h1;
    return h3 % 4294967296 / 4294967296;
}

// creates a random color based on a given string in 8 bit rgb namespace
// s = saturation, [0, 1]
// v = vlue, [0, 1]
function hashcolor(str, s, v) {
    return hsv2rgb255(hash(str) * 360, s, v);
}
