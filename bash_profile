#This file will be sourced by $HOME/.profile

source $HOME/.os.sh
PROFILE_DIR=$(dirname $(${GNU}readlink -f $HOME/.os.sh))

#bash aliases
if [ "$OS" == "darwin" ]; then
    alias ls="ls -G"
    alias ll="ls -la"
    alias la="ls -a"
fi

#Android SDK
ANDROID_SDK_HOME="/opt/android-sdk"
if [ ! -d "$ANDROID_SDK_HOME" ]; then
    echo "Warning: android SDK is not found in $ANDROID_SDK_HOME"
fi
PATH=$ANDROID_SDK_HOME/platform-tools:$ANDROID_SDK_HOME/tools:$PATH
#For chromium-android build
export ANDROID_SDK_ROOT=${ANDROID_SDK_HOME}

ANDROID_NDK_HOME="/opt/android-ndk"
export ANDROID_NDK_ROOT=${ANDROID_NDK_HOME}

#golang
export GO_HOME="/opt/go"
PATH=$GO_HOME/bin:$PATH

export PATH=$PROFILE_DIR/bin:$PROFILE_DIR/ShProg4C:$PATH
export LD_LIBRARY_PATH=$PROFILE_DIR/lib:$HOME/lib:$CUDA_LIB:$LD_LIBRARY_PATH
