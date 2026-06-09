@echo off
echo === Try 1: POST with services array ===
curl -s -X POST "https://api.supabase.com/v1/projects/YOUR_PROJECT_REF/restart" ^
  -H "Authorization: Bearer SUPABASE_PAT_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"restart_services\": [\"postgrest\"]}"

echo.
echo === Try 2: POST /restart/services ===
curl -s -X POST "https://api.supabase.com/v1/projects/YOUR_PROJECT_REF/restart/services" ^
  -H "Authorization: Bearer SUPABASE_PAT_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{}"

echo.
echo === Try 3: POST with database flag ===
curl -s -X POST "https://api.supabase.com/v1/projects/YOUR_PROJECT_REF/restart" ^
  -H "Authorization: Bearer SUPABASE_PAT_HERE"

echo.
echo === Try 4: Check project settings endpoint ===
curl -s "https://api.supabase.com/v1/projects/YOUR_PROJECT_REF/config/database" ^
  -H "Authorization: Bearer SUPABASE_PAT_HERE"

echo.
