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
export ANDROID_HOME=${ANDROID_SDK_HOME}
#For chromium-android build
export ANDROID_SDK_ROOT=${ANDROID_SDK_HOME}

ANDROID_NDK_HOME="/opt/android-ndk"
export ANDROID_NDK_ROOT=${ANDROID_NDK_HOME}

#golang
export GOROOT="/opt/go"
if [ ! -d "$GOROOT" ]; then
    echo "Warning: the 'go' tooltain is not found in $GOROOT"
fi
PATH=$GOROOT/bin:$PATH
export GOPATH=$HOME/mygo
PATH=${GOPATH//://bin:}/bin:$PATH

#llvm
export LLVM_ROOT="/opt/llvm"
if [ ! -d "$LLVM_ROOT" ]; then
    echo "Warning: the 'clang' tooltain is not found in $LLVM_ROOT"
fi
PATH=$LLVM_ROOT/bin:$PATH



export PATH=$PROFILE_DIR/bin:$PROFILE_DIR/ShProg4C:$PATH
export LD_LIBRARY_PATH=$PROFILE_DIR/lib:$HOME/lib:$CUDA_LIB:$LD_LIBRARY_PATH
