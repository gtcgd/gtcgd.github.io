#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把最新生成的 hub 内容（来自 dist_hub）同步到本 Git 仓库(merchant-hub)，并提交+推送。
由「同步商家网站」自动化在分片发布完成后调用，使 GitHub Pages 上的商家入口保持最新。

前提：
- 本目录已 `git init` 且已设置好 GitHub 远程仓库(含推送凭证)。
- dist_hub 已由 publish.py --shard 生成（含最新 shards.json）。
"""
import os
import shutil
import subprocess
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(BASE, "..", "dist_hub"))
FILES = ["index.html", "hub.js", "style.css", "shards.json"]


def run(cmd):
    print(">>>", " ".join(cmd), flush=True)
    return subprocess.run(cmd, cwd=BASE, check=True)


def main():
    missing = [f for f in FILES if not os.path.exists(os.path.join(SRC, f))]
    if missing:
        print("ERROR: dist_hub 缺少文件:", missing, file=sys.stderr)
        sys.exit(2)

    for f in FILES:
        shutil.copy2(os.path.join(SRC, f), os.path.join(BASE, f))
    print("已复制 hub 文件到仓库。")

    run(["git", "add", "-A"])

    # 仅在有变更时提交+推送
    diff = subprocess.run(
        ["git", "diff", "--cached", "--quiet"], cwd=BASE
    )
    if diff.returncode == 0:
        print("无变更，跳过推送。")
        return

    run(["git", "commit", "-m", "update merchant hub (auto sync)"])
    run(["git", "push"])
    print("已推送到 GitHub，GitHub Pages 将在数十秒后自动更新。")


if __name__ == "__main__":
    main()
