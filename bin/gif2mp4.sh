#!/bin/bash

gif_fn=$1
mp4_fn="${gif_fn%.*}.mp4"

ffmpeg -r 30 -i $gif_fn -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" $mp4_fn
