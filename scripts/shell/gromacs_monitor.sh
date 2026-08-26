#!/bin/bash
# GROMACS 监控脚本 - 收集所有 gmx 进程信息
# 输出 JSON 格式，便于 Python 解析

# 查找所有 gmx 进程
pids=$(pgrep -x gmx)

if [ -z "$pids" ]; then
    echo '{"processes": []}'
    exit 0
fi

# 开始构建 JSON
echo '{"processes": ['

first=true
for pid in $pids; do
    # 跳过无效的 PID
    if [ ! -d "/proc/$pid" ]; then
        continue
    fi
    
    # 添加逗号分隔符
    if [ "$first" = false ]; then
        echo ","
    fi
    first=false
    
    # 获取命令行
    cmdline=$(cat /proc/$pid/cmdline 2>/dev/null | tr '\0' ' ' | sed 's/[[:space:]]*$//')
    
    # 获取工作目录
    cwd=$(readlink /proc/$pid/cwd 2>/dev/null)
    
    # 查找日志文件 (通过 lsof)
    log_file=""
    if command -v lsof >/dev/null 2>&1; then
        log_file=$(lsof -p $pid 2>/dev/null | grep -E '\.log.*[wu]' | awk '{for(i=9;i<=NF;i++) printf "%s ", $i; print ""}' | grep -v 'md.log' | head -n1 | sed 's/[[:space:]]*$//')
        
        # 如果没找到非 md.log 文件，尝试找 md.log
        if [ -z "$log_file" ]; then
            log_file=$(lsof -p $pid 2>/dev/null | grep -E '\.log.*[wu]' | awk '{for(i=9;i<=NF;i++) printf "%s ", $i; print ""}' | head -n1 | sed 's/[[:space:]]*$//')
        fi
    fi
    
    # 如果 lsof 失败，尝试在工作目录查找最新的 .log 文件
    if [ -z "$log_file" ] && [ -n "$cwd" ] && [ -d "$cwd" ]; then
        log_file=$(find "$cwd" -maxdepth 1 -name "*.log" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -n1 | cut -d' ' -f2-)
    fi
    
    # 读取日志文件的最后 50 行
    log_tail=""
    if [ -n "$log_file" ] && [ -f "$log_file" ]; then
        # 读取最后 10KB 或 50 行
        log_tail=$(tail -c 10240 "$log_file" 2>/dev/null | tail -n 50 | base64 -w0)
    fi
    
    # 输出 JSON 对象 (转义特殊字符)
    cmdline_escaped=$(echo "$cmdline" | sed 's/\\/\\\\/g; s/"/\\"/g; s/$/\\n/' | tr -d '\n' | sed 's/\\n$//')
    cwd_escaped=$(echo "$cwd" | sed 's/\\/\\\\/g; s/"/\\"/g')
    log_file_escaped=$(echo "$log_file" | sed 's/\\/\\\\/g; s/"/\\"/g')
    
    cat <<EOF
  {
    "pid": $pid,
    "cmdline": "$cmdline_escaped",
    "cwd": "$cwd_escaped",
    "log_file": "$log_file_escaped",
    "log_tail": "$log_tail"
  }
EOF
done

echo ''
echo ']}'
