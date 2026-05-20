#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自动更新脚本 — 被定时任务调用
每 12 小时执行一次：
  1. 爬取 eblcu.net 最新比分
  2. 有变化就提交并推送 GitHub
"""

import json
import os
import subprocess
import sys
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(SCRIPT_DIR, 'data.json')
SCRAPE_SCRIPT = os.path.join(SCRIPT_DIR, 'scrape_eblcu.py')


def log(msg):
    print(f'[{datetime.now().strftime("%H:%M:%S")}] {msg}')


def git_has_changes():
    """检查 data.json 是否有未提交的修改"""
    result = subprocess.run(
        ['git', 'diff', '--name-only', DATA_FILE],
        capture_output=True, text=True, cwd=SCRIPT_DIR
    )
    return bool(result.stdout.strip())


def main():
    log('🚀 自动更新开始')

    # 1. 读取当前数据快照
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        before = json.load(f)

    # 2. 保存修改前的 git hash
    result = subprocess.run(
        ['git', 'rev-parse', 'HEAD'],
        capture_output=True, text=True, cwd=SCRIPT_DIR
    )
    old_hash = result.stdout.strip()

    # 3. 运行爬虫（无交互模式）
    log('🌐 爬取 eblcu.net...')
    result = subprocess.run(
        [sys.executable, SCRAPE_SCRIPT],
        capture_output=True, text=True, cwd=SCRIPT_DIR
    )
    print(result.stdout)
    if result.stderr:
        print(result.stderr)

    # 4. 检查 data.json 有没有变化
    if not git_has_changes():
        log('ℹ️ 没有新比分，跳过推送')
        return

    # 5. 读取更新后的数据，看看变了什么
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        after = json.load(f)

    # 统计比分有变化的场次
    updates = 0
    for am, bm in zip(after['schedule'], before['schedule']):
        if am['score'] != bm['score'] and am['score'] != '-':
            updates += 1

    log(f'⚽ {updates} 场比赛比分更新')

    # 6. 提交并推送
    try:
        subprocess.run(['git', 'add', DATA_FILE], check=True, cwd=SCRIPT_DIR)
        today = datetime.now().strftime('%Y-%m-%d %H:%M')
        subprocess.run(
            ['git', 'commit', '-m', f'📊 自动更新比分 {today}'],
            check=True, cwd=SCRIPT_DIR
        )
        result = subprocess.run(
            ['git', 'push'],
            capture_output=True, text=True, cwd=SCRIPT_DIR
        )
        if result.returncode == 0:
            log('✅ 已推送到 GitHub')
        else:
            log(f'⚠️ 推送失败: {result.stderr[:200]}')
    except subprocess.CalledProcessError as e:
        log(f'⚠️ Git 操作失败: {e}')

    log('🎉 自动更新完成')


if __name__ == '__main__':
    main()
