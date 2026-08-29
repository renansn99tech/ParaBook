import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { CommunityPost, CommunityReply, communityService } from '../services/communityService';
import { extractApiErrorMessage } from '../services/authService';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'PostDetail'>;

const getErrorMessage = (error: unknown) => {
  const response = (error as { response?: { data?: { detail?: string; erro?: string } } })?.response;
  return response?.data?.detail || response?.data?.erro || 'Nao foi possivel carregar esta postagem.';
};

const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');

export const PostDetailScreen = ({ route, navigation }: Props) => {
  const { postId, communityName } = route.params;
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [replies, setReplies] = useState<CommunityReply[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [repliesErrorMessage, setRepliesErrorMessage] = useState<string | null>(null);
  const [publishingReply, setPublishingReply] = useState(false);

  const loadPost = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    setRepliesErrorMessage(null);

    const [postResult, repliesResult] = await Promise.allSettled([
      communityService.getPostById(postId),
      communityService.getReplies(postId),
    ]);

    if (postResult.status === 'fulfilled') {
      setPost(postResult.value);
    } else {
      setPost(null);
      setLoading(false);
      setErrorMessage(getErrorMessage(postResult.reason));
      return;
    }

    if (repliesResult.status === 'fulfilled') {
      setReplies(repliesResult.value);
    } else {
      setReplies([]);
      setRepliesErrorMessage(getErrorMessage(repliesResult.reason));
    }

    setLoading(false);
  }, [postId]);

  useEffect(() => {
    void loadPost();
  }, [loadPost]);

  const submitReply = async () => {
    const normalizedContent = replyContent.trim();
    if (!normalizedContent) {
      Alert.alert('Comentario vazio', 'Escreva uma resposta antes de enviar.');
      return;
    }

    setPublishingReply(true);
    try {
      const createdReply = await communityService.createReply(postId, normalizedContent);
      setReplies((current) => [...current, createdReply]);
      setPost((current) => current ? { ...current, replyCount: current.replyCount + 1 } : current);
      setReplyContent('');
    } catch (error) {
      Alert.alert(
        'Nao foi possivel comentar',
        extractApiErrorMessage(error, 'Verifique se voce participa da comunidade e tente novamente.'),
      );
    } finally {
      setPublishingReply(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={23} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {communityName || 'Postagem'}
        </Text>
        <View style={styles.spacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : errorMessage || !post ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={46} color={colors.textMuted} />
          <Text style={styles.errorText}>{errorMessage || 'Postagem nao encontrada.'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => void loadPost()}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{post.title}</Text>
          <Text style={styles.meta}>@{post.authorName}  |  {formatDate(post.createdAt)}</Text>
          <Text style={styles.body}>{post.content}</Text>
          {post.imageUrl && <Image source={{ uri: post.imageUrl }} style={styles.image} resizeMode="cover" />}

          <View style={styles.commentsSection}>
            <View style={styles.commentsHeader}>
              <Text style={styles.commentsTitle}>Comentarios</Text>
              <Text style={styles.commentsCount}>{post.replyCount}</Text>
            </View>

            <View style={styles.composer}>
              <TextInput
                style={styles.commentInput}
                value={replyContent}
                onChangeText={setReplyContent}
                placeholder="Comentar nesta postagem"
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
                maxLength={1200}
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={submitReply}
                disabled={publishingReply}
                hitSlop={6}
              >
                {publishingReply ? (
                  <ActivityIndicator size="small" color={colors.textPrimary} />
                ) : (
                  <Ionicons name="send-outline" size={19} color={colors.textPrimary} />
                )}
              </TouchableOpacity>
            </View>

            {repliesErrorMessage ? (
              <View style={styles.inlineError}>
                <Ionicons name="alert-circle-outline" size={20} color={colors.textMuted} />
                <Text style={styles.inlineErrorText}>{repliesErrorMessage}</Text>
              </View>
            ) : replies.length === 0 ? (
              <Text style={styles.emptyText}>Ainda nao ha comentarios nesta postagem.</Text>
            ) : (
              replies.map((reply) => (
                <View key={reply.id} style={styles.replyCard}>
                  <View style={styles.replyHeader}>
                    <Text style={styles.replyAuthor}>@{reply.authorName}</Text>
                    <Text style={styles.replyDate}>{formatDate(reply.createdAt)}</Text>
                  </View>
                  <Text style={styles.replyBody}>{reply.content}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: colors.textPrimary, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  spacer: { width: 42 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  content: { padding: 20, paddingBottom: 36 },
  title: { color: colors.textPrimary, fontSize: 24, lineHeight: 31, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 10 },
  body: { color: colors.textSecondary, fontSize: 16, lineHeight: 25, marginTop: 24 },
  image: { width: '100%', aspectRatio: 1.5, borderRadius: 8, marginTop: 22, backgroundColor: colors.cardBackground },
  errorText: { color: colors.textSecondary, textAlign: 'center', marginTop: 13, fontSize: 15, lineHeight: 22 },
  retryButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, marginTop: 18, backgroundColor: colors.primary, borderRadius: 8 },
  retryText: { color: colors.textPrimary, fontWeight: '700' },
  commentsSection: { marginTop: 30, paddingTop: 22, borderTopWidth: 1, borderTopColor: colors.border },
  commentsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  commentsTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  commentsCount: { minWidth: 28, textAlign: 'center', color: colors.textPrimary, fontSize: 12, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 14, backgroundColor: colors.primary },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 14 },
  commentInput: { flex: 1, minHeight: 48, maxHeight: 120, paddingHorizontal: 13, paddingTop: 12, paddingBottom: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.cardBackground, color: colors.textPrimary, fontSize: 14 },
  sendButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.primary },
  emptyText: { color: colors.textMuted, fontSize: 14, marginTop: 18, textAlign: 'center' },
  inlineError: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBackground },
  inlineErrorText: { flex: 1, color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  replyCard: { padding: 13, marginTop: 12, borderRadius: 10, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border },
  replyHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  replyAuthor: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  replyDate: { color: colors.textMuted, fontSize: 12 },
  replyBody: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 8 },
});
