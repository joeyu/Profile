# -*- coding: utf-8 -*-
"""
Created on Fri Mar 29 11:01:27 2019

@author: Zhou Yu
"""
from pathlib import Path
import sys
import subprocess


def convert(infile, target_size):
    infile = Path(infile)
    infile_size = infile.stat().st_size
    targetfile = infile.stem + '2' + infile.suffix
    cmd = f"ffprobe -v error -select_streams v:0 -show_entries stream=bit_rate -of default=noprint_wrappers=1:nokey=1 {infile}".split()
    infile_bv = int(subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True).stdout.rstrip('\n'))
    cmd = f"ffprobe -v error -select_streams a:0 -show_entries stream=bit_rate -of default=noprint_wrappers=1:nokey=1 {infile}".split()
    infile_ba = int(subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True).stdout.rstrip('\n'))
    target_ba = infile_ba
    if target_ba > 6.4e4:
         target_ba = int(6.4e4)
    target_bv = target_size * (infile_ba + infile_bv) // infile_size - target_ba
    #print(f"infile_size: {infile_size}")
    #print(f"target_size: {target_size}")
    #print(f"infile_ba: {infile_ba}")
    #print(f"infile_bv: {infile_bv}")
    #print(f"target_ba: {target_ba}")
    #print(f"target_bv: {target_bv}")
    cmd = f"ffmpeg -i {infile} -c:v libx264 -b:v {target_bv} -pass 1 -f mp4 -an /dev/null -y".split()
    subprocess.run(cmd, check = True)
    cmd = f"ffmpeg -i {infile} -c:v libx264 -b:v {target_bv} -pass 2 -b:a {target_ba} {targetfile} -y".split()
    subprocess.run(cmd, check = True)

if len(sys.argv) <= 3:
    infile = sys.argv[1] 
    if len(sys.argv) == 3:
        target_size = sys.argv[2]
        if target_size[-1] == 'M' or target_size[-1] == 'm':
            target_size = int(target_size[0:-1]) * 1e6
        else:
            raise NotImplementedError
    else:
        target_size = 2.45e7
else:
    print(f"Usage: {sys.argv[0]} <infile> [target_size]")

convert(infile, target_size)
