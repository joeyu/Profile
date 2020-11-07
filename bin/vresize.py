#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""
Created on Fri Mar 29 11:01:27 2019

@author: Zhou Yu
"""
from pathlib import Path
import sys
import subprocess


def convert(infile_str, target_size, codec, audio_downmix):
    infile = Path(infile_str)
    infile_size = infile.stat().st_size
    if infile.suffix in (".mp4", ".MP4"):
        targetfile = infile.stem + '2' + infile.suffix
        cmd = f"ffprobe -v error -select_streams v:0 -show_entries stream=bit_rate -of default=noprint_wrappers=1:nokey=1".split()
        cmd.append(infile_str)
        infile_bv = int(subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True).stdout.rstrip('\n'))
        cmd = f"ffprobe -v error -select_streams a:0 -show_entries stream=bit_rate -of default=noprint_wrappers=1:nokey=1".split()
        cmd.append(infile_str)
        infile_ba = int(subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True).stdout.rstrip('\n'))
        target_ba = infile_ba
        if target_ba > 6.4e4 and audio_downmix:
             target_ba = int(6.4e4)
        target_bv = target_size * (infile_ba + infile_bv) // infile_size - target_ba
    elif infile.suffix == ".webm":
        targetfile = infile.stem + '2.mp4'
        cmd = f"ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1".split()
        cmd.append(infile_str)
        duration = float(subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True).stdout.rstrip('\n'))
        duration = int(duration)
        #print(f"duration: {duration}")
        target_ba = int(6.4e4)
        target_bv = target_size * 8 // duration - target_ba
    else:
        print(f"{infile_str} file type is not supported!")
        sys.exit()
    #print(f"infile_size: {infile_size}")
    #print(f"target_size: {target_size}")
    #print(f"infile_ba: {infile_ba}")
    #print(f"infile_bv: {infile_bv}")
    #print(f"target_ba: {target_ba}")
    #print(f"target_bv: {target_bv}")
    #return
    codec_pass1 = "-x265-params pass=1:pools=4"
    codec_pass2 = "-x265-params pass=2:pools=4"
    if codec == "libx264":
        codec_pass1 = "-pass 1"
        codec_pass2 = "-pass 2"
    cmd = f"ffmpeg -i".split() + [infile_str] + f"-threads 4 -c:v {codec} -b:v {target_bv} {codec_pass1} -f mp4 -an /dev/null -y".split()
    subprocess.run(cmd, check = True)
    cmd = f"ffmpeg -i".split() + [infile_str] + f"-threads 4 -c:v {codec} -b:v {target_bv} {codec_pass2} -b:a {target_ba} -y".split() + [str(targetfile)]
    subprocess.run(cmd, check = True)

if len(sys.argv) <= 4 and len(sys.argv) > 1:
    infile = sys.argv[1] 
    codec = "libx264"
    target_size = 2.46e7
    audio_downmix = True
    for arg in sys.argv[2:]:
        if arg in ("libx265", "libx264"):
            codec = arg
        if arg == "--nad":
            audio_downmix = False
        elif arg[-1] in ("M", "m"):
            target_size = float(arg[0:-1]) * 1e6
        else:
            print(f"Wrong arguments: {arg}")
    convert(infile, target_size, codec, audio_downmix)
else:
    print(f"Usage: {sys.argv[0]} <infile> [target_size] [codec] [--nad]")

