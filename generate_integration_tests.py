#!/usr/bin/env python

from pathlib import Path
import re
import sys


def generate_tests(benthos_repo, bloblang_parser_repo):
  
  docs = Path(benthos_repo) / "website/docs/guides/bloblang"

  for f in docs.glob("*.md"):
    print(f"scraping file: {f}")

    bloblangScripts = re.finditer(r'(?s)^```coffee\n(.+?)```', f.read_text(), re.MULTILINE)
    for idx, script in enumerate(bloblangScripts):
      test_file_name = f"example_{idx}.blobl"
      scpt = script.group(1)
      dst_dir = Path(bloblang_parser_repo) / "examples" / f.name
      dst_dir.mkdir(parents=True, exist_ok=True)
      dst = dst_dir / test_file_name
      dst.write_text(scpt)
      print(f"Wrote: {dst}")

if __name__ == "__main__":
  args = sys.argv
  if len(args) != 3:
    print(f"args: {args}")
    sys.exit(1)

  benthos_folder = sys.argv[1]
  parser_folder = sys.argv[2]

  generate_tests(benthos_folder, parser_folder)
