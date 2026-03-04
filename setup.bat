@echo off
echo === Money Manager - Setup ===
echo.
echo Instalando dependencias...
npm install
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo ERRO: npm install falhou. Verifique sua conexão com a internet.
  pause
  exit /b 1
)
echo.
echo === Dependencias instaladas com sucesso! ===
echo.
echo IMPORTANTE: Configure o arquivo .env com suas credenciais Supabase
echo Abra o arquivo .env e substitua os valores de:
echo   VITE_SUPABASE_URL
echo   VITE_SUPABASE_ANON_KEY
echo.
echo Apos configurar o .env, rode: npm run dev
echo.
pause
