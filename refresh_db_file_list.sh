 #!/bin/bash
echo "filelist=\`" > db/filelist.js
find -L db >> db/filelist.js
echo "\`;" >> db/filelist.js
