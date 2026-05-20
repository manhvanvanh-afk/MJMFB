#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
2026 老同学世界杯联赛 — 每日数据更新
用法：python3 update_data.py

流程：
  1. 自动从 eblcu.net 爬取最新比分（无需手动输入）
  2. 输入投注记录（用户提供）
  3. 更新毒奶榜 / AI锐评 / MVP（可选）
  4. 保存并推送 GitHub
"""

import json
import os
import subprocess
import shutil
import sys
from datetime import datetime

DATA_FILE = 'data.json'


# ====== 工具函数 ======

def print_title(text):
    print()
    print('=' * 50)
    print(f'  {text}')
    print('=' * 50)
    print()

def get_input(prompt, default=None):
    if default is not None:
        result = input(f'{prompt}（默认: {default}）: ').strip()
        return result if result else default
    else:
        return input(f'{prompt}: ').strip()

def confirm(prompt):
    result = input(f'{prompt}（y/n）: ').strip().lower()
    return result in ('y', 'yes', '是', 'y是')


# ====== 第一步：自动爬取比分 ======

def step_scrape():
    """自动从 eblcu.net 爬取最新比赛结果"""
    print_title('第一步：自动爬取 eblcu.net 最新比分')
    print('  ℹ️  比分由爬虫自动获取，无需手动输入')
    print()

    result = subprocess.run(
        [sys.executable, 'scrape_eblcu.py'],
        capture_output=False
    )


# ====== 第二步：输入投注记录 ======

def step_bets(data):
    """输入每日投注记录"""
    print_title('第二步：输入投注记录')

    print('  格式示例:')
    print('    佑仔 8串1 200分 中了 赚3万')
    print('    凡强 10串1 300分 没中 亏300')
    print('    老王 墨西哥vs韩国 猜胜负 100分 中了 +500')
    print('    （留空结束）')
    print()

    bets = data.get('yesterdayBets', [])
    bet_history = data.get('betHistory', [])
    today_str = datetime.now().strftime('%Y-%m-%d')

    count = 0
    while True:
        line = input('  ➤ ').strip()
        if not line:
            break

        parts = line.split()
        if len(parts) >= 4:
            # 尝试解析盈亏数字
            last = parts[-1]
            try:
                if last.startswith('+'):
                    profit_val = int(last)
                elif last.startswith('赚'):
                    profit_val = int(last.replace('赚', ''))
                elif last.startswith('亏'):
                    profit_val = -int(last.replace('亏', ''))
                elif last.startswith('-'):
                    profit_val = -int(last.replace('-', ''))
                else:
                    profit_val = 0
            except:
                profit_val = 0

            # 判断中没中
            result_text = '中' if '中' in parts[-2] or '中' in line else '未中'
            if profit_val > 0:
                result_text = '中'

            bet = {
                'date': today_str,
                'player': parts[0],
                'type': parts[1],
                'detail': ' '.join(parts[2:-2]) if len(parts) > 4 else parts[2],
                'stake': parts[-2],
                'result': result_text,
                'profit': last
            }

            bets.append(bet)
            bet_history.append(bet)

            # 更新排行榜积分
            for p in data['leaderboard']:
                if p['name'] == parts[0]:
                    p['today'] = p.get('today', 0) + profit_val
                    p['score'] = p.get('score', 0) + profit_val
                    break

            count += 1
            icon = '✅' if profit_val >= 0 else '❌'
            print(f'  {icon} {parts[0]} {parts[1]} {last}')
        else:
            print('  ⚠️ 格式有误，参考：佑仔 8串1 200分 中了 赚3万')

    data['yesterdayBets'] = bets
    if count > 0:
        print(f'\n  ✅ 共添加 {count} 条投注记录')
    else:
        print('  ℹ️ 未添加记录')


# ====== 第三步：毒奶榜 ======

def step_curse(data):
    """更新毒奶榜"""
    print_title('第三步：毒奶榜')

    curse = data.get('curseRanking', [])
    if curse:
        print('当前已有:')
        for i, c in enumerate(curse, 1):
            print(f'  {i}. {c}')

    while confirm('\n是否添加毒奶记录？'):
        text = get_input('  内容')
        if text:
            curse.append(text)
            print(f'  ✅ 已添加')


# ====== 第四步：AI 锐评 ======

def step_ai(data):
    """更新 AI 锐评"""
    print_title('第四步：AI 锐评')

    comments = data.get('aiComments', [])
    if comments:
        print('当前已有:')
        for i, c in enumerate(comments, 1):
            print(f'  {i}. {c}')

    while confirm('\n是否添加锐评？'):
        text = get_input('  内容')
        if text:
            comments.append(text)
            print(f'  ✅ 已添加')


# ====== 第五步：MVP ======

def step_mvp(data):
    """更新 MVP"""
    print_title('第五步：今日 MVP')

    current = data.get('mvp', '')
    if current:
        print(f'当前: {current}')

    new = get_input('MVP 描述', default=current if current else '')
    if new:
        data['mvp'] = new


# ====== 保存与推送 ======

def save_and_push(data):
    """保存 data.json 并推送到 GitHub"""
    print_title('保存并推送')

    # 备份
    backup = f'data_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
    shutil.copy2(DATA_FILE, backup)
    print(f'✅ 已备份: {backup}')

    # 写入
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f'✅ data.json 已更新')

    # 推送
    if confirm('是否推送到 GitHub？'):
        try:
            subprocess.run(['git', 'add', '-A'], check=True)
            today_str = datetime.now().strftime('%Y-%m-%d')
            subprocess.run(['git', 'commit', '-m', f'📊 每日数据更新 {today_str}'], check=True)
            result = subprocess.run(['git', 'push'], capture_output=True, text=True)
            if result.returncode == 0:
                print('✅ 已推送到 GitHub！网站将自动更新')
                print(f'🌐 https://manhvanvanh-afk.github.io/MJMFB/')
            else:
                print(f'⚠️ 推送失败: {result.stderr}')
        except subprocess.CalledProcessError as e:
            print(f'⚠️ Git 操作失败: {e}')


# ====== 主程序 ======

def main():
    print_title('🏆 2026 老同学世界杯联赛 — 每日数据更新')
    print(f'📅 {datetime.now().strftime("%Y-%m-%d %A")}')

    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f'❌ 读取失败: {e}')
        return

    print(f'👥 {len(data["leaderboard"])} 位同学')
    print(f'⚽ {len(data.get("schedule", []))} 场比赛')

    # 按流程执行
    step_scrape()       # 自动爬比分
    step_bets(data)     # 输入投注
    step_curse(data)    # 毒奶榜
    step_ai(data)       # AI锐评
    step_mvp(data)      # MVP
    save_and_push(data) # 保存 + 推送

    print_title('🎉 完成！')


if __name__ == '__main__':
    main()
