:: requires http-server from node-js
:: npm install http-server -g
start "" cmd.exe /C http-server . -p 1081
::start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" -incognito http://localhost:1081/vdb.html

"C:\Program Files\Mozilla Firefox\firefox.exe" -no-remote -CreateProfile "adb %localappdata%\fxadb"
start "adb server" "C:\Program Files\Mozilla Firefox\firefox.exe" -no-remote -P "adb" http://localhost:1081/vdb.html

