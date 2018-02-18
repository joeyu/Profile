#!/bin/bash

convert() {
	local infile=$1
	local outfile=${infile%.gif}.mp4
	ffmpeg -i ${infile} -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" ${outfile} 
	return $?
}

if [[ -z $1 ]]; then
	for i in *.gif; do
		if [[ ! -f {$i%.gif}.mp4 ]]; then
			convert $i
		fi
	done
else
	convert $1
fi


