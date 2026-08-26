@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem ============================================================================
rem  JARVIS Official Setup
rem  Installs the local JARVIS assistant stack on Windows 10 / 11.
rem
rem    - verifies Python 3.10+
rem    - creates the JARVIS folder tree
rem    - builds an isolated virtual environment
rem    - installs the Python dependencies
rem    - installs Ollama and pulls the local language model
rem    - writes config.json / .env on first run (never overwrites)
rem    - creates "Run JARVIS.bat" plus desktop and Start Menu shortcuts
rem    - runs a self-test and reports what works
rem
rem  Nothing here requires administrator rights except the optional winget
rem  installs, which prompt on their own.
rem ============================================================================

title JARVIS Official Setup

set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

set "APP_NAME=JARVIS"
set "INSTALL_DIR=%USERPROFILE%\JARVIS"
set "MODEL=llama3.1:8b"
set "SKIP_OLLAMA=0"
set "SKIP_MODEL=0"
set "FORCE=0"
set "MAKE_SHORTCUT=1"
set "DO_PAUSE=1"
set "EXITCODE=0"
set "WARNINGS=0"
set "STEP=0"
set "TOTAL_STEPS=9"
set "LOG="

rem ---------------------------------------------------------------- arguments
:parse_args
if "%~1"=="" goto args_done
set "ARG=%~1"
if /i "!ARG!"=="-h"             goto usage
if /i "!ARG!"=="--help"         goto usage
if /i "!ARG!"=="/?"             goto usage
if /i "!ARG!"=="--dir"          ( set "INSTALL_DIR=%~2" & shift & shift & goto parse_args )
if /i "!ARG!"=="--model"        ( set "MODEL=%~2"       & shift & shift & goto parse_args )
if /i "!ARG!"=="--skip-ollama"  ( set "SKIP_OLLAMA=1"   & shift & goto parse_args )
if /i "!ARG!"=="--skip-model"   ( set "SKIP_MODEL=1"    & shift & goto parse_args )
if /i "!ARG!"=="--force"        ( set "FORCE=1"         & shift & goto parse_args )
if /i "!ARG!"=="--no-shortcut"  ( set "MAKE_SHORTCUT=0" & shift & goto parse_args )
if /i "!ARG!"=="--no-pause"     ( set "DO_PAUSE=0"      & shift & goto parse_args )
echo Unknown option: !ARG!
echo.
goto usage

:usage
echo.
echo   JARVIS Official Setup
echo.
echo   Usage: "JARVIS Official Setup.bat" [options]
echo.
echo     --dir ^<path^>     Install location      (default %%USERPROFILE%%\JARVIS)
echo     --model ^<name^>   Ollama model to pull  (default llama3.1:8b)
echo     --skip-ollama     Do not install or check Ollama
echo     --skip-model      Install Ollama but do not pull the model
echo     --force           Rebuild the virtual environment from scratch
echo     --no-shortcut     Do not create desktop / Start Menu shortcuts
echo     --no-pause        Do not wait for a key press when finished
echo     -h, --help        Show this help
echo.
endlocal
exit /b 0

:args_done
if "%INSTALL_DIR%"=="" ( echo   [ERROR] --dir needs a path. & endlocal & exit /b 2 )
if "%MODEL%"==""       ( echo   [ERROR] --model needs a name. & endlocal & exit /b 2 )
if "%INSTALL_DIR:~-1%"=="\" set "INSTALL_DIR=%INSTALL_DIR:~0,-1%"

set "VENV=%INSTALL_DIR%\.venv"
set "VPY=%VENV%\Scripts\python.exe"
set "VPIP=%VENV%\Scripts\pip.exe"

cls
echo.
echo  ==========================================================
echo    J A R V I S   -   O f f i c i a l   S e t u p
echo  ==========================================================
echo.
echo    Install location : %INSTALL_DIR%
echo    Language model   : %MODEL%
echo.

rem ------------------------------------------------------- 1. folder structure
call :step "Creating the JARVIS folder structure"
for %%D in ("%INSTALL_DIR%" "%INSTALL_DIR%\logs" "%INSTALL_DIR%\config" "%INSTALL_DIR%\data" "%INSTALL_DIR%\models" "%INSTALL_DIR%\skills") do (
    if not exist "%%~D" mkdir "%%~D" 2>nul
    if not exist "%%~D" (
        call :err "Could not create %%~D - check the path and your permissions."
        goto finish
    )
)
set "LOG=%INSTALL_DIR%\logs\setup.log"
>"%LOG%" echo === JARVIS setup started %DATE% %TIME% ===
call :log "install dir: %INSTALL_DIR%"
call :log "model: %MODEL%"
echo   OK - %INSTALL_DIR%

