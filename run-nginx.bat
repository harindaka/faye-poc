@echo off
for /f "delims=" %%i in ('where nginx') do set NGINX_PATH=%%i
For %%A in ("%NGINX_PATH%") do (
    Set NGINX_FOLDER_PATH=%%~dpA
    REM Set Name=%%~nxA
)

taskkill /F /IM "nginx.exe*"
nginx.exe -p %NGINX_FOLDER_PATH% -c %~dp0nginx\nginx.conf