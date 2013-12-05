#This file will be sourced by $HOME/.profile
USER_PROFILE_DIR=${HOME}/Profile

#JDK
export JAVA_HOME="/opt/jdk"
if [ ! -d "$JAVA_HOME" ]; then
    echo "Warning: JDK is not found in $JAVA_HOME"
fi
PATH=$JAVA_HOME/bin:$PATH

#Eclipse
ECLIPSE_HOME="/opt/eclipse"
if [ ! -d "$ECLIPSE_HOME" ]; then
    echo "Warning: eclipse is not found in $ECLIPSE_HOME"
fi
PATH=${ECLIPSE_HOME}:$PATH

#Android SDK
ANDROID_SDK_HOME="/opt/android-sdk-linux"
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
PATH=$GSUTIL_PATH:$PATH

PATH=${USER_PROFILE}/bin

# Local ld path
export LD_LIBRARY_PATH=$USER_PROFILE_DIR/lib:$HOME/lib:$LD_LIBRARY_PATH
