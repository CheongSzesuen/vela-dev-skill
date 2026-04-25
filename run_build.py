#!/usr/bin/env python3
import sys
import os

# 将 src 目录添加到 Python 路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from veladev.build_index import build_database, DEFAULT_DB_PATH, DEFAULT_DOCS_PATH

if __name__ == "__main__":
    print("Starting index build process...")
    build_database(output_dir=DEFAULT_DB_PATH, docs_root=DEFAULT_DOCS_PATH)
    print("Index build completed.")