rem ------------------------------------------------------------ 2. environment
call :step "Checking the Windows environment"
for /f "tokens=4-5 delims=. " %%A in ('ver') do set "WINVER=%%A.%%B"
echo   Windows version : %WINVER%
call :log "windows %WINVER%"

net session >nul 2>&1
if errorlevel 1 (
    echo   Elevation       : standard user ^(fine - only winget may prompt^)
) else (
    echo   Elevation       : administrator
)

set "ONLINE=0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "try{ (New-Object Net.Sockets.TcpClient).Connect('pypi.org',443); exit 0 }catch{ exit 1 }" >nul 2>&1
if not errorlevel 1 set "ONLINE=1"
if "%ONLINE%"=="1" (
    echo   Network         : reachable
) else (
    call :warn "No connection to pypi.org - downloads will probably fail."
)

rem ----------------------------------------------------------------- 3. python
call :step "Looking for Python 3.10 or newer"
set "PY="
set "PYVER="
for %%C in ("py -3" "python" "python3") do (
    if not defined PY (
        for /f "delims=" %%V in ('%%~C -c "import sys;print(sys.version.split()[0])" 2^>nul') do (
            set "PY=%%~C"
            set "PYVER=%%V"
        )
    )
)

if not defined PY (
    call :warn "Python was not found on this machine."
    call :try_winget_install "Python.Python.3.12" "Python 3.12"
    for %%C in ("py -3" "python" "python3") do (
        if not defined PY (
            for /f "delims=" %%V in ('%%~C -c "import sys;print(sys.version.split()[0])" 2^>nul') do (
                set "PY=%%~C"
                set "PYVER=%%V"
            )
        )
    )
)

if not defined PY (
    call :err "Python 3.10+ is required. Install it from https://www.python.org/downloads/windows/ (tick 'Add python.exe to PATH') and run this setup again."
    goto finish
)

%PY% -c "import sys;raise SystemExit(0 if sys.version_info[:2]>=(3,10) else 1)" >nul 2>&1
if errorlevel 1 (
    call :err "Found Python %PYVER%, but JARVIS needs 3.10 or newer."
    goto finish
)
echo   OK - Python %PYVER% ^(%PY%^)
call :log "python %PYVER% via %PY%"

rem ---------------------------------------------------------------- 4. payload
call :step "Copying the JARVIS application files"
set "MISSING="
for %%F in ("jarvis.py" "requirements.txt" "config.default.json") do (
    if not exist "%SCRIPT_DIR%\%%~F" set "MISSING=!MISSING! %%~F"
)
if defined MISSING (
    call :err "These files are missing next to the setup script:!MISSING!"
    echo           Run the setup from the folder you extracted, not from a copy
    echo           of the .bat on its own.
    goto finish
)
copy /y "%SCRIPT_DIR%\jarvis.py"           "%INSTALL_DIR%\jarvis.py"           >nul || ( call :err "Could not copy jarvis.py" & goto finish )
copy /y "%SCRIPT_DIR%\requirements.txt"    "%INSTALL_DIR%\requirements.txt"    >nul || ( call :err "Could not copy requirements.txt" & goto finish )
copy /y "%SCRIPT_DIR%\config.default.json" "%INSTALL_DIR%\config\config.default.json" >nul || ( call :err "Could not copy config.default.json" & goto finish )
if exist "%SCRIPT_DIR%\skills\*" xcopy /y /e /i /q "%SCRIPT_DIR%\skills" "%INSTALL_DIR%\skills" >nul
echo   OK - application files in place

rem ------------------------------------------------------------------ 5. venv
call :step "Building the Python virtual environment"
if "%FORCE%"=="1" if exist "%VENV%" (
    echo   Removing the old environment ^(--force^)...
    rmdir /s /q "%VENV%"
)
if not exist "%VPY%" (
    echo   Creating %VENV% ...
    %PY% -m venv "%VENV%" >>"%LOG%" 2>&1
)
if not exist "%VPY%" (
    call :err "Virtual environment creation failed - see %LOG%"
    goto finish
)
echo   OK - %VENV%

