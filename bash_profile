#This file will be sourced by $HOME/.profile
USER_DIR=$HOME
USER_PROFILE_DIR=$USER_DIR/Profile

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
PATH=$ECLIPSE_HOME:$PATH

#Android SDK
ANDROID_SDK_HOME="/opt/android-sdk-linux_x86"
if [ ! -d "$ANDROID_SDK_HOME" ]; then
    echo "Warning: eclipse is not found in $ANDROID_SDK_HOME"
fi
PATH=$ANDROID_SDK_HOME/tools:$PATH

ADOBE_AIR_SDK_HOME="/opt/AdobeAIRSDK"
if [ ! -d "$ADOBE_AIR_SDK_HOME" ]; then
    echo "Warning: Adobe AIR SDK is not found in $ADOBE_AIR_SDK_HOME"
fi
PATH=$ADOBE_AIR_SDK_HOME/bin:$PATH

PATH=$USER_PROFILE_DIR/bin:$PATH

LD_LIBRARY_PATH=$HOME/lib:$LD_LIBRARY_PATH
LD_LIBRARY_PATH=$USER_PROFILE_DIR/lib:$LD_LIBRARY_PATH
export LD_LIBRARY_PATH
