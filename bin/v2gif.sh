#!/bin/bash

if [[ ! -z $3 ]]; then
    start="-ss $3"
fi

if [[ ! -z $4 ]]; then
    duration="-t $4"
fi
palette="/tmp/palette.png"
filters="fps=15,scale=320:-1:flags=lanczos"

ffmpeg -v warning $start $duration -i $1 -vf "$filters,palettegen" -y $palette &&\
ffmpeg -v warning $start $duration -i $1 -i $palette -lavfi "$filters [x]; [x][1:v] paletteuse" -y $2
