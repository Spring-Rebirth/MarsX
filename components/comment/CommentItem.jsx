// CommentItem.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import commentIcon from '../../assets/icons/comment.png';
import likeIcon from '../../assets/icons/like.png';
import likedIcon from '../../assets/icons/liked.png';
import deleteIcon from '../../assets/menu/delete.png';
import ReactNativeModal from 'react-native-modal';
import { useTranslation } from 'react-i18next';
import { databases } from '../../lib/appwrite';
import { config } from '../../lib/appwrite';

const CommentItem = ({ comment, level = 1, fetchReplies, setRefreshFlag, fetchUsername, userId, fetchCommentUser, submitReply }) => {
    const [replies, setReplies] = useState([]);
    const [commentId, setCommentId] = useState(comment.$id);
    const [repliesCount, setRepliesCount] = useState(0);
    const [showReplies, setShowReplies] = useState(false);
    const [loadingReplies, setLoadingReplies] = useState(false);
    const [liked, setLiked] = useState(false);
    const [cmtUsername, setCmtUsername] = useState('加载中...');
    const [cmtAvatar, setCmtAvatar] = useState(require('../../assets/images/default-avatar.png'));
    const [showReplyModal, setShowReplyModal] = useState(false);
    const [replyMsg, setReplyMsg] = useState('');
    const { t } = useTranslation();
    const [parentCommentId, setParentCommentId] = useState(null); // 当前回复的父评论 ID
    const [parentCommentUserId, setParentCommentUserId] = useState(null); // 当前回复的父评论用户 ID

    const MAX_LEVEL = 2;
    let paddingLeft = level <= MAX_LEVEL ? 40 : 0;

    // 加载用户信息
    useEffect(() => {
        const loadUser = async () => {
            const user = await fetchCommentUser(comment.user_ID);
            setCmtUsername(user.username);
            setCmtAvatar({ uri: user.avatar });
        };
        loadUser();
    }, [comment.user_ID]);

    useEffect(() => {
        const loadRepliesCount = async () => {
            const childComments = await fetchReplies(commentId);
            setRepliesCount(childComments.length); // 设置子评论数量
        };
        loadRepliesCount();
    }, [commentId, fetchReplies]);

    // 切换显示/隐藏子评论
    const toggleReplies = useCallback(async () => {
        if (!showReplies) {
            setLoadingReplies(true);
            const childComments = await fetchReplies(commentId);
            setReplies(childComments);
            setLoadingReplies(false);
        }
        setShowReplies((prev) => !prev);
    }, [showReplies, fetchReplies, commentId]);

    const deleteComment = async (commentId) => {
        try {
            const result = await databases.deleteDocument(
                config.databaseId,
                config.commentsCollectionId,
                commentId
            );
            if (result) {
                Alert.alert('Delete Success');
                setCommentId("");
            }
        } catch (error) {
            console.error('Failed to delete comment:', error);
        }
    }

    handleReplySubmit = useCallback(async () => {
        // 调用提交回复的函数，传入回复内容和父评论 ID   // 获取回复的用户名
        if (!replyMsg.trim()) return;

        const parentUsername = await fetchUsername(parentCommentUserId);
        await submitReply(`@${parentUsername}\n${replyMsg}`, parentCommentId);
        console.log('Submit reply:', replyMsg);
        setReplyMsg('');
        setParentCommentUserId(null);
        setParentCommentId(null);
        setShowReplyModal(false);
        setRefreshFlag(prev => !prev);
    }, [replyMsg, parentCommentId]);

    if (!commentId) {
        return null;
    }

    return (
        <View style={styles.commentContainer}>
            <View style={styles.header}>
                <Image source={cmtAvatar} style={styles.avatar} />
                <Text style={styles.username}>{cmtUsername}</Text>
            </View>
            <Text style={styles.commentText} numberOfLines={10}>
                {comment.content}
            </Text>
            <View style={styles.actions}>
                <TouchableOpacity
                    onPress={() => setLiked(!liked)}
                    className='w-[46] items-center'
                >
                    <Image
                        source={liked ? likedIcon : likeIcon}
                        style={{ width: 20, height: 20, marginTop: 20 }}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => {
                        setParentCommentId(commentId); // 设置当前父评论 ID
                        setParentCommentUserId(comment.user_ID); // 设置当前父评论用户 ID
                        setShowReplyModal(true);
                    }}
                    className='w-[46] items-center'
                >
                    <Image
                        source={commentIcon}
                        style={{ width: 20, height: 20, marginTop: 20 }}
                        resizeMode='contain'
                    />
                </TouchableOpacity>

                {comment.user_ID === userId && (
                    <TouchableOpacity
                        onPress={() => deleteComment(commentId)}
                        className='w-[46] items-center'
                    >
                        <Image
                            source={deleteIcon}
                            style={{ width: 20, height: 20, marginTop: 20 }}
                        />
                    </TouchableOpacity>
                )}
            </View>
            {repliesCount > 0 && (
                <TouchableOpacity
                    onPress={toggleReplies}
                    className='mt-[20] mb-[10] ml-[40]'
                >
                    <Text className='text-blue-500'>{repliesCount} {t('replies')}</Text>
                </TouchableOpacity>
            )}

            {showReplies && (
                <View style={{ paddingLeft }}>
                    {loadingReplies ? (
                        <Text>loading...</Text>
                    ) : (
                        replies.map((reply) => (
                            <CommentItem
                                key={reply.$id}
                                comment={reply}
                                userId={userId}
                                level={level + 1}
                                fetchReplies={fetchReplies}
                                setRefreshFlag={setRefreshFlag}
                                fetchUsername={fetchUsername}
                                fetchCommentUser={fetchCommentUser}
                                submitReply={submitReply}
                            />
                        ))
                    )}
                </View>
            )}

            <ReactNativeModal
                isVisible={showReplyModal}
                onBackdropPress={() => setShowReplyModal(false)}
                onBackButtonPress={() => setShowReplyModal(false)}
                style={styles.modal}
            >
                <View style={styles.modalContent}>
                    <TextInput
                        value={replyMsg}
                        onChangeText={setReplyMsg}
                        placeholder={t("Add a reply...")}
                        placeholderTextColor="gray"
                        style={styles.input}
                        onSubmitEditing={handleReplySubmit}
                    />
                </View>
            </ReactNativeModal>
        </View>
    );
};

const styles = StyleSheet.create({
    commentContainer: {
        paddingVertical: 10
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 25,
        height: 25,
        borderRadius: 15,
        marginLeft: 0
    },
    username: {
        fontWeight: 'bold',
        marginLeft: 15,
        color: '#fff',
    },
    commentText: {
        color: '#fff',
        marginTop: 15,
        marginLeft: 40,
        marginRight: 40,
        lineHeight: 22
    },
    actions: {
        flexDirection: 'row',
        marginTop: 0,
        marginLeft: 28,
    },
    icon: {
        width: 20,
        height: 20,
        marginHorizontal: 5,
    },
    modal: {
        justifyContent: 'flex-end',
        margin: 0,
    },
    modalContent: {
        backgroundColor: '#212121',
        padding: 16,
        borderRadius: 10,
    },
    input: {
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        color: 'white',
    },
});

export default CommentItem;
