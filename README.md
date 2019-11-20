# data visulizer

## gallary design

这里有三个互相正交的特性

- named / unnamed
- image / video / plain
- has time (bookmark) / do not has time (gallary)

组合出12种情况 (x=理论上不存在)

- named image bookmark
- named video bookmark
- named plain bookmark
- unnamed image bookmark
- unnamed video bookmark
- unnamed plain bookmark
- named image gallary
- named video gallary
- named plain gallary (x)
- unnamed image gallary
- unnamed video gallary
- unnamed plain gallary (x)

实际上，只需要区分这样几种情况即可

- image gallary (named & unnamed)
- video gallary (named & unnamed)
- bookmark

## TODO

1. gallary filters

gallary

[] show named gallary
[] show unnamed gallary
[] show image gallary
[] show video gallary
[] show video bookmarks
