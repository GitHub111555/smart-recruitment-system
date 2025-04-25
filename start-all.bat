 
@echo off
echo 🟢 Starting Smart Recruitment System...

REM 1️⃣ Job Application Service
start cmd /k "cd services && node jobApplicationService.js"
timeout /t 1 >nul

REM 2️⃣ Interview Service
start cmd /k "cd services && node interviewService.js"
timeout /t 1 >nul

REM 3️⃣ AI Filter Service
start cmd /k "cd services && node aiFilterService.js"
timeout /t 1 >nul

REM 4️⃣ Backend REST API Gateway
start cmd /k "cd backend && node server.js"
timeout /t 1 >nul

REM 5️⃣ Auth Server
start cmd /k "cd auth && node authServer.js"
timeout /t 1 >nul

REM 6️⃣ Frontend Static Server
start cmd /k "node frontendServer.js"
timeout /t 1 >nul


echo 🚀 All services launched. Open your frontend now.
pause
