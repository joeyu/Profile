#This file will be sourced by $HOME/.profile
USER_PROFILE_DIR=${HOME}/Profile

source $USER_PROFILE_DIR/os.sh

if [[ "$OS" == "darwin" ]]; then
    alias ls="ls -G"
    alias ll="ls -la"
fi

#JDK
#export JAVA_HOME="/opt/jdk"
#if [ ! -d "$JAVA_HOME" ]; then
#    echo "Warning: JDK is not found in $JAVA_HOME"
#fi
#PATH=$JAVA_HOME/bin:$PATH

#Eclipse
ECLIPSE_HOME="/opt/eclipse"
if [ ! -d "$ECLIPSE_HOME" ]; then
    echo "Warning: eclipse is not found in $ECLIPSE_HOME"
fi
PATH=${ECLIPSE_HOME}:$PATH

#Android SDK
ANDROID_SDK_HOME="/opt/android-sdk-linux_x86"
if [ ! -d "$ANDROID_SDK_HOME" ]; then
    echo "Warning: android SDK is not found in $ANDROID_SDK_HOME"
fi
PATH=$ANDROID_SDK_HOME/platform-tools:$ANDROID_SDK_HOME/tools:$PATH
#For chromium-android build
export ANDROID_SDK_ROOT=${ANDROID_SDK_HOME}

ANDROID_NDK_HOME="/opt/android-ndk"
export ANDROID_NDK_ROOT=${ANDROID_NDK_HOME}

# depot tool
DEPOT_TOOLS_HOME="/opt/depot_tools"
PATH=$DEPOT_TOOLS_HOME:$PATH

PATH=$USER_PROFILE_DIR/bin:$USER_PROFILE_DIR/ShProg4C:$PATH

# gsutil
GSUTIL_PATH="/opt/gsutil"
if [ ! -d "$GSUTIL_PATH" ]; then
    echo "Warning: gsutil is not found in $GSUTIL_PATH"
fi
PATH=$GSUTIL_PATH:$PATH

# cuda
CUDA_PATH="/usr/local/cuda"
if [ ! -d "$CUDA_PATH" ]; then
    echo "Warning: cuda is not found in $CUDA_PATH"
fi
PATH=$CUDA_PATH/bin:$PATH


# Local ld path
export LD_LIBRARY_PATH=$USER_PROFILE_DIR/lib:$HOME/lib:$CUDA_PATH/lib:$LD_LIBRARY_PATH