rem ---------------------------------------------------------- 6. dependencies
call :step "Installing the Python dependencies (this can take a few minutes)"
"%VPY%" -m pip install --upgrade pip setuptools wheel >>"%LOG%" 2>&1
if errorlevel 1 call :warn "pip could not update itself - continuing anyway."

"%VPY%" -m pip install -r "%INSTALL_DIR%\requirements.txt" >>"%LOG%" 2>&1
if errorlevel 1 (
    call :err "Dependency installation failed. The full pip output is in %LOG%"
    goto finish
)
echo   OK - dependencies installed

rem --------------------------------------------------------------- 7. ollama
call :step "Setting up Ollama and the local model"
if "%SKIP_OLLAMA%"=="1" (
    echo   Skipped ^(--skip-ollama^)
    goto after_ollama
)

set "OLLAMA="
for /f "delims=" %%P in ('where ollama 2^>nul') do if not defined OLLAMA set "OLLAMA=%%P"
if not defined OLLAMA if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" set "OLLAMA=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"

if not defined OLLAMA (
    echo   Ollama is not installed yet.
    call :try_winget_install "Ollama.Ollama" "Ollama"
    for /f "delims=" %%P in ('where ollama 2^>nul') do if not defined OLLAMA set "OLLAMA=%%P"
    if not defined OLLAMA if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" set "OLLAMA=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
)

if not defined OLLAMA (
    call :warn "Ollama could not be installed automatically. Get it from https://ollama.com/download and then run:  ollama pull %MODEL%"
    goto after_ollama
)
echo   Found Ollama : !OLLAMA!
call :log "ollama at !OLLAMA!"

rem make sure the local server is answering before we ask it to pull
"!OLLAMA!" list >nul 2>&1
if errorlevel 1 (
    echo   Starting the Ollama service...
    start "" /b "!OLLAMA!" serve >>"%LOG%" 2>&1
    call :wait_for_ollama "!OLLAMA!"
)

if "%SKIP_MODEL%"=="1" (
    echo   Model pull skipped ^(--skip-model^)
    goto after_ollama
)

"!OLLAMA!" list 2>nul | find /i "%MODEL%" >nul
if not errorlevel 1 (
    echo   OK - %MODEL% is already downloaded
    goto after_ollama
)
echo   Pulling %MODEL% - this is a multi-gigabyte download...
"!OLLAMA!" pull %MODEL%
if errorlevel 1 (
    call :warn "Could not pull %MODEL%. Run 'ollama pull %MODEL%' by hand when you are ready."
) else (
    echo   OK - %MODEL% downloaded
)

:after_ollama

rem ------------------------------------------------------- 8. config + launcher
call :step "Writing the configuration and launcher"
if exist "%INSTALL_DIR%\config\config.json" (
    echo   Keeping your existing config\config.json
) else (
    copy /y "%INSTALL_DIR%\config\config.default.json" "%INSTALL_DIR%\config\config.json" >nul
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='%INSTALL_DIR%\config\config.json'; $j=Get-Content -Raw $p | ConvertFrom-Json; $j.model='%MODEL%'; $j | ConvertTo-Json -Depth 10 | Set-Content -Path $p -Encoding UTF8" >>"%LOG%" 2>&1
    echo   Created config\config.json
)

if not exist "%INSTALL_DIR%\.env" (
    (
        echo # JARVIS environment overrides - anything here wins over config.json
        echo JARVIS_MODEL=%MODEL%
        echo JARVIS_OLLAMA_HOST=http://127.0.0.1:11434
        echo # JARVIS_VOICE=1
        echo # JARVIS_LOG_LEVEL=INFO
    ) > "%INSTALL_DIR%\.env"
    echo   Created .env
) else (
    echo   Keeping your existing .env
)

(
    echo @echo off
    echo setlocal
    echo cd /d "%%~dp0"
    echo if not exist ".venv\Scripts\python.exe" ^(
    echo     echo JARVIS is not installed here. Run "JARVIS Official Setup.bat" first.
    echo     pause
    echo     exit /b 1
    echo ^)
    echo title JARVIS
    echo ".venv\Scripts\python.exe" "jarvis.py" %%*
    echo set "RC=%%ERRORLEVEL%%"
    echo if not "%%RC%%"=="0" pause
    echo exit /b %%RC%%
) > "%INSTALL_DIR%\Run JARVIS.bat"
echo   Created "Run JARVIS.bat"

