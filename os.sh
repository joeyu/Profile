#!/bin/bash
# 
# Common OS related variables and functions

# For checking darwin (OS X)
OS=${OSTYPE//[0-9.]/}
GNU=
if [[ "$OS" == "darwin" ]]; then
    # Checks "brew install coreutils"
    eval "brew list | grep coreutils > /dev/null"
    if [ $? != 0 ]; then
        echo "Please install brew and its coreutils"
        exit 1
    fi

    GNU=g
fi
