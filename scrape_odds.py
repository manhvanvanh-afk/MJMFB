#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从好运计算器接口抓取世界杯赛程里的比赛和全部玩法赔率。

会生成 odds_data.json，网页里的「博彩计算器」读取这个文件展示和计算。
"""

import json
import os
import shutil
import ssl
import urllib.parse
import urllib.request
from datetime import datetime

DATA_FILE = os.path.join(os.path.dirname(__file__), 'data.json')
ODDS_FILE = os.path.join(os.path.dirname(__file__), 'odds_data.json')
API_BASE = 'https://justpost.haoyun999.cn/api'
SSL_CONTEXT = ssl._create_unverified_context()


def normalize_team_name(name):
    """统一球队名称，方便和 data.json 的世界杯赛程匹配。"""
    return str(name or '').replace(' ', '').strip()


def load_worldcup_pairs():
    """读取主项目赛程，只允许抓世界杯赛程内的对阵。"""
    if not os.path.exists(DATA_FILE):
        return set()

    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    pairs = set()
    for match in data.get('schedule', []):
        home = normalize_team_name(match.get('home'))
        away = normalize_team_name(match.get('away'))
        if home and away and match.get('id') != 9001:
            pairs.add((home, away))
            pairs.add((away, home))
    return pairs


def is_worldcup_match(match, allowed_pairs):
    """只保留 data.json 赛程里的世界杯对阵。"""
    if not allowed_pairs:
        return False
    home = normalize_team_name(match.get('homeChs') or match.get('hometeamchs'))
    away = normalize_team_name(match.get('awayChs') or match.get('awayteamchs'))
    return (home, away) in allowed_pairs


def fetch_json(path, params=None):
    """请求接口并返回 JSON 数据。"""
    url = API_BASE + path
    if params:
        url += '?' + urllib.parse.urlencode(params)

    req = urllib.request.Request(
        url,
        headers={
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/json; charset=UTF-8',
            'XMIME-TYPE': '3',
            'DeviceKind': '1',
            'AppType': '0',
        },
    )
    with urllib.request.urlopen(req, timeout=20, context=SSL_CONTEXT) as resp:
        return json.loads(resp.read().decode('utf-8'))


def odds_item(label, value):
    """统一格式化一个赔率项。"""
    return {'label': label, 'value': value}


def build_play_groups(info):
    """把接口字段整理成页面容易展示的玩法分组。"""
    score_win = [
        ('1:0', 'sw10'), ('2:0', 'sw20'), ('2:1', 'sw21'),
        ('3:0', 'sw30'), ('3:1', 'sw31'), ('3:2', 'sw32'),
        ('4:0', 'sw40'), ('4:1', 'sw41'), ('4:2', 'sw42'),
        ('5:0', 'sw50'), ('5:1', 'sw51'), ('5:2', 'sw52'),
        ('胜其他', 'sw5'),
    ]
    score_draw = [('0:0', 'sd00'), ('1:1', 'sd11'), ('2:2', 'sd22'), ('3:3', 'sd33'), ('平其他', 'sd4')]
    score_loss = [
        ('0:1', 'sl01'), ('0:2', 'sl02'), ('0:3', 'sl03'),
        ('1:2', 'sl12'), ('1:3', 'sl13'), ('2:3', 'sl23'),
        ('0:4', 'sl04'), ('1:4', 'sl14'), ('2:4', 'sl24'),
        ('0:5', 'sl05'), ('1:5', 'sl15'), ('2:5', 'sl25'),
        ('负其他', 'sl5'),
    ]
    half_full = [
        ('胜胜', 'ht33'), ('胜平', 'ht31'), ('胜负', 'ht30'),
        ('平胜', 'ht13'), ('平平', 'ht11'), ('平负', 'ht10'),
        ('负胜', 'ht03'), ('负平', 'ht01'), ('负负', 'ht00'),
    ]

    return [
        {
            'key': 'spf',
            'title': '胜平负',
            'items': [
                odds_item('主胜', info.get('spf_win')),
                odds_item('平', info.get('spf_draw')),
                odds_item('客胜', info.get('spf_lost')),
            ],
        },
        {
            'key': 'rqspf',
            'title': f'让球胜平负（{info.get("rfspf_goal", "")}）',
            'items': [
                odds_item('让胜', info.get('rfspf_win')),
                odds_item('让平', info.get('rfspf_draw')),
                odds_item('让负', info.get('rfspf_lost')),
            ],
        },
        {
            'key': 'bf',
            'title': '比分',
            'items': [odds_item(label, info.get(key)) for label, key in score_win + score_draw + score_loss],
        },
        {
            'key': 'jq',
            'title': '总进球',
            'items': [odds_item(f'{i}球' if i < 7 else '7+球', info.get(f't{i}')) for i in range(8)],
        },
        {
            'key': 'bqc',
            'title': '半全场',
            'items': [odds_item(label, info.get(key)) for label, key in half_full],
        },
    ]


def normalize_match(day, match, info):
    """整理一场比赛的数据，给前端直接使用。"""
    play_groups = build_play_groups(info)
    return {
        'dateLabel': day.get('dateFormat', ''),
        'matchId': info.get('matchId') or match.get('matchId'),
        'lotteryId': info.get('lotteryid') or match.get('lotteryId'),
        'league': info.get('leaguechs') or match.get('leagueChs'),
        'matchTime': info.get('matchtime') or match.get('matchTime'),
        'home': info.get('hometeamchs') or match.get('homeChs'),
        'away': info.get('awayteamchs') or match.get('awayChs'),
        'homeRank': info.get('homerank') or match.get('homeRank'),
        'awayRank': info.get('awayrank') or match.get('awayRank'),
        'handicap': info.get('rfspf_goal') or match.get('goalFoot'),
        'single': {
            'spf': bool(info.get('singlespf')),
            'rqspf': bool(info.get('singlerqspf')),
            'bf': bool(info.get('singlebf')),
            'jq': bool(info.get('singlejq')),
            'bqc': bool(info.get('singlebqc')),
        },
        'playGroups': play_groups,
    }


def fetch_all_odds():
    """抓取当前列表中所有比赛的详细玩法。"""
    print('正在抓取竞足列表，并只保留世界杯赛程...')
    matchs = fetch_json('/Game/GetSimpleMatchsAll')
    allowed_pairs = load_worldcup_pairs()
    rows = []
    for day in matchs.get('data', []):
        for match in day.get('list', []):
            match_id = match.get('matchId')
            if not match_id:
                continue
            if not is_worldcup_match(match, allowed_pairs):
                print(f'  跳过非世界杯赛程：{match.get("homeChs")} vs {match.get("awayChs")}')
                continue
            print(f'  抓取 {match.get("lotteryId")} {match.get("homeChs")} vs {match.get("awayChs")}')
            detail = fetch_json('/Game/GetMoreSpInfo', {'matchId': match_id})
            info = detail.get('data', {}).get('footballMoreSpInfo')
            if info:
                rows.append(normalize_match(day, match, info))

    data = {
        'source': '好运计算器',
        'api': API_BASE,
        'updatedAt': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'count': len(rows),
        'matches': rows,
    }
    with open(ODDS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f'已生成 {ODDS_FILE}，共 {len(rows)} 场')
    return data


def write_today_demo_match(odds_data):
    """把新加坡 vs 中国写入今日比赛，保留上一个测试入口。"""
    target = None
    for match in odds_data.get('matches', []):
        if match.get('home') == '新加坡' and match.get('away') == '中国':
            target = match
            break

    if not target:
        print('没有找到 新加坡 vs 中国，跳过今日比赛测试数据')
        return

    print(f'找到比赛：{target["lotteryId"]} 新加坡 vs 中国')

    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    backup = os.path.join(
        os.path.dirname(__file__),
        'data_before_odds_test_' + datetime.now().strftime('%Y%m%d_%H%M%S') + '.json'
    )
    shutil.copy2(DATA_FILE, backup)

    date_part, time_part = (target.get('matchTime') or '2026-06-05T19:30:00').split('T')
    test_match = {
        'id': 9001,
        'group': '测试',
        'matchday': 0,
        'date': date_part,
        'time': time_part[:5],
        'home': target.get('home'),
        'away': target.get('away'),
        'score': '-',
        'round': 'group',
        'odds': {
            'source': odds_data.get('source'),
            'lotteryId': target.get('lotteryId'),
            'league': target.get('league'),
            'matchId': target.get('matchId'),
            'updatedAt': odds_data.get('updatedAt'),
            'playGroups': target.get('playGroups', []),
        },
    }

    data['schedule'] = [m for m in data.get('schedule', []) if m.get('id') != 9001]
    data['schedule'].insert(0, test_match)

    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f'已写入今日比赛测试数据，备份文件：{backup}')


def main():
    odds_data = fetch_all_odds()
    print('已关闭测试赛写入，只保留世界杯赔率数据')


if __name__ == '__main__':
    main()
