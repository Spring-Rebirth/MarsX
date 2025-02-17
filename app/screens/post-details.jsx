import {
  SafeAreaView,
  View,
  Text,
  Image,
  FlatList,
  Pressable,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";

export default function PostDetails() {
  const { params } = useRoute();
  const { post } = params || {};
  const navigation = useNavigation();

  // 模拟评论数据
  const comments = [
    { id: "1", author: "评论者1", text: "很赞哦！" },
    { id: "2", author: "评论者2", text: "期待更多内容。" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* 顶部返回按钮 */}
      <Pressable onPress={() => navigation.goBack()} className="p-4">
        <Image
          source={require("../../assets/icons/back-arrow.png")}
          className="w-6 h-6"
        />
      </Pressable>
      {/* 帖子详情 */}
      <View className="p-5 pt-0 border-b border-gray-300">
        <Image
          source={{ uri: "https://picsum.photos/200/300" }}
          className="h-44 w-full mx-auto"
          resizeMode="contain"
        />
        <Text className="mt-3 text-center text-2xl font-bold text-gray-900">
          {post?.title || "标题"}
        </Text>
        <Text
          className="mt-2 text-center text-base text-gray-600"
          numberOfLines={20}
        >
          {post?.content || "lorem ipsum dolor sit amet fsdgsgsg dssa"}
        </Text>
      </View>
      {/* 评论列表 */}
      <View className="p-4 flex-1">
        <Text className="mb-3 text-lg font-semibold text-gray-800">评论</Text>
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View className="mb-4 p-3 border border-gray-200 rounded-lg">
              <Text className="font-bold text-gray-700">{item.author}</Text>
              <Text className="mt-1 text-gray-600">{item.text}</Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
