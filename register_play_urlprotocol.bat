:: Run this with admin rights

reg add HKCR\play /ve /f /d "URL:PlayVideo"
reg add HKCR\play /v "URL Protocol" /f /d ""
reg add HKCR\play\shell\open\command /ve /f /d "wscript.exe """%~dp0play_video.js""" """%%1""""

reg add HKCR\tpvis /ve /f /d "URL:RefreshFileList"
reg add HKCR\tpvis /v "URL Protocol" /f /d ""
reg add HKCR\tpvis\shell\open\command /ve /f /d "wscript.exe """%~dp0refresh_db_file_list.js""" """%%1""""

pause