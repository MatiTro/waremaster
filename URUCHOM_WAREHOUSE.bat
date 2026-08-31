@echo off
setlocal
chcp 65001 >nul
title Warehouse Masterpress - uruchamianie lokalne
cd /d "%~dp0"

echo ================================================
echo       WAREHOUSE MASTERPRESS - START LOKALNY
echo ================================================
echo.

if not exist "package.json" (
  echo BLAD: Nie znaleziono pliku package.json.
  echo Najpierw rozpakuj caly ZIP do zwyklego folderu,
  echo a dopiero potem uruchom ten plik.
  goto :error
)

where node >nul 2>nul
if errorlevel 1 (
  echo BLAD: Nie znaleziono Node.js.
  echo Zainstaluj Node.js 22 LTS albo 24 LTS i uruchom komputer ponownie.
  goto :error
)

for /f "delims=" %%V in ('node -p "process.version"') do set "NODE_VERSION=%%V"
echo Wykryto Node.js %NODE_VERSION%

node -e "const [major, minor] = process.versions.node.split('.').map(Number); process.exit(major > 22 || (major === 22 && minor >= 13) ? 0 : 1)"
if errorlevel 1 (
  echo.
  echo BLAD: Ta aplikacja wymaga Node.js minimum 22.13.
  echo Zainstaluj Node.js 22 LTS albo 24 LTS ze strony https://nodejs.org/
  echo Po instalacji uruchom komputer ponownie.
  goto :error
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo BLAD: Nie znaleziono programu npm.
  echo Zainstaluj ponownie Node.js razem z npm.
  goto :error
)

if not exist "node_modules\.warehouse-masterpress-ready" (
  echo.
  echo Pierwsze uruchomienie: instaluje wymagane skladniki.
  echo To moze potrwać kilka minut. Nie zamykaj tego okna.
  echo.
  call npm.cmd ci --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo BLAD: Instalacja skladnikow nie powiodla sie.
    echo Zrob zdjecie ostatnich czerwonych komunikatow z tego okna.
    goto :error
  )
  type nul > "node_modules\.warehouse-masterpress-ready"
)

echo.
echo Aplikacja uruchamia sie pod adresem:
echo http://localhost:5173
echo.
echo Przegladarka otworzy sie automatycznie.
echo Nie zamykaj tego okna podczas korzystania z aplikacji.
echo Aby zatrzymac aplikacje, nacisnij Ctrl+C.
echo.
call npm.cmd run dev:local

if errorlevel 1 (
  echo.
  echo BLAD: Aplikacja nie uruchomila sie prawidlowo.
  goto :error
)
goto :end

:error
echo.
echo Okno pozostanie otwarte, zebys mogl odczytac komunikat.
pause
exit /b 1

:end
pause
endlocal
