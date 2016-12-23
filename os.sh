#!/bin/bash
# 
# Common OS related variables and functions

# For checking darwin (OS X)
# gnu tools for OS X requires prefix 'g'
OS=${OSTYPE//[0-9.]/}
GNU=
if [ "$OS" == "darwin" ]; then
    # For OS X, check "brew install coreutils"
    eval "brew list | grep coreutils > /dev/null"
    if [ $? != 0 ]; then
        echo "You're now using OS X, please install 'brew' and its 'coreutils'."
        exit 1
    fi

    # Sets GNU command prefix 'g'
    GNU=g
fi

# bash printf/echo attributes
# http://misc.flogisoft.com/bash/tip_colors_and_formatting
RESET_ALL=0
BOLD=1
DIM=2
UNDERLINED=4
BLINK=5
REVERSE=7
HIDDEN=8

RESET=2

# Foreground colors
FG_DEFAULT=39
FG_BLACK=30
FG_RED=31
FG_GREEN=32
FG_YELLOW=33
FG_BLUE=34
FG_MAGENTA=35
FG_CYAN=36
FG_LIGHTGRAY=37
FG_DARKGRAY=90
FG_LIGHTRED=91
FG_LIGHTGREEN=92
FG_LIGTHYELLOW=93
FG_LIGHTBLUE=94
FG_LIGHTMGENTA=95
FG_LIGHTCYAN=96
FG_WHITE=97

# Background = Foreground + 10
BG_DEFAULT=$((FG_DEFAULT+10))
BG_BLACK=$((FG_BLACK+10))
BG_RED=$((FG_RED+10))
BG_GREEN=$((FG_GREEN+10))
BG_YELLOW=$((FG_YELLOW+10))
BG_BLUE=$((FG_BLUE+10))
BG_MAGENTA=$((FG_MAGENTA+10))
BG_CYAN=$((FG_CYAN+10))
BG_LIGHTGRAY=$((FG_LIGHTGRAY+10))
BG_DARKGRAY=$((FG_DARKGRAY+10))
BG_LIGHTRED=$((FG_LIGHTRED+10))
BG_LIGHTGREEN=$((FG_LIGHTGREEN+10))
BG_LIGTHYELLOW=$((FG_LIGTHYELLOW+10))
BG_LIGHTBLUE=$((FG_LIGHTBLUE+10))
BG_LIGHTMGENTA=$((FG_LIGHTMGENTA+10))
BG_LIGHTCYAN=$((FG_LIGHTCYAN+10))
BG_WHITE=$((FG_WHITE+10))

ATTR_START='\e['
ATTR_END='m'

