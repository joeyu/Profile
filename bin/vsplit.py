#!/usr/bin/python3

import os
import sys
import subprocess


def convert(infile, no_of_pieces):
    outfile_base, outfile_ext = os.path.splitext(infile)
    duration = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', infile], 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE, 
            universal_newlines=True).stdout.rstrip('\n')
    duration = float(duration) / no_of_pieces
    start=0
    cmd = ['ffmpeg', '-i', infile]
    for i in range(no_of_pieces):
        cmd += ['-c', 'copy', '-ss', str(start + duration * i), '-t', str(duration), outfile_base + str(i) + outfile_ext]
        
    subprocess.run(cmd) 


if len(sys.argv) != 3:
    print(sys.argv)
    exit()

infile = sys.argv[1]
no_of_pieces = int(sys.argv[2])

convert(infile, no_of_pieces)


