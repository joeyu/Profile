#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Fri Mar 29 11:01:27 2019

@author: Zhou Yu
"""
from pathlib import Path
import sys
import subprocess


def convert(infile):
    infile_str = str(infile)
    infile_size = infile.stat().st_size
    targetfile = infile.stem + ".mp4" 
    cmd = f"ffprobe -v error -select_streams v:0 -show_entries stream=avg_frame_rate -of default=noprint_wrappers=1:nokey=1".split()
    cmd.append(infile_str)
    infile_fr = eval(subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True).stdout.rstrip('\n'))
    cmd = f"ffmpeg -r {infile_fr} -i".split() + [infile_str] + "-movflags faststart -pix_fmt yuv420p -vf scale=trunc(iw/2)*2:trunc(ih/2)*2".split() + [str(targetfile)]
    print(' '.join(cmd))
    subprocess.run(cmd, check = True)

if len(sys.argv) <= 2 and len(sys.argv) > 1:
    infile_str = sys.argv[1] 
    infile = Path(infile_str)
    if infile.suffix == ".gif":
        convert(infile)
        sys.exit()

print(f"Usage: {sys.argv[0]} <infile>")

