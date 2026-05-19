#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
2026 老同学世界杯联赛 — 每日数据更新脚本
运行方式：python3 update_data.py
功能：更新比赛结果、积分、毒奶榜、AI 锐评、MVP，并自动推送到 GitHub
"""

import json
import os
import subprocess
import shutil
from datetime import datetime

DATA_FILE = 'data.json'

# ====== 工具函数 ======

def print_title(text):
    """打印带装饰的标题"""
    print()
    print('=' * 50)
    print(f'  {text}')
    print('=' * 50)
    print()

def get_input(prompt, default=None):
    """获取用户输入，支持默认值"""
    if default:
        result = input(f'{prompt}（默认: {default}）: ').strip()
        return result if result else default
    else:
        return input(f'{prompt}: ').strip()

def confirm(prompt):
    """确认操作"""
    result = input(f'{prompt}（y/n）: ').strip().lower()
    return result in ('y', 'yes', '是')

# ====== 主程序 ======

def main():
    print_title('🏆 2026 老同学世界杯联赛 — 每日数据更新')

    # 读取当前数据
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f'❌ 读取数据文件失败：{e}')
        return

    print(f'📅 当前日期：{datetime.now().strftime("%Y-%m-%d %A")}')
    print(f'👥 当前有 {len(data["leaderboard"])} 位同学')
    print(f'⚽ 当前有 {len(data["matches"])} 场比赛')

    # ====== 第一步：更新比赛结果 ======
    print_title('第一步：更新比赛结果')
    print('下面的赛程来自 2026 世界杯分组。选择要更新比分的比赛。\n')

    schedule = data.get('schedule', [])
    if not schedule:
        print('⚠️ 没有赛程数据')
    else:
        # 按日期显示，只显示还未开始的比赛或已有比分的
        today = datetime.now().strftime('%Y-%m-%d')
        
        # 按日期分组
        from collections import OrderedDict
        by_date = OrderedDict()
        for m in schedule:
            d = m.get('date', '')
            if d not in by_date:
                by_date[d] = []
            by_date[d].append(m)
        
        match_list = []
        idx = 0
        for date, matches in by_date.items():
            print(f'\n  📅 {date}')
            for m in matches:
                idx += 1
                home_flag = {'Mexico':'🇲🇽','Canada':'🇨🇦','United States':'🇺🇸','Brazil':'🇧🇷','Argentina':'🇦🇷','France':'🇫🇷','Germany':'🇩🇪','Spain':'🇪🇸','England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Portugal':'🇵🇹','Netherlands':'🇳🇱','Belgium':'🇧🇪'}.get(m.get('home',''), '')
                away_flag = {'Mexico':'🇲🇽','Canada':'🇨🇦','United States':'🇺🇸','Brazil':'🇧🇷','Argentina':'🇦🇷','France':'🇫🇷','Germany':'🇩🇪','Spain':'🇪🇸','England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Portugal':'🇵🇹','Netherlands':'🇳🇱','Belgium':'🇧🇪'}.get(m.get('away',''), '')
                score_display = m.get('score', '-')
                group = m.get('group', '')
                print(f'  [{idx}] {home_flag} {m["home"]:20s} vs {away_flag} {m["away"]:20s}  比分: {score_display}  [{group}组]')
                match_list.append(m)
        
        print()
        update_idx = get_input('要更新哪场比赛？（输入编号，留空跳过）')
        while update_idx:
            try:
                idx = int(update_idx) - 1
                if 0 <= idx < len(match_list):
                    m = match_list[idx]
                    new_score = get_input(f'  {m["home"]} vs {m["away"]} 新比分', default=m.get('score', '-'))
                    m['score'] = new_score
                    print(f'  ✅ 已更新: {m["home"]} vs {m["away"]} = {new_score}')
                else:
                    print('  ⚠️ 编号无效')
            except ValueError:
                print('  ⚠️ 请输入数字')
            update_idx = get_input('继续更新？输入编号（留空结束）')

    # ====== 第二步：更新积分 ======
    print_title('第二步：更新积分')
    print('（如果今天没有更新积分，直接回车跳过）\n')

    leaderboard = data.get('leaderboard', [])
    has_score_update = False

    for player in leaderboard:
        today_str = get_input(f'  {player["name"]} 今日得分', default='')
        if today_str:
            try:
                today_score = int(today_str)
                player['today'] = today_score
                player['score'] = player.get('score', 0) + today_score
                has_score_update = True
                print(f'    ✅ {player["name"]}: 今日 +{today_score}，总积分 {player["score"]}')
            except ValueError:
                print(f'    ⚠️ 跳过（输入无效，请输入数字）')

    if not has_score_update:
        print('  ℹ️  今日没有积分更新')

    # ====== 第三步：更新毒奶榜 ======
    print_title('第三步：更新毒奶榜')
    print('（如果今天没有毒奶记录，直接回车跳过）\n')

    curse_ranking = data.get('curseRanking', [])
    if curse_ranking:
        print('当前毒奶记录：')
        for i, c in enumerate(curse_ranking, 1):
            print(f'  {i}. {c}')

    while confirm('\n是否添加新的毒奶记录？'):
        curse_text = get_input('  毒奶内容')
        if curse_text:
            curse_ranking.append(curse_text)
            print(f'  ✅ 已添加')

    # ====== 第四步：更新 AI 锐评 ======
    print_title('第四步：更新 AI 锐评')
    print('（如果今天不更新锐评，直接回车跳过）\n')

    ai_comments = data.get('aiComments', [])
    if ai_comments:
        print('当前锐评：')
        for i, c in enumerate(ai_comments, 1):
            print(f'  {i}. {c}')

    while confirm('\n是否添加新的锐评？'):
        comment_text = get_input('  锐评内容')
        if comment_text:
            ai_comments.append(comment_text)
            print(f'  ✅ 已添加')

    # ====== 第五步：更新 MVP ======
    print_title('第五步：更新今日 MVP')

    current_mvp = data.get('mvp', '')
    if current_mvp:
        print(f'当前 MVP: {current_mvp}')

    new_mvp = get_input('今日 MVP 描述', default=current_mvp if current_mvp else '')
    if new_mvp:
        data['mvp'] = new_mvp

    # ====== 保存数据 ======
    print_title('正在保存数据...')

    # 备份旧数据
    backup_file = f'data_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
    shutil.copy2(DATA_FILE, backup_file)
    print(f'✅ 已备份旧数据到: {backup_file}')

    # 写入新数据
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f'✅ data.json 已更新')

    # ====== 推送到 GitHub ======
    print_title('推送到 GitHub')

    if confirm('是否将更新推送到 GitHub？'):
        try:
            # git add
            subprocess.run(['git', 'add', DATA_FILE], check=True)
            subprocess.run(['git', 'add', '.'], check=True)  # 也添加其他修改

            # git commit
            today_str = datetime.now().strftime("%Y-%m-%d")
            commit_msg = f'📊 每日数据更新 {today_str}'
            subprocess.run(['git', 'commit', '-m', commit_msg], check=True)

            # git push
            result = subprocess.run(['git', 'push'], capture_output=True, text=True)
            if result.returncode == 0:
                print('✅ 已成功推送到 GitHub！网站将自动更新 ✅')
                print(f'🌐 约 1-2 分钟后即可查看最新数据')
            else:
                print(f'⚠️ 推送失败：{result.stderr}')
                print('💡 你可以手动执行: git push')

        except subprocess.CalledProcessError as e:
            print(f'⚠️ Git 操作失败：{e}')
            print('💡 你可以手动执行以下命令推送：')
            print('   git add data.json')
            print('   git commit -m "更新数据"')
            print('   git push')
    else:
        print('ℹ️  已跳过推送。你可以稍后手动推送。')
        print('   手动推送命令：')
        print('   git add data.json')
        print('   git commit -m "更新数据"')
        print('   git push')

    print_title('🎉 更新完成！')
    print('祝大家世界杯快乐！⚽🏆')


if __name__ == '__main__':
    main()
