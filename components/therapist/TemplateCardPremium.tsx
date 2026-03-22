import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { FileText, LayoutTemplate, Palette, Send, Trash2 } from 'lucide-react-native';
import { MotiView } from 'moti';

interface TemplateCardPremiumProps {
  tpl: any;
  index: number;
  onEdit: () => void;
  onAssign: () => void;
  onDelete: () => void;
  onThemePress?: () => void;
}

export const TemplateCardPremium = memo(function TemplateCardPremium({
  tpl,
  index,
  onEdit,
  onAssign,
  onDelete,
  onThemePress,
}: TemplateCardPremiumProps) {
  const accent = tpl?.themeColor || '#6366F1';
  const blockCount = tpl?.blocks?.length || 0;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 18 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 320, delay: index * 45 }}
      style={[styles.card, { borderColor: `${accent}40` }]}
    >
      <View style={styles.topActions}>
        {onThemePress ? (
          <TouchableOpacity onPress={onThemePress} style={styles.themeButton} activeOpacity={0.85}>
            <Palette size={14} color={accent} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={onDelete} style={styles.deleteButton} activeOpacity={0.85}>
          <Trash2 size={14} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {tpl?.coverImage ? (
        <View style={styles.cover}>
          <Image source={{ uri: tpl.coverImage }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
          <View style={styles.coverOverlay} />
        </View>
      ) : (
        <View style={[styles.cover, { backgroundColor: `${accent}10` }]}>
          <LayoutTemplate size={30} color={accent} />
        </View>
      )}

      <View style={styles.body}>
        <View style={[styles.iconWrap, { backgroundColor: `${accent}14`, borderColor: `${accent}28` }]}>
          <LayoutTemplate size={18} color={accent} />
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {tpl?.title}
        </Text>

        <View style={styles.metaRow}>
          <FileText size={12} color="#64748B" />
          <Text style={styles.metaText}>
            {blockCount} {blockCount === 1 ? 'Modul' : 'Module'}
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={onEdit} style={styles.secondaryAction} activeOpacity={0.85}>
            <Text style={styles.secondaryText}>Bearbeiten</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onAssign}
            style={[styles.primaryAction, { backgroundColor: `${accent}14`, borderColor: `${accent}2E` }]}
            activeOpacity={0.85}
          >
            <Send size={13} color={accent} />
            <Text style={[styles.primaryText, { color: accent }]}>Zuweisen</Text>
          </TouchableOpacity>
        </View>
      </View>
    </MotiView>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#243842',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.07,
    shadowRadius: 26,
    elevation: 4,
  },
  topActions: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 3,
    flexDirection: 'row',
    gap: 8,
  },
  themeButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(254,242,242,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cover: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
  },
  body: {
    padding: 20,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 14,
  },
  title: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.4,
    lineHeight: 22,
  },
  metaRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRow: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    gap: 10,
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: '#F4F6F8',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 14,
  },
  primaryAction: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  primaryText: {
    fontWeight: '800',
    fontSize: 14,
  },
});
