#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GitHub Actions 云端自动更新脚本。

每次运行只更新数据文件：
  1. 爬取世界杯比赛比分，更新 data.json
  2. 爬取世界杯赔率 / 参考指数，更新 odds_data.json
  3. 写入北京时间最后更新时间，供首页显示
"""

import json
import os
import subprocess
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(SCRIPT_DIR, "data.json")
ODDS_FILE = os.path.join(SCRIPT_DIR, "odds_data.json")
SCRAPE_SCORE_SCRIPT = os.path.join(SCRIPT_DIR, "scrape_eblcu.py")
SCRAPE_ODDS_SCRIPT = os.path.join(SCRIPT_DIR, "scrape_odds.py")
BEIJING_TZ = ZoneInfo("Asia/Shanghai")


def log(message):
    print(f"[{datetime.now(BEIJING_TZ).strftime('%H:%M:%S')}] {message}")


def run_script(path):
    """运行一个爬虫脚本。失败时打印日志，但不中断另一项数据更新。"""
    log(f"运行 {os.path.basename(path)}")
    result = subprocess.run(
        [sys.executable, path],
        cwd=SCRIPT_DIR,
        text=True,
        capture_output=True,
    )
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr)
    if result.returncode != 0:
        log(f"{os.path.basename(path)} 运行失败，返回码：{result.returncode}")
    return result.returncode == 0


def load_json(path, fallback):
    if not os.path.exists(path):
        return fallback
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def write_last_updated(score_ok, odds_ok):
    """把最后更新时间写入 data.json。页面只读这个字段，不改 UI。"""
    now = datetime.now(BEIJING_TZ).replace(second=0, microsecond=0)
    text = f"{now.year}年{now.month}月{now.day}日 {now.hour:02d}:{now.minute:02d}"

    data = load_json(DATA_FILE, {})
    data["lastUpdatedAt"] = now.isoformat()
    data["lastUpdatedText"] = text
    data["lastUpdatedSource"] = "GitHub Actions"
    data["lastUpdateStatus"] = {
        "score": "ok" if score_ok else "failed",
        "odds": "ok" if odds_ok else "failed",
    }
    write_json(DATA_FILE, data)

    odds = load_json(ODDS_FILE, {
        "source": "好运计算器",
        "api": "https://justpost.haoyun999.cn/api",
        "count": 0,
        "matches": [],
    })
    odds["lastUpdatedAt"] = now.isoformat()
    odds["updatedAt"] = text
    write_json(ODDS_FILE, odds)

    log(f"最后更新时间：{text}")


def main():
    log("云端自动更新开始")
    score_ok = run_script(SCRAPE_SCORE_SCRIPT)
    odds_ok = run_script(SCRAPE_ODDS_SCRIPT)
    write_last_updated(score_ok, odds_ok)
    log("云端自动更新完成")


if __name__ == "__main__":
    main()
