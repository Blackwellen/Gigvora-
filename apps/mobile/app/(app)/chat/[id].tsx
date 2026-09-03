import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useMarkConversationRead, useMessages, useSendMessage } from '../../../src/lib/useInbox';
import { useSession } from '../../../src/lib/SessionContext';
import { colors, radius, spacing } from '../../../src/lib/theme';

export default function ConversationScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const { user } = useSession();
  const { data: messages, isLoading } = useMessages(id);
  const sendMessage = useSendMessage(id);
  const markRead = useMarkConversationRead();
  const [draft, setDraft] = useState('');

  useEffect(() => {
    markRead.mutate(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function submit() {
    if (!draft.trim()) return;
    await sendMessage.mutateAsync(draft);
    setDraft('');
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ title: title || 'Conversation', headerShown: true }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {isLoading ? (
          <ActivityIndicator style={styles.loader} color={colors.brand600} />
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const mine = item.senderId === user?.id;
              return (
                <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={mine ? styles.bubbleTextMine : styles.bubbleText}>{item.body}</Text>
                  </View>
                </View>
              );
            }}
          />
        )}
        <View style={styles.inputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={`Message ${title || ''}...`}
            placeholderTextColor={colors.ink400}
            style={styles.input}
          />
          <TouchableOpacity style={[styles.sendBtn, !draft.trim() && styles.sendBtnDisabled]} onPress={submit} disabled={!draft.trim()}>
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  loader: { marginTop: spacing.xl },
  list: { padding: spacing.md },
  bubbleRow: { flexDirection: 'row', marginBottom: spacing.sm },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '75%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bubbleMine: { backgroundColor: colors.brand600 },
  bubbleTheirs: { backgroundColor: colors.ink100 },
  bubbleText: { color: colors.ink800, fontSize: 14 },
  bubbleTextMine: { color: colors.white, fontSize: 14 },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.ink100 },
  input: { flex: 1, borderWidth: 1, borderColor: colors.ink200, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 14, color: colors.ink900 },
  sendBtn: { backgroundColor: colors.brand600, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: 10, marginLeft: spacing.sm },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
});
