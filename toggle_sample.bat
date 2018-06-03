:: you can still see the samples easier after you add your own database following below instruction
::
:: 1. put your database in another folder
:: 2. change this file to fix the folder name below
:: 3. click this batch file to link or unlink your database
::    when it's linked, there will be a symbol link named `db` in this folder, and your database takes effect
::    when it's unlinked, there won't be the `db`, and sample takes effect


set dblocation=%USERPROFILE%\OneDrive\FUN\adb\db
if exist db (
    del db
) else (
    mklink db "%dblocation%"
)