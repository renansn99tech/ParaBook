import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { CommunityPost, communityService } from '../services/communityService';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'PostDetail'>;

const getErrorMessage = (error: unknown) => {
  const response = (error as { response?: { data?: { detail?: string } } })?.response;
  return response?.data?.detail || 'Nao foi possivel carregar esta postagem.';
};

export const PostDetailScreen = ({ route, navigation }: Props) => {
  const { postId, communityName } = route.params;
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPost = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try { setPost(await communityService.getPostById(postId)); }
    catch (error) { setErrorMessage(getErrorMessage(error)); }
    finally { setLoading(false); }
  }, [postId]);

  useEffect(() => { loadPost(); }, [loadPost]);

  return <SafeAreaView style={styles.container}>
    <View style={styles.header}>
      <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={23} color={colors.textPrimary} /></TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>{communityName || 'Postagem'}</Text>
      <View style={styles.spacer} />
    </View>
    {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : errorMessage || !post ? <View style={styles.center}>
      <Ionicons name="alert-circle-outline" size={46} color={colors.textMuted} />
      <Text style={styles.errorText}>{errorMessage || 'Postagem nao encontrada.'}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadPost}><Text style={styles.retryText}>Tentar novamente</Text></TouchableOpacity>
    </View> : <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>{post.title}</Text>
      <Text style={styles.meta}>@{post.authorName}  |  {new Date(post.createdAt).toLocaleDateString('pt-BR')}</Text>
      <Text style={styles.body}>{post.content}</Text>
      {post.imageUrl && <Image source={{ uri: post.imageUrl }} style={styles.image} resizeMode="cover" />}
      <View style={styles.commentsSection}>
        <View style={styles.commentsHeader}><Text style={styles.commentsTitle}>Comentarios</Text><Text style={styles.pendingBadge}>AGUARDANDO BACKEND</Text></View>
        <Text style={styles.commentsText}>A interface esta reservada para a conversa da postagem. A API atual oferece postagens, mas ainda nao possui model ou endpoint de comentarios.</Text>
        <View style={styles.disabledComposer}><Text style={styles.disabledComposerText}>Comentar nesta postagem</Text><Ionicons name="send-outline" size={19} color={colors.textMuted} /></View>
      </View>
    </ScrollView>}
  </SafeAreaView>;
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
  pendingBadge: { color: colors.accentYellow, fontSize: 9, fontWeight: '800' },
  commentsText: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 10 },
  disabledComposer: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, marginTop: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBackground, opacity: 0.65 },
  disabledComposerText: { color: colors.textMuted, fontSize: 13 },
});
