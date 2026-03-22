import { View, Text, TouchableOpacity } from 'react-native';
import { Eye, Send, Star, Tag, Trash2 } from 'lucide-react-native';
import { MotiView } from 'moti';
import { TYPE_CONFIG } from './ResourceDesign';

export function ResourceCard({
    resource,
    index,
    onDelete,
    onPreview,
    onAssign,
    onTogglePin,
}: {
    resource: any;
    index: number;
    onDelete: (resource: any) => void;
    onPreview: (resource: any) => void;
    onAssign: (resource: any) => void;
    onTogglePin: (resource: any) => void;
}) {
    const config = TYPE_CONFIG[resource.type] || TYPE_CONFIG.file;

    return (
        <MotiView
            from={{ opacity: 0, translateY: 18 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 280, delay: 60 + (index * 36) }}
        >
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 30, borderWidth: 1, borderColor: resource.isPinned ? '#E7C980' : 'rgba(36,56,66,0.07)', overflow: 'hidden', shadowColor: '#10212A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 18, elevation: 3 }}>
                {resource.isPinned ? (
                    <View style={{ backgroundColor: '#FFF8E7', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0D99B', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Star size={12} color="#C08A1B" fill="#C08A1B" />
                        <Text style={{ color: '#9A6B10', fontSize: 11, fontWeight: '900', letterSpacing: 1 }}>ANGEHEFTET</Text>
                    </View>
                ) : null}

                <View style={{ padding: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                        <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: config.bg, borderWidth: 1, borderColor: config.border, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: config.text, fontSize: 20, fontWeight: '900' }}>{config.icon}</Text>
                        </View>

                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                <Text style={{ color: '#243842', fontSize: 18, fontWeight: '900', flex: 1, lineHeight: 24 }}>{resource.title}</Text>
                                <TouchableOpacity onPress={() => onTogglePin(resource)}>
                                    <Star size={20} color={resource.isPinned ? '#C08A1B' : '#C7D1D8'} fill={resource.isPinned ? '#C08A1B' : 'transparent'} />
                                </TouchableOpacity>
                            </View>

                            <View style={{ marginTop: 8, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: config.bg, alignSelf: 'flex-start' }}>
                                <Text style={{ color: config.text, fontSize: 11, fontWeight: '900', letterSpacing: 1 }}>{config.label.toUpperCase()}</Text>
                            </View>
                        </View>
                    </View>

                    {resource.description ? (
                        <View style={{ marginTop: 14, backgroundColor: '#F7F4EE', borderRadius: 16, padding: 12 }}>
                            <Text style={{ color: '#6B7C85', fontSize: 14, lineHeight: 20, fontWeight: '600' }}>{resource.description}</Text>
                        </View>
                    ) : null}

                    {resource.tags?.length ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                            {resource.tags.map((tag: string, tagIndex: number) => (
                                <View key={`${resource.id}-${tagIndex}`} style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: '#F7F4EE', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Tag size={11} color="#6B7C85" />
                                    <Text style={{ color: '#6B7C85', fontSize: 12, fontWeight: '800' }}>{tag}</Text>
                                </View>
                            ))}
                        </View>
                    ) : null}

                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(36,56,66,0.06)' }}>
                        <TouchableOpacity
                            onPress={() => onDelete(resource)}
                            style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#F5C2C2', flexDirection: 'row', alignItems: 'center', gap: 6 }}
                        >
                            <Trash2 size={14} color="#DC2626" />
                            <Text style={{ color: '#DC2626', fontWeight: '900', fontSize: 13 }}>Loeschen</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => onPreview(resource)}
                            style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: '#F7F4EE', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Eye size={16} color="#6B7C85" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => onAssign(resource)}
                            style={{ flex: 1, borderRadius: 16, backgroundColor: '#243842', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        >
                            <Send size={15} color="#C09D59" />
                            <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>Zuweisen</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </MotiView>
    );
}
