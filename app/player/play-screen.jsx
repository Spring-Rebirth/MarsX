import {
  View,
  Dimensions,
  ActivityIndicator,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  TouchableWithoutFeedback,
  Text,
  ScrollView,
} from "react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Video, ResizeMode } from "expo-av";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CommentInputBox from "../../components/comment/CommentInputBox";
import CommentList from "../../components/comment/CommentList";
import { useGlobalContext } from "../../context/GlobalProvider";
import * as ScreenOrientation from "expo-screen-orientation";
import replayIcon from "../../assets/icons/replay.png";
import playbackIcon from "../../assets/icons/playback.png";
import pauseIcon from "../../assets/icons/pause.png";
import Slider from "@react-native-community/slider";
import {
  fetchReplies,
  fetchCommentUser,
  fetchCommentUsername,
  submitReply,
} from "../../services/commentService";
import useVideoControls from "../../hooks/useVideoControls";
import useComments from "../../hooks/useComments";
import { formatTime } from "../../functions/format";
import fullscreenIcon from "../../assets/icons/fullscreen.png";
import exitFullscreenIcon from "../../assets/icons/exit-fullscreen.png";
// cSpell: ignore Millis

export default function PlayScreen() {
  const { user } = useGlobalContext();
  const { post, commentId } = useLocalSearchParams();
  const parsedVideoUrl = post ? JSON.parse(post).video : null;
  const targetCommentId = commentId;
  const { $id: videoId, creator: videoCreator } = JSON.parse(post);
  const { $id: userId, avatar, username } = user;

  const {
    playing,
    setPlaying,
    loading,
    setLoading,
    isEnded,
    setIsEnded,
    showControls,
    setShowControls,
    replayVideo,
    handleClickedVideo,
    showControlsWithTimer,
    hideControlsTimer,
  } = useVideoControls(videoRef);

  const videoRef = useRef(null);
  const landscapeVideoHeight = (Dimensions.get("window").width * 9) / 16;
  const portraitVideoHeight = (Dimensions.get("window").width * 16) / 9;
  const [selectedVideoHeight, setSelectedVideoHeight] = useState(landscapeVideoHeight);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [commentsDoc, setCommentsDoc] = useComments(videoId, refreshFlag);
  const [fullscreen, setFullscreen] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState({});
  const currentProgress = playbackStatus.positionMillis || 0;
  const totalDuration = playbackStatus.durationMillis || 1;

  const [safeAreaInsets, setSafeAreaInsets] = useState({ top: 0, bottom: 0 });
  const insets = useSafeAreaInsets();
  const safeAreaInset = safeAreaInsets.top;

  const handlePlaybackStatusUpdate = () => {
    if (playbackStatus.isLoaded) {
      setLoading(false);
    } else {
      setLoading(true);
    }

    if (playbackStatus.didJustFinish) {
      console.log("视频结束");
      setPlaying(false);
      setLoading(false);
      setIsEnded(true);
    }
    // 您可以在这里添加更多对 playbackStatus 的处理
  };

  const toggleFullscreen = async () => {
    try {
      if (fullscreen) {
        // 退出全屏
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP
        );
        // 强制更新界面状态
        setFullscreen(false);
        // iOS特定：确保视频容器样式更新
        await new Promise((resolve) => setTimeout(resolve, 100));
      } else {
        // 进入全屏
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT
        );
        setFullscreen(true);
      }
    } catch (error) {
      console.error("切换全屏失败:", error);
      // 回滚状态
      setFullscreen((prevState) => !prevState);
    }
  };

  useEffect(() => {
    return () => {
      const lockPortrait = async () => {
        try {
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.PORTRAIT_UP
          );
        } catch (error) {
          console.error("Failed to lock orientation to portrait:", error);
        }
      };

      lockPortrait();
    };
  }, []);

  useEffect(() => {
    if (playbackStatus) {
      handlePlaybackStatusUpdate();
    }
  }, [playbackStatus]);

  useEffect(() => {
    // 初始化时仅设置一次
    setSafeAreaInsets({ top: insets.top, bottom: insets.bottom });
  }, []);

  useEffect(() => {
    const subscribe = async () => {
      try {
        await ScreenOrientation.unlockAsync();
        const subscription = ScreenOrientation.addOrientationChangeListener(
          (event) => {
            const orientation = event.orientationInfo.orientation;

            if (
              orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
              orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT
            ) {
              setFullscreen(true);
            } else if (
              orientation === ScreenOrientation.Orientation.PORTRAIT_UP
            ) {
              setFullscreen(false);
            }
          }
        );

        return () => {
          try {
            if (subscription?.remove) {
              subscription.remove();
            }
            // 确保退出时锁定为竖屏
            ScreenOrientation.lockAsync(
              ScreenOrientation.OrientationLock.PORTRAIT_UP
            );
          } catch (error) {
            console.error("清理屏幕方向监听器失败:", error);
          }
        };
      } catch (error) {
        console.error("初始化屏幕方向监听器失败:", error);
      }
    };

    subscribe();
  }, []);

  useEffect(() => {
    const updateStatusBar = () => {
      StatusBar.setHidden(fullscreen);
    };

    updateStatusBar();
    return () => StatusBar.setHidden(false);
  }, [fullscreen]);

  const onCommentSubmitted = (newComment) => {
    setCommentsDoc((prevComments) => [newComment, ...prevComments]);
  };

  const changeVideoProgress = async (value) => {
    if (videoRef.current != null && playbackStatus.isLoaded) {
      await videoRef.current.setPositionAsync(value);
    }
  };

  const memoizedCommentView = useMemo(() => {
    return (
      <CommentList
        userId={userId}
        videoId={videoId}
        submitReply={submitReply}
        commentsDoc={commentsDoc}
        videoCreator={videoCreator}
        fetchReplies={fetchReplies}
        setRefreshFlag={setRefreshFlag}
        fetchCommentUser={fetchCommentUser}
        fetchUsername={fetchCommentUsername}
        scrollToComment={targetCommentId} // 传递用于滚动的评论ID
      />
    );
  }, [userId, videoId, avatar, username, commentsDoc, fetchReplies, submitReply, targetCommentId]);

  return fullscreen ? (
    <View
      style={[
        styles.container,
        { backgroundColor: fullscreen ? "black" : "#F5F5F5" },
      ]}
    >
      <View
        className="relative"
        style={[!fullscreen && { marginTop: safeAreaInset }]}
      >
        <TouchableWithoutFeedback onPress={handleClickedVideo}>
          <Video
            ref={videoRef}
            source={{ uri: parsedVideoUrl }}
            style={[
              styles.video,
              { height: fullscreen ? "100%" : selectedVideoHeight },
            ]}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls={false}
            shouldPlay={playing}
            isLooping={false}
            onReadyForDisplay={(status) => {
              const { width, height } = status.naturalSize;
              const ratio = width / height; // 计算宽高比
              if (ratio < 1) {
                setSelectedVideoHeight(portraitVideoHeight);
              }
            }}
            onPlaybackStatusUpdate={(status) => setPlaybackStatus(() => status)}
          />
        </TouchableWithoutFeedback>

        {loading && (
          <ActivityIndicator
            size="large"
            color="#000"
            style={[
              styles.activityIndicator,
              { top: "50%", transform: [{ translateX: -20 }, { translateY: -20 }] },
            ]}
          />
        )}

        {isEnded && (
          <TouchableOpacity
            onPress={() => replayVideo(videoRef)}
            style={
              fullscreen ? styles.replayIconContainerFS : styles.replayIconContainer
            }
          >
            <Image
              source={replayIcon}
              style={styles.replayIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}

        {showControls && !isEnded && (
          <>
            {/* 播放/暂停按钮 */}
            <TouchableOpacity
              style={[styles.controlButton]}
              onPress={() => {
                setPlaying((prev) => !prev);
                showControlsWithTimer();
              }}
            >
              <Image
                source={playing ? pauseIcon : playbackIcon}
                style={{ width: "100%", height: "100%" }}
                resizeMode="contain"
              />
            </TouchableOpacity>

            <View
              style={[
                fullscreen ? styles.bottomBarFS : styles.bottomBar,
                !fullscreen && { bottom: "5%", left: 0 },
              ]}
            >
              <Text style={fullscreen ? styles.timeTextFS : styles.timeText}>
                {formatTime(currentProgress)}
                <Text
                  style={
                    fullscreen ? styles.totalTimeTextFS : styles.totalTimeText
                  }
                >
                  {" "}
                  / {formatTime(totalDuration)}
                </Text>
              </Text>
              <Slider
                style={fullscreen ? styles.sliderFS : styles.slider}
                value={currentProgress}
                minimumValue={0}
                maximumValue={totalDuration}
                minimumTrackTintColor="#87CEEB"
                maximumTrackTintColor="#FFFFFF"
                trackStyle={styles.trackStyle}
                thumbTouchSize={{ width: 40, height: 50 }}
                onSlidingStart={() => {
                  // 用户开始滑动，显示控件并清除隐藏定时器
                  if (hideControlsTimer.current) {
                    clearTimeout(hideControlsTimer.current);
                    hideControlsTimer.current = null;
                  }
                  setShowControls(true);
                }}
                onValueChange={changeVideoProgress}
                onSlidingComplete={() => {
                  changeVideoProgress();
                  showControlsWithTimer();
                }}
              />
              <TouchableOpacity onPress={toggleFullscreen}>
                <Image
                  source={fullscreen ? exitFullscreenIcon : fullscreenIcon}
                  className={`${fullscreen ? "w-6 h-6 mr-3" : "w-4 h-4 mr-4"}`}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  ) : (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: fullscreen ? "black" : "#F5F5F5" },
      ]}
    >
      <View
        className="relative"
        style={[!fullscreen && { marginTop: safeAreaInset }]}
      >
        <TouchableWithoutFeedback onPress={handleClickedVideo}>
          <Video
            ref={videoRef}
            source={{ uri: parsedVideoUrl }}
            style={[
              styles.video,
              { height: fullscreen ? "100%" : selectedVideoHeight },
            ]}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls={false}
            shouldPlay={playing}
            isLooping={false}
            onReadyForDisplay={(status) => {
              const { width, height } = status.naturalSize;
              const ratio = width / height; // 计算宽高比
              if (ratio < 1) {
                setSelectedVideoHeight(portraitVideoHeight);
              }
            }}
            onPlaybackStatusUpdate={(status) => setPlaybackStatus(() => status)}
          />
        </TouchableWithoutFeedback>

        {loading && (
          <ActivityIndicator
            size="large"
            color="#000"
            style={[
              styles.activityIndicator,
              { top: "50%", transform: [{ translateX: -20 }, { translateY: -20 }] },
            ]}
          />
        )}

        {isEnded && (
          <TouchableOpacity
            onPress={() => replayVideo(videoRef)}
            style={
              fullscreen ? styles.replayIconContainerFS : styles.replayIconContainer
            }
          >
            <Image
              source={replayIcon}
              style={styles.replayIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}

        {showControls && !isEnded && (
          <>
            {/* 播放/暂停按钮 */}
            <TouchableOpacity
              style={[styles.controlButton]}
              onPress={() => {
                setPlaying((prev) => !prev);
                showControlsWithTimer();
              }}
            >
              <Image
                source={playing ? pauseIcon : playbackIcon}
                style={{ width: "100%", height: "100%" }}
                resizeMode="contain"
              />
            </TouchableOpacity>

            <View
              style={[
                fullscreen ? styles.bottomBarFS : styles.bottomBar,
                !fullscreen && { bottom: "5%", left: 0 },
              ]}
            >
              <Text style={fullscreen ? styles.timeTextFS : styles.timeText}>
                {formatTime(currentProgress)}
                <Text
                  style={
                    fullscreen ? styles.totalTimeTextFS : styles.totalTimeText
                  }
                >
                  {" "}
                  / {formatTime(totalDuration)}
                </Text>
              </Text>
              <Slider
                style={fullscreen ? styles.sliderFS : styles.slider}
                value={currentProgress}
                minimumValue={0}
                maximumValue={totalDuration}
                minimumTrackTintColor="#87CEEB"
                maximumTrackTintColor="#FFFFFF"
                trackStyle={styles.trackStyle}
                thumbTouchSize={{ width: 40, height: 50 }}
                onSlidingStart={() => {
                  // 用户开始滑动，显示控件并清除隐藏定时器
                  if (hideControlsTimer.current) {
                    clearTimeout(hideControlsTimer.current);
                    hideControlsTimer.current = null;
                  }
                  setShowControls(true);
                }}
                onValueChange={changeVideoProgress}
                onSlidingComplete={() => {
                  changeVideoProgress();
                  showControlsWithTimer();
                }}
              />
              <TouchableOpacity onPress={toggleFullscreen}>
                <Image
                  source={fullscreen ? exitFullscreenIcon : fullscreenIcon}
                  className={`${fullscreen ? "w-6 h-6 mr-3" : "w-4 h-4 mr-4"}`}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
      <View className="flex-1">
        <View className="px-2">
          <CommentInputBox
            userId={userId}
            videoId={videoId}
            videoCreator={videoCreator}
            onCommentSubmitted={onCommentSubmitted}
          />
        </View>
        <View className="flex-1">{memoizedCommentView}</View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
  },
  activityIndicator: {
    zIndex: 10,
    position: "absolute",
    left: "50%",
  },
  replayIconContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    zIndex: 1, // 确保图标在最前面
    transform: [{ translateX: -15 }, { translateY: -15 }],
  },
  replayIconContainerFS: {
    position: "absolute",
    top: "50%",
    left: "50%",
    zIndex: 1, // 确保图标在最前面
    transform: [{ translateX: -15 }, { translateY: -15 }],
  },
  replayIcon: {
    width: 30,
    height: 30,
  },
  fullscreenIcon: {
    width: 20,
    height: 20,
    marginLeft: 10, // 添加适当的间距
  },
  exitFullscreenIcon: {
    width: 20,
    height: 20,
  },
  video: {
    width: "100%",
  },
  // 增加一半的偏移量
  controlButton: {
    position: "absolute", // 让按钮浮动在视频上
    top: "50%",
    left: "50%",
    zIndex: 10, // 确保按钮在视频之上
    transform: [{ translateX: -20 }, { translateY: -20 }],
    backgroundColor: "white",
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomBar: {
    backgroundColor: "rgba(50, 50, 50, 0.7)",
    width: "95%",
    position: "absolute",
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center", // 垂直居中
    justifyContent: "center", // 水平居中
    paddingHorizontal: 5, // 左右内边距
    gap: 5,
    borderRadius: 20,
    marginHorizontal: "2.5%",
  },
  bottomBarFS: {
    backgroundColor: "rgba(50, 50, 50, 0.7)",
    width: "78%",
    position: "absolute",
    marginHorizontal: "11%",
    bottom: 10, // 距底部的距离
    height: 40, // 固定高度
    paddingHorizontal: 15, // 左右内边距
    zIndex: 10, // 确保在视频上方
    flexDirection: "row", // 水平布局
    gap: 5, // 间距
    borderRadius: 20,
    alignItems: "center", // 垂直居中
    justifyContent: "center", // 水平居中
  },
  sliderFS: {
    flex: 1, // 设置Slider的宽度
    height: 40, // 设置Slider的高度
    marginVertical: 10, // 可选，调整Slider的上下间距
  },
  slider: {
    flex: 1, // 设置Slider的宽度
    height: 10, // 设置Slider的高度
    marginVertical: 10, // 可选，调整Slider的上下间距
  },
  trackStyle: {
    height: 4, // 设置进度条的高度
    borderRadius: 2, // 圆角效果
  },
  timeText: {
    color: "#fff",
    marginLeft: 14,
    fontSize: 12,
  },
  timeTextFS: {
    color: "#fff",
    marginLeft: 12,
  },
  totalTimeText: {
    color: "#ccc",
    fontSize: 12,
  },
  totalTimeTextFS: {
    color: "#ccc",
  },
});
