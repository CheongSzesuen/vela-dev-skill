import os
import sys
import re
import shutil

# --- 路径计算逻辑 ---
# 当前文件: ProjectRoot/src/veladev/build_index.py
# 目标根目录: ProjectRoot/
CURRENT_FILE_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.dirname(CURRENT_FILE_DIR)       # ProjectRoot/src
PROJECT_ROOT = os.path.dirname(SRC_DIR)             # ProjectRoot

# 定义默认路径
# 注意：由于是直接克隆 VelaDocs 到 docs/ 目录，实际文档在 docs/docs/ 下
DEFAULT_DOCS_PATH = os.path.join(PROJECT_ROOT, "docs", "docs")
DEFAULT_DB_PATH = os.path.join(PROJECT_ROOT, "doc_vector_db")

from langchain_text_splitters import MarkdownHeaderTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import FastEmbedEmbeddings

def clean_markdown_images(text):
    """移除 Markdown 图片标记 ![](url)"""
    pattern = r'!\[.*?\]\(.*?\)'
    return re.sub(pattern, '', text)

def process_docs(root_dir):
    docs = []
    headers_to_split_on = [("#", "Header 1"), ("##", "Header 2"), ("###", "Header 3")]
    splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers_to_split_on)

    print(f"Scanning documents in: {root_dir}")
    
    # 【调试】打印前 10 个找到的 .md 文件路径
    found_files = []
    
    for dirpath, _, filenames in os.walk(root_dir):
        if 'images' in dirpath: 
            continue
        
        for filename in filenames:
            if not filename.endswith('.md'): 
                continue
            
            filepath = os.path.join(dirpath, filename)
            found_files.append(filepath) # 收集路径
            
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                content = clean_markdown_images(content)
                lang = "zh" if "/zh/" in filepath else "en"
                meta = {"source": filepath, "lang": lang}
                
                chunks = splitter.split_text(content)
                for chunk in chunks:
                    chunk.metadata.update(meta)
                    docs.append(chunk)
            except Exception as e:
                print(f"Error processing {filepath}: {e}")
    
    # 【调试】输出结果
    print(f"Total .md files found: {len(found_files)}")
    if found_files:
        print("First 5 files:")
        for f in found_files[:5]:
            print(f"  - {f}")
            
    return docs
    
def build_database(output_dir, docs_root):
    """构建并保存向量数据库"""
    print("Processing and splitting documents...")
    all_chunks = process_docs(docs_root)
    
    if not all_chunks:
        print("No documents found to index!")
        return

    print(f"Split into {len(all_chunks)} chunks.")
    
    print("Initializing embeddings (this may take a moment)...")
    embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-zh-v1.5")
    
    print("Building vector database...")
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
        
    db = Chroma.from_documents(all_chunks, embeddings, persist_directory=output_dir)
    print(f"Done! Database saved to {output_dir}")

if __name__ == "__main__":
    # 使用计算好的绝对路径，确保无论从哪个目录运行脚本都能找到正确位置
    build_database(output_dir=DEFAULT_DB_PATH, docs_root=DEFAULT_DOCS_PATH)
