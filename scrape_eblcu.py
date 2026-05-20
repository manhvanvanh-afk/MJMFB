#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
爬取 eblcu.net 上的世界杯比赛结果，自动更新到 data.json

用法：
  python3 scrape_eblcu.py              # 爬取并更新
  python3 scrape_eblcu.py --dry        # 只看不更新
  python3 scrape_eblcu.py --show       # 显示当前所有比分
  python3 scrape_eblcu.py --today      # 显示今日比赛
"""

import json
import os
import sys
import re
import subprocess
from shutil import copy2
from datetime import datetime, date

DATA_FILE = os.path.join(os.path.dirname(__file__), 'data.json')
URL = 'https://eblcu.net'

# 轮次名称（显示用）
ROUND_LABELS = {
    'group': '小组赛', 'r32': '1/16决赛', 'r16': '1/8决赛',
    'r8': '1/4决赛', 'semi': '半决赛', 'thirdPlace': '季军赛', 'final': '总决赛'
}
ALL_ROUNDS = ['group', 'r32', 'r16', 'r8', 'semi', 'thirdPlace', 'final']


def fetch_html():
    """下载 eblcu.net 页面"""
    print(f'🌐 正在下载: {URL}')
    result = subprocess.run(
        ['curl', '-sL', URL],
        capture_output=True, text=True, timeout=30
    )
    if result.returncode != 0:
        print(f'❌ 下载失败: {result.stderr}')
        sys.exit(1)
    html = result.stdout
    print(f'✅ 下载完成 ({len(html)} 字节)')
    return html


def parse_matches(html):
    """从 HTML 解析所有比赛数据"""
    all_matches = []

    for round_key in ALL_ROUNDS:
        marker = f"x-show=\"activeTab === '{round_key}'\">"
        start = html.find(marker)
        if start < 0:
            continue

        # 找到该轮次结束位置（下一个 x-show）
        end = len(html)
        for r2 in ALL_ROUNDS:
            if r2 == round_key:
                continue
            m2 = f"x-show=\"activeTab === '{r2}'\">"
            i2 = html.find(m2, start + 50)
            if 0 < i2 < end:
                end = i2

        section = html[start:end]

        # 按日期分组
        date_blocks = re.findall(
            r'<span class="font-medium date">\s*([^<]+)\s*</span>.*?'
            r'<div class="divide-y divide-gray-100 matches-list">(.*?)'
            r'</div>\s*</div>\s*</div>',
            section, re.DOTALL
        )

        for date_str, matches_html in date_blocks:
            date_str = date_str.strip()

            # 解析该日期下所有比赛
            match_items = re.findall(
                r'<div class="p-3 flex items-center gap-2[^"]* match-item">(.*?)</div>\s*</div>',
                matches_html, re.DOTALL
            )

            for item in match_items:
                m = _parse_one(item)
                if m:
                    m['date'] = date_str
                    m['round'] = round_key
                    all_matches.append(m)

    return all_matches


def _parse_one(item):
    """解析单个比赛条目"""
    # 时间
    time_m = re.search(r'match-time">\s*([\d:]+)\s*<', item)
    if not time_m:
        return None
    time_str = time_m.group(1).strip()

    # 主队（靠右对齐的 span）
    home_m = re.search(
        r'<span class="truncate text-right text-gray-700">\s*([^<]+?)\s*</span>', item
    )
    if not home_m:
        return None
    home = home_m.group(1).strip()

    # 客队（所有 .text-gray-700 中的最后一个）
    all_spans = re.findall(
        r'<span class="truncate text-gray-700">\s*([^<]+?)\s*</span>', item
    )
    away = all_spans[-1].strip() if all_spans else ''

    # 比分
    score_m = re.search(
        r'class="mx-2 text-sm font-semibold text-gray-900 shrink-0 score">'
        r'\s*(\d+)\s*<span.*?VS.*?</span>\s*(\d+)\s*<',
        item, re.DOTALL
    )
    score = f'{score_m.group(1)}:{score_m.group(2)}' if score_m else '-'

    return {'time': time_str, 'home': home, 'away': away, 'score': score}


def match_and_update(data_matches, scraped_matches, dry_run=False):
    """
    将爬取结果匹配到 data.json
    规则：
    - 还没开始的比赛（未来日期）→ 跳过，保持 "-"
    - 当天比赛且比分 0:0 → 跳过（可能还没踢）
    - 已有比分的比赛 → 更新
    """
    today = date.today()
    today_str = today.isoformat()

    updates = 0
    team_updates = 0
    skipped = 0
    unchanged = 0
    not_found = 0

    for sm in scraped_matches:
        match_date = sm['date']

        # ---- 判断这场比赛是否需要处理 ----
        # 还没到日期的比赛：跳过
        if match_date > today_str:
            skipped += 1
            continue

        # 如果是今天，但比分是 0:0，可能还没踢 → 跳过
        if match_date == today_str and sm['score'] == '0:0':
            skipped += 1
            continue

        # ---- 在 data.json 中找匹配 ----
        candidates = [
            dm for dm in data_matches
            if dm['date'] == sm['date'] and dm['time'] == sm['time']
        ]

        found = None
        for dm in candidates:
            home_ok = (dm['home'].strip() == sm['home'].strip() or dm['home'] == '待定')
            away_ok = (dm['away'].strip() == sm['away'].strip() or dm['away'] == '待定')
            if home_ok and away_ok:
                found = dm
                break

        if not found:
            not_found += 1
            print(f'  ⚠️ 未匹配: {sm["date"]} {sm["time"]} {sm["home"]} vs {sm["away"]}')
            continue

        # ---- 更新球队（淘汰赛）----
        if found['home'] == '待定' and sm['home'] != '待定':
            print(f'  🏃 队伍更新: {sm["date"]} {sm["time"]} {found["home"]} → {sm["home"]}')
            found['home'] = sm['home']
            team_updates += 1

        if found['away'] == '待定' and sm['away'] != '待定':
            print(f'  🏃 队伍更新: {sm["date"]} {sm["time"]} {found["away"]} → {sm["away"]}')
            found['away'] = sm['away']
            team_updates += 1

        # ---- 更新比分 ----
        old_score = found['score']
        new_score = sm['score']
        if old_score != new_score:
            found['score'] = new_score
            updates += 1
            print(f'  ⚽ 比分更新: {sm["date"]} {sm["time"]} {found["home"]} vs {found["away"]}: {old_score} → {new_score}')
        else:
            unchanged += 1

    return updates, team_updates, skipped, unchanged, not_found


def show_summary(data):
    """显示概要"""
    today_str = date.today().isoformat()
    print(f'\n📋 当前数据概览:')
    print(f'  👥 {len(data["leaderboard"])} 位同学')
    print(f'  ⚽ {len(data["schedule"])} 场比赛')

    # 统计已完成和未开始的比赛
    completed = sum(1 for m in data['schedule'] if m['score'] != '-')
    not_started = len(data['schedule']) - completed
    print(f'  ✅ 已出比分: {completed} 场')
    print(f'  ⏳ 未开始: {not_started} 场')

    # 今日比赛
    today_matches = [m for m in data['schedule'] if m['date'] == today_str]
    if today_matches:
        print(f'\n📅 今日比赛 ({today_str}):')
        for m in sorted(today_matches, key=lambda x: x['time']):
            print(f'  {m["time"]}  {m["home"]:20s} vs {m["away"]:20s}  {m["score"]}')


def show_today(data):
    """仅显示今日比赛"""
    today_str = date.today().isoformat()
    today_matches = [m for m in data['schedule'] if m['date'] == today_str]
    today_matches.sort(key=lambda x: x['time'])

    print(f'\n📅 {today_str} 的比赛:')
    if not today_matches:
        print('  今天没有比赛')
        return

    for m in today_matches:
        score = m['score']
        print(f'  {m["time"]}  {m["home"]:20s} vs {m["away"]:20s}  {score}')


def main():
    dry_run = '--dry' in sys.argv
    show_mode = '--show' in sys.argv
    today_mode = '--today' in sys.argv

    print('🏆 从 eblcu.net 爬取世界杯赛果')
    print('=' * 40)

    # 先读取 data.json
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if show_mode:
        show_summary(data)
        return

    if today_mode:
        show_today(data)
        return

    # 1. 下载
    html = fetch_html()

    # 2. 解析
    print('\n🔍 解析比赛...')
    scraped = parse_matches(html)
    print(f'✅ 共 {len(scraped)} 场')

    # 按轮次统计
    for rk in ALL_ROUNDS:
        cnt = sum(1 for m in scraped if m['round'] == rk)
        if cnt:
            print(f'    {ROUND_LABELS[rk]}: {cnt} 场')

    # 3. 匹配更新
    print('\n📊 匹配更新...')
    data['schedule'].sort(key=lambda x: (x['date'], x['time'], x['id']))

    updates, team_updates, skipped, unchanged, not_found = match_and_update(
        data['schedule'], scraped
    )

    print(f'\n📈 统计:')
    print(f'  比分更新: {updates}')
    print(f'  队伍更新: {team_updates}')
    print(f'  跳过(未到日期): {skipped}')
    print(f'  无变化: {unchanged}')
    print(f'  未匹配: {not_found}')

    # 4. 保存
    if dry_run:
        print(f'\n💡 试运行，未修改文件')
    else:
        # 有变更才保存
        if updates > 0 or team_updates > 0:
            backup = f'data_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
            copy2(DATA_FILE, os.path.join(os.path.dirname(__file__), backup))
            print(f'\n💾 已备份: {backup}')

            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f'✅ data.json 已更新')
        else:
            print(f'\n💡 没有需要更新的内容')

    print('\n🎉 完成')


if __name__ == '__main__':
    main()
