import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Community, CommunityPost, communityService } from '../services/communityService';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'CommunityDetail'>;

const getErrorMessage = (error: unknown, fallback: string) => {
  const response = (error as { response?: { data?: { detail?: string; erro?: string } } })?.response;
  return response?.data?.detail || response?.data?.erro || fallback;
};

const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');

export const CommunityDetailScreen = ({ route, navigation }: Props) => {
  const { communityId, title } = route.params;
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updatingMembership, setUpdatingMembership] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [publishing, setPublishing] = useState(false);

  const loadCommunity = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [communityData, postData] = await Promise.all([
        communityService.getCommunityById(communityId),
        communityService.getPosts(communityId),
      ]);
      setCommunity(communityData);
      setPosts(postData);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Nao foi possivel carregar esta comunidade.'));
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => { loadCommunity(); }, [loadCommunity]);

  const toggleMembership = async () => {
    if (!community || community.maintenance) return;
    setUpdatingMembership(true);
    try {
      const action = await communityService.toggleMembership(community.id);
      const isJoined = action === 'joined';
      setCommunity({
        ...community,
        isJoined,
        members: `${Math.max(0, Number.parseInt(community.members, 10) + (isJoined ? 1 : -1))} membros`,
      });
      Alert.alert(isJoined ? 'Participacao confirmada' : 'Voce saiu da comunidade');
    } catch (error) {
      Alert.alert('Nao foi possivel atualizar', getErrorMessage(error, 'Tente novamente em instantes.'));
    } finally {
      setUpdatingMembership(false);
    }
  };

  const submitPost = async () => {
    const normalizedTitle = postTitle.trim();
    const normalizedContent = postContent.trim();
    if (!normalizedTitle || !normalizedContent) {
      Alert.alert('Preencha a postagem', 'Informe titulo e conteudo antes de publicar.');
      return;
    }
    setPublishing(true);
    try {
      const createdPost = await communityService.createPost(communityId, { title: normalizedTitle, content: normalizedContent });
      setPosts((current) => [createdPost, ...current]);
      setPostTitle('');
      setPostContent('');
      setShowComposer(false);
      Alert.alert('Postagem publicada', 'Sua publicacao ja esta visivel na comunidade.');
    } catch (error) {
      Alert.alert('Nao foi possivel publicar', getErrorMessage(error, 'Verifique sua conexao e tente novamente.'));
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return <SafeAreaView style={[styles.container, styles.centerState]}><ActivityIndicator size="large" color={colors.primary} /></SafeAreaView>;
  }

  if (errorMessage || !community) {
    return <SafeAreaView style={[styles.container, styles.centerState]}>
      <Ionicons name="alert-circle-outline" size={46} color={colors.textMuted} />
      <Text style={styles.errorText}>{errorMessage || 'Comunidade nao encontrada.'}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadCommunity}><Text style={styles.retryText}>Tentar novamente</Text></TouchableOpacity>
      <TouchableOpacity style={styles.backTextButton} onPress={() => navigation.goBack()}><Text style={styles.backText}>Voltar</Text></TouchableOpacity>
    </SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={23} color={colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{community.name || title || 'Comunidade'}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        onRefresh={loadCommunity}
        refreshing={loading}
        ListHeaderComponent={<>
          <View style={styles.communitySummary}>
            <View style={styles.summaryIcon}><Ionicons name="people" size={28} color={colors.primary} /></View>
            <View style={styles.summaryText}><Text style={styles.communityName}>{community.name}</Text><Text style={styles.members}>{community.members}</Text></View>
          </View>
          <Text style={styles.description}>{community.description}</Text>
          <TouchableOpacity style={[styles.membershipButton, community.isJoined ? styles.leaveButton : styles.joinButton]} onPress={toggleMembership} disabled={updatingMembership || community.maintenance}>
            {updatingMembership ? <ActivityIndicator size="small" color={colors.textPrimary} /> : <Text style={styles.membershipText}>{community.maintenance ? 'Em manutencao' : community.isJoined ? 'Sair da comunidade' : 'Entrar na comunidade'}</Text>}
          </TouchableOpacity>
          <View style={styles.postsHeading}>
            <Text style={styles.postsTitle}>Postagens</Text>
            {community.isJoined && <TouchableOpacity style={styles.newPostButton} onPress={() => setShowComposer(true)}><Ionicons name="add" size={18} color={colors.textPrimary} /><Text style={styles.newPostText}>Nova</Text></TouchableOpacity>}
          </View>
        </>}
        ListEmptyComponent={<View style={styles.emptyPosts}><Ionicons name="chatbubbles-outline" size={42} color={colors.textMuted} /><Text style={styles.emptyText}>Ainda nao ha postagens nesta comunidade.</Text></View>}
        renderItem={({ item }) => <TouchableOpacity style={styles.postCard} activeOpacity={0.8} onPress={() => navigation.navigate('PostDetail', { postId: item.id, communityName: community.name })}>
          <Text style={styles.postTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.postMeta}>@{item.authorName}  |  {formatDate(item.createdAt)}</Text>
          <Text style={styles.postContent} numberOfLines={3}>{item.content}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={styles.postChevron} />
        </TouchableOpacity>}
      />
      <Modal visible={showComposer} animationType="slide" transparent onRequestClose={() => setShowComposer(false)}>
        <View style={styles.modalBackdrop}><View style={styles.modalContent}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>Nova postagem</Text><TouchableOpacity onPress={() => setShowComposer(false)}><Ionicons name="close" size={24} color={colors.textPrimary} /></TouchableOpacity></View>
          <TextInput style={styles.input} value={postTitle} onChangeText={setPostTitle} placeholder="Titulo" placeholderTextColor={colors.textMuted} maxLength={200} />
          <TextInput style={[styles.input, styles.contentInput]} value={postContent} onChangeText={setPostContent} placeholder="Compartilhe uma ideia com a comunidade" placeholderTextColor={colors.textMuted} multiline textAlignVertical="top" />
          <TouchableOpacity style={styles.publishButton} disabled={publishing} onPress={submitPost}>{publishing ? <ActivityIndicator size="small" color={colors.textPrimary} /> : <Text style={styles.publishText}>Publicar</Text>}</TouchableOpacity>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, centerState: { alignItems: 'center', justifyContent: 'center', padding: 30 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }, iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, headerTitle: { flex: 1, color: colors.textPrimary, fontSize: 16, fontWeight: '700', textAlign: 'center' }, headerSpacer: { width: 42 },
  listContent: { padding: 20, paddingBottom: 32, flexGrow: 1 }, communitySummary: { flexDirection: 'row', alignItems: 'center' }, summaryIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border }, summaryText: { flex: 1, marginLeft: 12 }, communityName: { color: colors.textPrimary, fontSize: 21, fontWeight: '700' }, members: { color: colors.textMuted, fontSize: 13, marginTop: 4 }, description: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 16 },
  membershipButton: { minHeight: 44, marginTop: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 8 }, joinButton: { backgroundColor: colors.primary }, leaveButton: { borderWidth: 1, borderColor: colors.border }, membershipText: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' }, postsHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 12 }, postsTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' }, newPostButton: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 38, paddingHorizontal: 11, borderRadius: 7, backgroundColor: colors.primary }, newPostText: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  postCard: { position: 'relative', padding: 15, marginBottom: 10, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border, borderRadius: 8 }, postTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', paddingRight: 24 }, postMeta: { color: colors.textMuted, fontSize: 12, marginTop: 5 }, postContent: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 11 }, postChevron: { position: 'absolute', top: 17, right: 12 }, emptyPosts: { alignItems: 'center', paddingTop: 35 }, emptyText: { color: colors.textMuted, fontSize: 14, marginTop: 12, textAlign: 'center' },
  errorText: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 13, textAlign: 'center' }, retryButton: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', marginTop: 18, borderRadius: 8, backgroundColor: colors.primary }, retryText: { color: colors.textPrimary, fontWeight: '700' }, backTextButton: { minHeight: 44, justifyContent: 'center', marginTop: 8 }, backText: { color: colors.textSecondary, fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }, modalContent: { padding: 20, backgroundColor: colors.cardBackground, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderWidth: 1, borderColor: colors.border }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }, modalTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' }, input: { minHeight: 46, paddingHorizontal: 13, marginBottom: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.background, color: colors.textPrimary, fontSize: 15 }, contentInput: { height: 130, paddingTop: 13 }, publishButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: colors.primary }, publishText: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
});
