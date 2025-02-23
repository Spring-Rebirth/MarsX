import {
  View,
  Text,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import {
  fetchCommentsOfPost,
  fetchReplies,
  submitReply,
} from "../../services/postsService";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import CommentInputBox from "../../components/post-comment/CommentInputBox";
import CommentList from "../../components/post-comment/CommentList";
import { fetchUserData } from "../../services/userService";
import { useAdminStore } from "../../store/adminStore";
import { useGlobalContext } from "../../context/GlobalProvider";
import { deleteSinglePost } from "../../services/postsService";
import Toast from "react-native-toast-message";
import LoadingModal from "../../components/modal/LoadingModal";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PostDetails() {
  const { post } = useLocalSearchParams();
  const parsedPost = post ? JSON.parse(post) : null; // 解析为对象
  const { t } = useTranslation();
  const [commentsDoc, setCommentsDoc] = useState([]);
  const [postCreator, setPostCreator] = useState(null);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageHeight, setImageHeight] = useState(0);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const maxHeight = screenHeight * 0.6; // 设置为屏幕高度的70%
  const adminList = useAdminStore((state) => state.adminList);
  const [isCreator, setIsCreator] = useState(false);
  const { user } = useGlobalContext();
  const [deleting, setDeleting] = useState(false);
  const [isCommentsLoading, setIsCommentsLoading] = useState(true);

  // 获取帖子的用户信息
  useEffect(() => {
    const getPostCreatorInfo = async () => {
      const postCreator = await fetchUserData(parsedPost.author);
      setPostCreator(postCreator);
    };

    const getCommentsOfPost = async () => {
      setIsCommentsLoading(true);
      try {
        const comments = await fetchCommentsOfPost(parsedPost.$id);
        setCommentsDoc(comments.documents);
      } catch (error) {
        console.error("Failed to fetch comments:", error);
      } finally {
        setIsCommentsLoading(false);
      }
    };

    Promise.all([getPostCreatorInfo(), getCommentsOfPost()]);
  }, [refreshFlag]);

  useEffect(() => {
    if (user && parsedPost) {
      // 检查是否是帖子作者或管理员
      if (user.$id === parsedPost.author || adminList.includes(user.email)) {
        setIsCreator(true);
      }
    }
  }, [user, parsedPost, adminList]);

  useEffect(() => {
    if (parsedPost.image) {
      Image.getSize(parsedPost.image, (width, height) => {
        // 计算等比例缩放后的高度
        const scaledHeight = (screenWidth * height) / width;
        // 使用原始比例计算的高度和最大高度中的较小值
        setImageHeight(Math.min(scaledHeight, maxHeight));
      }, (error) => {
        console.error('Error getting image size:', error);
      });
    }
  }, [parsedPost.image]);

  const onCommentSubmitted = (newComment) => {
    setCommentsDoc((prevComments) => [newComment, ...prevComments]);
  };

  const handleDeletePost = async () => {
    setDeleting(true);
    try {
      const delSuccess = await deleteSinglePost(parsedPost.$id);
      if (delSuccess) {
        router.navigate("/posts");
        Toast.show({
          type: "success",
          topOffset: "80",
          text1: t("Delete Successful"),
        });
      } else {
        Toast.show({
          type: "error",
          topOffset: "80",
          text1: t("Delete Failed"),
        });
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Delete failed", error);
    } finally {
      setDeleting(false);
    }
  };

  const clickedDeletePost = () => {
    Alert.alert(
      t("Delete Post"),
      t("Are you sure you want to delete this post?"),
      [
        {
          text: t("Cancel"),
          style: "cancel",
        },
        {
          text: t("Confirm"),
          style: "destructive",
          onPress: () => {
            handleDeletePost();
          },
        },
      ],
      { cancelable: true }
    );
  };

  // 创建一个头部组件
  const PostHeader = () => (
    <>
      {/* 帖子详情 */}
      <View className="py-5 pt-0 border-b border-gray-300">
        <View className="relative overflow-hidden">
          <Image
            source={{ uri: parsedPost.image }}
            className="w-screen bg-[#EFEDED]"
            style={{ height: imageHeight }}
            resizeMode="contain"
            onLoad={() => setImageLoading(false)}
          />
          {imageLoading && (
            <View
              className="absolute inset-x-0 items-center justify-center bg-gray-50"
              style={{ height: imageHeight || 200 }}
            >
              <ActivityIndicator size="large" color="#0000ff" />
            </View>
          )}
        </View>
        <View className="px-5">
          <Text className="mt-3 text-2xl font-bold text-gray-900">
            {parsedPost?.title || "无法读取到标题文本"}
          </Text>
          {parsedPost?.content && (
            <Text className="mt-2 text-base text-gray-600" numberOfLines={20}>
              {parsedPost.content}
            </Text>
          )}
        </View>
      </View>
      {/* 评论输入框 */}
      <View className="p-4">
        <CommentInputBox
          onCommentSubmitted={onCommentSubmitted}
          post_id={parsedPost.$id}
        />
      </View>
    </>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} className="p-4">
            <Image
              source={require("../../assets/icons/back-arrow.png")}
              className="w-6 h-6"
            />
          </Pressable>
          {/* 用户信息 */}
          <Image
            source={{ uri: postCreator?.avatar }}
            className="w-6 h-6 rounded-full ml-2"
          />
          <Text className="ml-2">{postCreator?.username}</Text>
        </View>
        {/* 删除按钮 */}
        {isCreator && (
          <Pressable
            onPress={() =>
              clickedDeletePost(() => {
                // 这里写你的删除逻辑
                console.log("确认删除帖子:", parsedPost.$id);
              })
            }
            className="p-4"
          >
            <Image
              source={require("../../assets/menu/delete.png")}
              className="w-5 h-5"
              resizeMode="contain"
            />
          </Pressable>
        )}
      </View>
      <CommentList
        commentsDoc={commentsDoc}
        setRefreshFlag={setRefreshFlag}
        fetchCommentUser={fetchUserData}
        fetchReplies={fetchReplies}
        submitReply={submitReply}
        isLoading={isCommentsLoading}
        ListHeaderComponent={PostHeader} // 传入头部组件
      />
      <LoadingModal isVisible={deleting} loadingText={t("Deleting post...")} />
    </SafeAreaView>
  );
}