if "%MAKE_SHORTCUT%"=="1" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$w=New-Object -ComObject WScript.Shell; foreach($d in @([Environment]::GetFolderPath('Desktop'), (Join-Path ([Environment]::GetFolderPath('Programs')) 'JARVIS'))){ if(-not (Test-Path $d)){ New-Item -ItemType Directory -Path $d -Force | Out-Null }; $s=$w.CreateShortcut((Join-Path $d 'JARVIS.lnk')); $s.TargetPath='%INSTALL_DIR%\Run JARVIS.bat'; $s.WorkingDirectory='%INSTALL_DIR%'; $s.Description='Start the local JARVIS assistant'; $s.Save() }" >>"%LOG%" 2>&1
    if errorlevel 1 (
        call :warn "Shortcuts could not be created - launch JARVIS from %INSTALL_DIR%"
    ) else (
        echo   Created desktop and Start Menu shortcuts
    )
) else (
    echo   Shortcuts skipped ^(--no-shortcut^)
)

rem ------------------------------------------------------------- 9. self-test
call :step "Running the self-test"
"%VPY%" "%INSTALL_DIR%\jarvis.py" --selftest
if errorlevel 2 (
    call :err "Self-test failed - JARVIS is not usable yet. See the output above and %LOG%"
    goto finish
)
if errorlevel 1 call :warn "Self-test finished with warnings - the optional voice features may be unavailable."

:finish
echo.
echo  ==========================================================
if "%EXITCODE%"=="0" (
    echo    Setup complete.
    echo.
    echo    Start JARVIS  : "%INSTALL_DIR%\Run JARVIS.bat"
    echo    Voice mode    : "%INSTALL_DIR%\Run JARVIS.bat" --voice
    echo    One question  : "%INSTALL_DIR%\Run JARVIS.bat" --ask "hello"
    echo    Settings      : %INSTALL_DIR%\config\config.json
    if not "%WARNINGS%"=="0" echo.
    if not "%WARNINGS%"=="0" echo    Finished with %WARNINGS% warning^(s^) - see %LOG%
) else (
    echo    Setup did not finish.
    if defined LOG echo    Log: %LOG%
)
echo  ==========================================================
echo.
if defined LOG >>"%LOG%" echo === finished with exit code %EXITCODE%, %WARNINGS% warning(s) %DATE% %TIME% ===
if "%DO_PAUSE%"=="1" pause
endlocal & exit /b %EXITCODE%

rem ============================================================== subroutines

:step
set /a STEP+=1
echo.
echo  [!STEP!/%TOTAL_STEPS%] %~1
call :log "step !STEP!: %~1"
goto :eof

:log
if not defined LOG goto :eof
>>"%LOG%" echo [%TIME%] %~1
goto :eof

:warn
set /a WARNINGS+=1
echo   [WARN] %~1
call :log "WARN: %~1"
goto :eof

:err
echo.
echo   [ERROR] %~1
call :log "ERROR: %~1"
set "EXITCODE=1"
goto :eof

:try_winget_install
rem %1 = winget package id, %2 = friendly name
where winget >nul 2>&1
if errorlevel 1 (
    call :warn "winget is not available, so %~2 cannot be installed automatically."
    goto :eof
)
echo   Installing %~2 with winget...
winget install --id %~1 -e --accept-package-agreements --accept-source-agreements >>"%LOG%" 2>&1
if errorlevel 1 (
    call :warn "winget could not install %~2."
) else (
    echo   %~2 installed. Refreshing PATH...
    for /f "skip=2 tokens=2,*" %%A in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set "USERPATH=%%B"
    for /f "skip=2 tokens=2,*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do set "SYSPATH=%%B"
    set "PATH=!SYSPATH!;!USERPATH!"
)
goto :eof

:wait_for_ollama
rem %1 = path to ollama.exe - poll for up to ~30 seconds
set "TRIES=0"
:wait_loop
"%~1" list >nul 2>&1
if not errorlevel 1 goto :eof
set /a TRIES+=1
if !TRIES! GEQ 15 (
    call :warn "The Ollama service did not come up. Start the Ollama app, then run 'ollama pull %MODEL%'."
    goto :eof
)
ping -n 3 127.0.0.1 >nul 2>&1
goto wait_loop
