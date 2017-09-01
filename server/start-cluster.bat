@echo off
FOR /F "tokens=5 delims= " %%P IN ('netstat -a -n -o ^| findstr :3001.*LISTENING') DO TaskKill.exe /F /PID %%P
FOR /F "tokens=5 delims= " %%P IN ('netstat -a -n -o ^| findstr :3002.*LISTENING') DO TaskKill.exe /F /PID %%P
FOR /F "tokens=5 delims= " %%P IN ('netstat -a -n -o ^| findstr :3003.*LISTENING') DO TaskKill.exe /F /PID %%P
start /B npm.cmd start -- 3001
start /B npm.cmd start -- 3002
start /B npm.cmd start -- 3003