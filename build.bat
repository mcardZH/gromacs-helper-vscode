@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM GROMACS Helper VS Code Extension 一键打包脚本 (Windows版本)
REM 作者: GROMACS Helper Team
REM 日期: 2025-06-22

echo 🚀 GROMACS Helper VS Code Extension 打包工具
echo =============================================

REM 检查是否在正确的目录
if not exist "package.json" (
    echo ❌ 错误: 请在项目根目录运行此脚本
    pause
    exit /b 1
)

REM 检查必要的依赖
where node >nul 2>nul
if errorlevel 1 (
    echo ❌ 错误: 请先安装 Node.js
    pause
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo ❌ 错误: 请先安装 npm
    pause
    exit /b 1
)

REM 获取当前版本
for /f "delims=" %%i in ('node -p "require('./package.json').version"') do set CURRENT_VERSION=%%i
echo 📋 当前版本: %CURRENT_VERSION%

echo.
echo 版本号格式说明:
echo   - 主版本.次版本.修订版本 (例如: 1.0.0)
echo   - 预发布版本 (例如: 1.0.0-beta.1)
echo   - 开发版本 (例如: 0.1.0)
echo.

REM 询问新版本号
:ask_version
set /p NEW_VERSION="🔢 请输入新版本号 (当前: %CURRENT_VERSION%, 直接回车使用当前版本): "

REM 如果用户直接回车，使用当前版本
if "%NEW_VERSION%"=="" (
    set NEW_VERSION=%CURRENT_VERSION%
    echo ✅ 使用当前版本: %NEW_VERSION%
    goto version_confirmed
)

REM 简单验证版本号格式
echo %NEW_VERSION% | findstr /R "^[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*" >nul
if errorlevel 1 (
    echo ❌ 版本号格式错误，请使用 x.y.z 格式 (例如: 1.0.0)
    goto ask_version
)

echo ✅ 版本号格式正确: %NEW_VERSION%

:version_confirmed

REM 询问是否要更新版本号
if not "%NEW_VERSION%"=="%CURRENT_VERSION%" (
    echo.
    echo 📝 将要进行的操作:
    echo   - 更新版本: %CURRENT_VERSION% → %NEW_VERSION%
    echo   - 编译 TypeScript 代码
    echo   - 打包为 VSIX 文件
    echo.
    
    set /p CONFIRM="❓ 确认继续? (y/N): "
    if /i not "%CONFIRM%"=="y" (
        echo ❌ 操作已取消
        pause
        exit /b 0
    )
    
    REM 更新 package.json 中的版本号
    echo 📝 更新版本号...
    powershell -Command "(Get-Content package.json) -replace '\"version\": \"%CURRENT_VERSION%\"', '\"version\": \"%NEW_VERSION%\"' | Set-Content package.json"
    echo ✅ 版本号已更新为: %NEW_VERSION%
)

echo.
echo 🔧 开始构建过程...

REM 安装依赖 (如果需要)
if not exist "node_modules" (
    echo 📦 安装依赖...
    npm install
)

REM 检查是否有 vsce
npm list @vscode/vsce >nul 2>nul
if errorlevel 1 (
    echo 📦 安装 vsce 打包工具...
    npm install @vscode/vsce --save-dev
)

REM 清理之前的构建文件
echo 🧹 清理旧文件...
del /q *.vsix 2>nul
if exist "dist" rmdir /s /q dist

REM 编译项目
echo ⚙️  编译 TypeScript...
npm run compile

REM 打包扩展
echo 📦 打包扩展...
npx vsce package --allow-star-activation

REM 检查生成的文件
set VSIX_FILE=gromacs-helper-vscode-%NEW_VERSION%.vsix

if exist "%VSIX_FILE%" (
    for %%A in ("%VSIX_FILE%") do set FILE_SIZE=%%~zA
    echo.
    echo 🎉 打包成功!
    echo =============================================
    echo 📁 生成文件: %VSIX_FILE%
    echo 📏 文件大小: %FILE_SIZE% 字节
    echo 📍 文件路径: %CD%\%VSIX_FILE%
    echo.
    echo 🔧 安装命令:
    echo   code --install-extension %VSIX_FILE%
    echo.
    echo 📤 分享文件:
    echo   将 %VSIX_FILE% 发送给其他用户即可安装
    echo.
    
    REM 询问是否立即安装
    set /p INSTALL_NOW="❓ 是否立即安装到当前编辑器? (y/N): "
    if /i "%INSTALL_NOW%"=="y" (
        echo 🔧 安装扩展...
        code --install-extension "%VSIX_FILE%"
        if errorlevel 0 (
            echo ✅ 扩展安装成功!
            echo 💡 重启编辑器以确保扩展正常工作
        ) else (
            echo ❌ 扩展安装失败，请手动安装
        )
    )
    
    REM 询问是否创建发布说明
    echo.
    set /p CREATE_CHANGELOG="❓ 是否创建发布说明文件? (y/N): "
    if /i "%CREATE_CHANGELOG%"=="y" (
        set CHANGELOG_FILE=RELEASE-%NEW_VERSION%.md
        
        echo # GROMACS Helper v%NEW_VERSION% 发布说明 > "!CHANGELOG_FILE!"
        echo. >> "!CHANGELOG_FILE!"
        echo 发布日期: %date% >> "!CHANGELOG_FILE!"
        echo. >> "!CHANGELOG_FILE!"
        echo ## 🆕 新功能 >> "!CHANGELOG_FILE!"
        echo - [ ] 添加新功能描述 >> "!CHANGELOG_FILE!"
        echo. >> "!CHANGELOG_FILE!"
        echo ## 🐛 问题修复 >> "!CHANGELOG_FILE!"
        echo - [ ] 修复问题描述 >> "!CHANGELOG_FILE!"
        echo. >> "!CHANGELOG_FILE!"
        echo ## 🔧 改进 >> "!CHANGELOG_FILE!"
        echo - [ ] 改进描述 >> "!CHANGELOG_FILE!"
        echo. >> "!CHANGELOG_FILE!"
        echo ## 📦 安装方法 >> "!CHANGELOG_FILE!"
        echo. >> "!CHANGELOG_FILE!"
        echo ### 直接安装 >> "!CHANGELOG_FILE!"
        echo ```bash >> "!CHANGELOG_FILE!"
        echo code --install-extension %VSIX_FILE% >> "!CHANGELOG_FILE!"
        echo ``` >> "!CHANGELOG_FILE!"
        echo. >> "!CHANGELOG_FILE!"
        echo ### 从 VS Code 界面安装 >> "!CHANGELOG_FILE!"
        echo 1. 打开 VS Code >> "!CHANGELOG_FILE!"
        echo 2. 按 `Ctrl+Shift+P` ^(macOS: `Cmd+Shift+P`^) >> "!CHANGELOG_FILE!"
        echo 3. 输入 "Extensions: Install from VSIX..." >> "!CHANGELOG_FILE!"
        echo 4. 选择 `%VSIX_FILE%` 文件 >> "!CHANGELOG_FILE!"
        echo. >> "!CHANGELOG_FILE!"
        echo ## 💾 下载 >> "!CHANGELOG_FILE!"
        echo - 文件: `%VSIX_FILE%` >> "!CHANGELOG_FILE!"
        echo - 大小: %FILE_SIZE% 字节 >> "!CHANGELOG_FILE!"
        
        echo 📝 已创建发布说明: !CHANGELOG_FILE!
    )
    
) else (
    echo ❌ 打包失败!
    pause
    exit /b 1
)

echo.
echo 🎊 所有操作完成!
pause
