import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import {
  ArrowLeft,
  LayoutTemplate,
  Palette,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react-native';
import { useDebounce } from '../../../hooks/useDebounce';
import { useAuth } from '../../../contexts/AuthContext';
import { useSafeBack } from '../../../hooks/useSafeBack';
import { ErrorHandler } from '../../../utils/errors';
import { SuccessAnimation } from '../../../components/ui/SuccessAnimation';
import { TherapistHeroBanner } from '../../../components/therapist/TherapistHeroBanner';
import { TemplateCardPremium } from '../../../components/therapist/TemplateCardPremium';
import { useTherapistClients } from '../../../hooks/therapist/useClients';
import { useTherapistTemplates } from '../../../hooks/therapist/useTemplates';

const THEME_COLORS = ['#137386', '#3B82F6', '#8B5CF6', '#EC4899', '#F43F5E', '#F59E0B', '#10B981', '#64748B'];

export default function TherapistTemplates() {
  const router = useRouter();
  const goBack = useSafeBack();
  const { profile } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 920;

  const [searchQuery, setSearchQuery] = useState('');
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedTemplateForAssign, setSelectedTemplateForAssign] = useState<any>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<any>(null);
  const [colorModalVisible, setColorModalVisible] = useState(false);
  const [templateToColor, setTemplateToColor] = useState<any>(null);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    subMessage?: string;
    type: 'success' | 'error' | 'warning';
  }>({ visible: false, message: '', type: 'success' });

  const debouncedQuery = useDebounce(searchQuery, 250);
  const { clients } = useTherapistClients(profile?.id);
  const { templates, filteredTemplates, loading, assignTemplate, archiveTemplate, updateThemeColor } = useTherapistTemplates(
    profile?.id,
    debouncedQuery,
  );

  const handleAssign = async (clientId: string) => {
    if (!selectedTemplateForAssign) return;
    try {
      await assignTemplate(selectedTemplateForAssign, clientId);
      setAssignModalVisible(false);
      setSelectedTemplateForAssign(null);
      setToast({
        visible: true,
        message: 'Zugewiesen',
        subMessage: `Die Vorlage "${selectedTemplateForAssign.title}" wurde zugewiesen.`,
        type: 'success',
      });
    } catch (error) {
      const { message } = ErrorHandler.handle(error, 'Assign Template');
      setToast({ visible: true, message: 'Fehler', subMessage: message, type: 'error' });
    }
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    try {
      await archiveTemplate(templateToDelete.id);
      setDeleteModalVisible(false);
      setTemplateToDelete(null);
      setToast({
        visible: true,
        message: 'Geloescht',
        subMessage: 'Vorlage wurde archiviert.',
        type: 'success',
      });
    } catch (error) {
      const { message } = ErrorHandler.handle(error, 'Delete Template');
      setToast({ visible: true, message: 'Fehler', subMessage: message, type: 'error' });
    }
  };

  const handleUpdateThemeColor = async (color: string) => {
    if (!templateToColor) return;
    try {
      await updateThemeColor(templateToColor.id, color);
      setColorModalVisible(false);
      setTemplateToColor(null);
      setToast({
        visible: true,
        message: 'Gespeichert',
        subMessage: 'Farbe wurde aktualisiert.',
        type: 'success',
      });
    } catch (error) {
      const { message } = ErrorHandler.handle(error, 'Update Template Theme');
      setToast({ visible: true, message: 'Fehler', subMessage: message, type: 'error' });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F6F3EE' }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <TherapistHeroBanner seed="therapist-templates">
          <View style={styles.heroTopRow}>
            <TouchableOpacity onPress={goBack} style={styles.heroBackButton} activeOpacity={0.85}>
              <ArrowLeft size={16} color="#ffffff" />
              <Text style={styles.heroBackText}>Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(app)/therapist/template/new')}
              style={styles.heroPrimaryButton}
              activeOpacity={0.85}
            >
              <Plus size={16} color="#137386" />
              <Text style={styles.heroPrimaryText}>Neue Vorlage</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroTitleRow}>
            <Text style={styles.heroTitle}>Uebungsvorlagen</Text>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{templates.length}</Text>
            </View>
          </View>

          <Text style={styles.heroSubtitle}>
            Erstelle und verwalte interaktive Vorlagen fuer deine Klienten mit derselben hochwertigen Web-Anmutung.
          </Text>

          <View style={styles.searchShell}>
            <Search size={18} color="rgba(255,255,255,0.78)" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Vorlagen durchsuchen..."
              placeholderTextColor="rgba(255,255,255,0.55)"
              style={styles.searchInput}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchReset} activeOpacity={0.85}>
                <X size={15} color="rgba(255,255,255,0.88)" />
              </TouchableOpacity>
            ) : null}
          </View>
        </TherapistHeroBanner>

        <View style={styles.pageBody}>
          {loading ? (
            <ActivityIndicator size="large" color="#137386" style={{ marginTop: 48 }} />
          ) : filteredTemplates.length === 0 ? (
            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              style={styles.emptyCard}
            >
              <View style={styles.emptyIcon}>
                <Sparkles size={30} color="#6366F1" />
              </View>
              <Text style={styles.emptyTitle}>{searchQuery ? 'Keine Treffer' : 'Noch keine Vorlagen'}</Text>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'Fuer deine Suche wurde keine passende Vorlage gefunden.'
                  : 'Lege deine erste Vorlage an, damit der Therapeutenbereich konsistent und hochwertig wirkt.'}
              </Text>
              {!searchQuery ? (
                <TouchableOpacity
                  onPress={() => router.push('/(app)/therapist/template/new')}
                  style={styles.emptyButton}
                  activeOpacity={0.85}
                >
                  <Plus size={18} color="#ffffff" />
                  <Text style={styles.emptyButtonText}>Erste Vorlage erstellen</Text>
                </TouchableOpacity>
              ) : null}
            </MotiView>
          ) : (
            <View style={[styles.templateGrid, { flexDirection: isDesktop ? 'row' : 'column' }]}>
              {filteredTemplates.map((template, index) => (
                <View key={template.id} style={{ width: isDesktop ? '48.6%' : '100%' }}>
                  <TemplateCardPremium
                    tpl={template}
                    index={index}
                    onThemePress={() => {
                      setTemplateToColor(template);
                      setColorModalVisible(true);
                    }}
                    onDelete={() => {
                      setTemplateToDelete(template);
                      setDeleteModalVisible(true);
                    }}
                    onEdit={() => router.push(`/(app)/therapist/template/${template.id}` as any)}
                    onAssign={() => {
                      setSelectedTemplateForAssign(template);
                      setAssignModalVisible(true);
                    }}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={assignModalVisible} transparent animationType="fade" onRequestClose={() => setAssignModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <MotiView from={{ opacity: 0, scale: 0.96, translateY: 18 }} animate={{ opacity: 1, scale: 1, translateY: 0 }} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Klient auswaehlen</Text>
                <Text style={styles.modalSubtitle}>Wem moechtest du "{selectedTemplateForAssign?.title}" zuweisen?</Text>
              </View>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)} style={styles.modalCloseButton} activeOpacity={0.85}>
                <X size={18} color="#334155" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {clients.length === 0 ? (
                <View style={styles.smallEmptyState}>
                  <Text style={styles.smallEmptyText}>Noch keine Klienten vorhanden.</Text>
                </View>
              ) : (
                clients.map((client) => (
                  <TouchableOpacity key={client.id} onPress={() => handleAssign(client.id)} style={styles.clientRow} activeOpacity={0.85}>
                    <View style={styles.clientAvatar}>
                      <Text style={styles.clientAvatarText}>
                        {client.firstName?.charAt(0)}
                        {client.lastName?.charAt(0)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clientName}>{client.firstName} {client.lastName}</Text>
                      <Text style={styles.clientMail}>{client.email || 'Klient'}</Text>
                    </View>
                    <View style={styles.clientSend}>
                      <Send size={14} color="#ffffff" />
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </MotiView>
        </View>
      </Modal>

      <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <MotiView from={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} style={[styles.modalCard, { maxWidth: 420 }]}>
            <View style={styles.deleteIconWrap}>
              <Trash2 size={34} color="#EF4444" />
            </View>
            <Text style={[styles.modalTitle, { textAlign: 'center' }]}>Vorlage archivieren?</Text>
            <Text style={[styles.modalSubtitle, { textAlign: 'center', marginTop: 8 }]}>
              {templateToDelete?.title || 'Diese Vorlage'} wird aus der aktiven Bibliothek entfernt.
            </Text>

            <View style={styles.deletePreview}>
              <View style={[styles.deletePreviewIcon, { backgroundColor: `${templateToDelete?.themeColor || '#6366F1'}16` }]}>
                <LayoutTemplate size={18} color={templateToDelete?.themeColor || '#6366F1'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.deletePreviewTitle} numberOfLines={1}>{templateToDelete?.title}</Text>
                <Text style={styles.deletePreviewMeta}>{templateToDelete?.blocks?.length || 0} Module</Text>
              </View>
            </View>

            <View style={styles.deleteActions}>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={styles.cancelButton} activeOpacity={0.85}>
                <Text style={styles.cancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDeleteTemplate} style={styles.deleteButton} activeOpacity={0.85}>
                <Text style={styles.deleteText}>Archivieren</Text>
              </TouchableOpacity>
            </View>
          </MotiView>
        </View>
      </Modal>

      <Modal visible={colorModalVisible} transparent animationType="fade" onRequestClose={() => setColorModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <MotiView from={{ opacity: 0, scale: 0.96, translateY: 18 }} animate={{ opacity: 1, scale: 1, translateY: 0 }} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Farbwelt waehlen</Text>
                <Text style={styles.modalSubtitle}>Die Akzentfarbe wird direkt auf die Vorlage angewendet.</Text>
              </View>
              <TouchableOpacity onPress={() => setColorModalVisible(false)} style={styles.modalCloseButton} activeOpacity={0.85}>
                <X size={18} color="#334155" />
              </TouchableOpacity>
            </View>

            <View style={styles.colorGrid}>
              {THEME_COLORS.map((color) => (
                <TouchableOpacity key={color} onPress={() => handleUpdateThemeColor(color)} style={[styles.colorSwatch, { backgroundColor: color }]} activeOpacity={0.85}>
                  <Palette size={18} color="#ffffff" />
                </TouchableOpacity>
              ))}
            </View>
          </MotiView>
        </View>
      </Modal>

      <SuccessAnimation
        visible={toast.visible}
        message={toast.message}
        subMessage={toast.subMessage}
        type={toast.type}
        onAnimationDone={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = {
  heroTopRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    gap: 12,
    flexWrap: 'wrap' as const,
    marginBottom: 24,
  },
  heroBackButton: {
    minHeight: 46,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  heroBackText: {
    color: '#ffffff',
    fontWeight: '800' as const,
    fontSize: 14,
  },
  heroPrimaryButton: {
    minHeight: 46,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  heroPrimaryText: {
    color: '#137386',
    fontWeight: '900' as const,
    fontSize: 14,
  },
  heroTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    flexWrap: 'wrap' as const,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900' as const,
    letterSpacing: -0.9,
  },
  heroBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  heroBadgeText: {
    color: '#ffffff',
    fontWeight: '900' as const,
    fontSize: 13,
  },
  heroSubtitle: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.74)',
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 22,
    maxWidth: 620,
  },
  searchShell: {
    marginTop: 18,
    minHeight: 58,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    paddingHorizontal: 18,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  searchReset: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  pageBody: {
    width: '100%' as const,
    maxWidth: 1080,
    alignSelf: 'center' as const,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  templateGrid: {
    gap: 18,
    flexWrap: 'wrap' as const,
    paddingBottom: 18,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 30,
    paddingHorizontal: 30,
    paddingVertical: 42,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: '#E8E6E1',
    shadowColor: '#243842',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 28,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 18,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900' as const,
    letterSpacing: -0.5,
  },
  emptyText: {
    marginTop: 8,
    maxWidth: 360,
    textAlign: 'center' as const,
    color: '#64748B',
    fontSize: 15,
    fontWeight: '500' as const,
    lineHeight: 22,
  },
  emptyButton: {
    marginTop: 22,
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: 18,
    backgroundColor: '#137386',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontWeight: '900' as const,
    fontSize: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.42)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 18,
  },
  modalCard: {
    width: '100%' as const,
    maxWidth: 520,
    backgroundColor: '#ffffff',
    borderRadius: 30,
    padding: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 34,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    gap: 12,
    marginBottom: 18,
  },
  modalTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '900' as const,
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  modalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  smallEmptyState: {
    paddingVertical: 28,
    alignItems: 'center' as const,
  },
  smallEmptyText: {
    color: '#64748B',
    fontWeight: '600' as const,
  },
  clientRow: {
    minHeight: 72,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 10,
    backgroundColor: '#FBFDFF',
  },
  clientAvatar: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: 'rgba(19,115,134,0.12)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  clientAvatarText: {
    color: '#137386',
    fontWeight: '900' as const,
  },
  clientName: {
    color: '#0F172A',
    fontWeight: '800' as const,
    fontSize: 15,
  },
  clientMail: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  clientSend: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#137386',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  deleteIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 28,
    backgroundColor: '#FEF2F2',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    alignSelf: 'center' as const,
    marginBottom: 18,
  },
  deletePreview: {
    marginTop: 20,
    marginBottom: 22,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
    padding: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  deletePreviewIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  deletePreviewTitle: {
    color: '#0F172A',
    fontWeight: '800' as const,
    fontSize: 15,
  },
  deletePreviewMeta: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  deleteActions: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  cancelText: {
    color: '#0F172A',
    fontWeight: '800' as const,
    fontSize: 15,
  },
  deleteButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: '#EF4444',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  deleteText: {
    color: '#ffffff',
    fontWeight: '900' as const,
    fontSize: 15,
  },
  colorGrid: {
    marginTop: 8,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  colorSwatch: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 4,
  },
};
