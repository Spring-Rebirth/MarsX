import React, { useEffect, useState } from 'react';
import { View, Text, Image, FlatList, StyleSheet } from 'react-native';

export default function CommentView({ commentsDoc, avatar, username, fetchReplies }) {
    // fetchReplies 是一个获取子评论的函数，输入评论 ID，返回该评论的子评论

    const CommentItem = ({ comment, level = 0 }) => {
        const [replies, setReplies] = useState([]);
        const [isRepliesLoaded, setIsRepliesLoaded] = useState(false);

        useEffect(() => {
            // 获取子评论
            const loadReplies = async () => {
                if (comment.parent_comment_ID) {
                    const childComments = await fetchReplies(comment.$id); // 根据父评论ID获取子评论
                    setReplies(childComments);
                    setIsRepliesLoaded(true);
                }
            };
            loadReplies();
        }, [comment.$id]);

        return (
            <View style={[styles.commentContainer, { marginLeft: level * 20 }]}>
                <View style={styles.header}>
                    <Image source={{ uri: avatar }} style={styles.avatar} />
                    <Text style={styles.username}>{username}</Text>
                </View>
                <Text style={styles.commentText}>{comment.content}</Text>

                {/* 渲染子评论 */}
                {isRepliesLoaded && replies.length > 0 && (
                    <FlatList
                        data={replies}
                        keyExtractor={(item) => item.$id}
                        renderItem={({ item }) => (
                            <CommentItem comment={item} level={level + 1} /> // 递归渲染子评论
                        )}
                    />
                )}
            </View>
        );
    };

    return (
        <FlatList
            data={commentsDoc}
            keyExtractor={(item) => item.$id}
            renderItem={({ item }) => (
                <CommentItem comment={item} />
            )}
        />
    );
}

const styles = StyleSheet.create({
    commentContainer: {
        padding: 10,
        borderRadius: 5,
        backgroundColor: '#161622',
        marginBottom: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
    },
    username: {
        color: '#fff',
        marginLeft: 10,
    },
    commentText: {
        color: '#fff',
        marginTop: 5,
        marginLeft: 40,
    },
});
