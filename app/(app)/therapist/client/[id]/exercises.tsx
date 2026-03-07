import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  TextInput,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import React, { useState, useEffect, useCallback } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { uploadFile, getExtension } from "../../../../../utils/uploadFile";
import { db } from "../../../../../utils/firebase";
import { ExerciseRepository } from "../../../../../utils/repositories/ExerciseRepository";
import { ClientRepository } from "../../../../../utils/repositories/ClientRepository";
import { TemplateRepository } from "../../../../../utils/repositories/TemplateRepository";
import ExerciseBuilder, {
  ExerciseBlock,
} from "../../../../../components/therapist/ExerciseBuilder";
import i18n from "../../../../../utils/i18n";
import {
  ClipboardList,
  Trash2,
  Sparkles,
  Activity,
  Edit3,
  Lock,
  Clock,
  ArrowLeft,
} from "lucide-react-native";
import { MotiView } from "moti";
import { useAuth } from "../../../../../contexts/AuthContext";
import { SuccessAnimation } from "../../../../../components/ui/SuccessAnimation";
import { useSafeBack } from "../../../../../hooks/useSafeBack";
import { DarkAmbientOrbs } from "../../../../../components/ui/AmbientOrbs";

export default function ClientExercisesView() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const goBack = useSafeBack();
  const { profile } = useAuth();

  const [client, setClient] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    subMessage?: string;
    type: "success" | "error" | "warning";
  }>({ visible: false, message: "", type: "success" });

  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [recurrence, setRecurrence] = useState<string>("none");
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>([]);
  const [reminderFrequency, setReminderFrequency] = useState<string>("none");
  const [reminderTime, setReminderTime] = useState<string>("18:00");
  const [builderMode, setBuilderMode] = useState<"select" | "build">("select");
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Modals
  const [deleteExerciseModalVisible, setDeleteExerciseModalVisible] =
    useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);



  const toggleDay = (dayKey: string) => {
    setRecurrenceDays((prev) =>
      prev.includes(dayKey)
        ? prev.filter((d) => d !== dayKey)
        : [...prev, dayKey],
    );
  };

  const WEEKDAYS = [
    { key: "1", label: "Mo" },
    { key: "2", label: "Di" },
    { key: "3", label: "Mi" },
    { key: "4", label: "Do" },
    { key: "5", label: "Fr" },
    { key: "6", label: "Sa" },
    { key: "0", label: "So" },
  ];

  useFocusEffect(
    useCallback(() => {
      if (id) {
        fetchClientData();
        fetchExercises();
        fetchTemplates();
      }
    }, [id])
  );

  const fetchClientData = async () => {
    try {
      const c = await ClientRepository.findById(id as string);
      if (c) setClient(c);
    } catch (error) {
      console.error("Error fetching client data", error);
    }
  };

  const fetchExercises = async () => {
    try {
      const data = await ExerciseRepository.findByClientId(id as string);
      setExercises(data);
    } catch (error) {
      console.error("Error fetching exercises", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      if (!profile?.id) return;
      const activeTemplates = await TemplateRepository.findActiveTemplates(30, profile.id);
      setTemplates(activeTemplates);
    } catch (error) {
      console.error("Error fetching templates", error);
    }
  };

  const handleOpenModal = () => {
    setShowBuilder(true);
    setBuilderMode("select");
    setSelectedTemplate(null);
    setRecurrence("none");
    setReminderFrequency("none");
  };

  const saveExercise = async (title: string, blocks: ExerciseBlock[], themeColor?: string, coverImage?: string) => {
    try {
      // Upload media blocks first
      const processedBlocks = await Promise.all(
        blocks.map(async (block) => {
          if (
            block.type === "media" &&
            block.mediaUri &&
            !block.mediaUri.startsWith("http")
          ) {
            try {
              const ext = getExtension(block.mediaUri);
              const filename = `exercise_media/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
              const downloadUrl = await uploadFile(block.mediaUri, filename);
              return { ...block, mediaUri: downloadUrl };
            } catch (uploadError) {
              console.error("Error uploading media:", uploadError);
              throw new Error(i18n.t("therapist.err_upload"));
            }
          }
          return block;
        }),
      );

      const exerciseData: any = {
        clientId: id,
        therapistId: profile?.id || "unknown",
        title,
        blocks: processedBlocks,
        recurrence: recurrence || "none",
        recurrenceDays: recurrence === "custom" ? recurrenceDays : [],
        reminderTime: reminderTime || "18:00",
        createdAt: serverTimestamp(),
        completed: false,
      };

      if (themeColor) exerciseData.themeColor = themeColor;
      if (coverImage) exerciseData.coverImage = coverImage;

      // Firebase throws if any nested object contains undefined
      const removeUndefined = (obj: any): any => {
        if (Array.isArray(obj)) return obj.map(removeUndefined);
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return obj;

        return Object.fromEntries(
          Object.entries(obj)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => [k, removeUndefined(v)])
        );
      };

      const sanitizedData = removeUndefined(exerciseData);

      await addDoc(collection(db, "exercises"), sanitizedData);
      setShowBuilder(false);
      setSelectedTemplate(null);
      fetchExercises(); // Refresh the list
      setToast({
        visible: true,
        message: "Erfolg",
        subMessage: i18n.t("therapist.success_assigned"),
        type: "success",
      });
    } catch (error: any) {
      console.error("Error saving exercise", error);
      setToast({
        visible: true,
        message: "Fehler",
        subMessage: error.message || "Übung konnte nicht gespeichert werden.",
        type: "error",
      });
    }
  };

  const promptDeleteExercise = (exerciseId: string, title: string) => {
    setExerciseToDelete({ id: exerciseId, title });
    setDeleteExerciseModalVisible(true);
  };

  const confirmDeleteExercise = async () => {
    if (!exerciseToDelete) return;
    setDeleteExerciseModalVisible(false);
    try {
      await ExerciseRepository.delete(exerciseToDelete.id);
      setExercises((prev) =>
        prev.filter((ex) => ex.id !== exerciseToDelete.id),
      );
    } catch {
      setToast({
        visible: true,
        message: "Fehler",
        subMessage: i18n.t("therapist.delete_err"),
        type: "error",
      });
    } finally {
      setExerciseToDelete(null);
    }
  };

  const confirmTemplateAssignment = () => {
    if (!selectedTemplate) {
      setToast({
        visible: true,
        message: "Fehler",
        subMessage: "Bitte wähle eine Vorlage aus.",
        type: "warning",
      });
      return;
    }
    saveExercise(selectedTemplate.title, selectedTemplate.blocks || [], selectedTemplate.themeColor, selectedTemplate.coverImage);
  };



  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F7F4EE]">
        <ActivityIndicator size="large" color="#2D666B" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F7F4EE]">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Header Section */}
      <MotiView
        from={{ opacity: 0, translateY: -40 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 400, delay: 50 }}
        style={{ zIndex: 10 }}
      >
        <View className="bg-[#2D666B] pt-16 pb-8 px-8 rounded-b-[40px] shadow-lg overflow-hidden relative">
          <DarkAmbientOrbs />
          <View className="flex-row items-center justify-between w-full max-w-5xl mx-auto z-10">
            <TouchableOpacity
              onPress={goBack}
              className="bg-white/20 px-4 py-3 rounded-2xl backdrop-blur-md flex-row items-center"
            >
              <ArrowLeft size={20} color="white" style={{ marginRight: 8 }} />
              <Text className="text-white font-bold text-[16px]">Zurück</Text>
            </TouchableOpacity>
            <View className="flex-row items-center flex-1 justify-end ml-4">
              <View className="bg-white/10 w-12 h-12 rounded-[16px] items-center justify-center mr-4 border border-white/20">
                {client?.photoURL ? (
                  <Text className="text-white text-xs">PIC</Text>
                ) : (
                  <Text className="text-white font-black text-[20px]">
                    {client?.firstName?.charAt(0)}
                    {client?.lastName?.charAt(0)}
                  </Text>
                )}
              </View>
              <Text
                className="text-[24px] font-black text-white tracking-tight"
                numberOfLines={1}
              >
                {client?.firstName
                  ? `${client.firstName} ${client.lastName} - Übungen`
                  : i18n.t("therapist.exercises")}
              </Text>
            </View>
          </View>
        </View>
      </MotiView>

      <View
        className="w-full"
        style={{
          paddingHorizontal: 32,
          paddingTop: 32,
          maxWidth: 1024,
          marginHorizontal: "auto",
        }}
      >
        <View className="w-full max-w-4xl mx-auto">
          <View className="flex-row justify-between items-center mb-8">
            <Text className="text-[28px] font-black text-[#1F2528] tracking-tight">
              {i18n.t("therapist.exercises")}
            </Text>
            <View className="flex-row gap-3">
              <View className="bg-orange-50 px-4 py-2 rounded-[16px] border border-orange-100/50 shadow-sm">
                <Text className="text-orange-600 text-[13px] font-black tracking-wide uppercase">
                  {i18n.t("therapist.open_exercises", {
                    count: exercises.filter((e) => !e.completed).length,
                  })}
                </Text>
              </View>
              <View className="bg-emerald-50 px-4 py-2 rounded-[16px] border border-emerald-100/50 shadow-sm">
                <Text className="text-emerald-600 text-[13px] font-black tracking-wide uppercase">
                  {i18n.t("therapist.done_exercises", {
                    count: exercises.filter((e) => e.completed).length,
                  })}
                </Text>
              </View>
            </View>
          </View>

          {exercises.length === 0 ? (
            <View className="bg-[#F7F4EE] p-10 py-16 px-8 rounded-[32px] border-2 border-dashed border-gray-200/80 items-center mt-4 mb-10">
              <View className="w-24 h-24 bg-white rounded-full items-center justify-center mb-6 shadow-sm border border-gray-100">
                <ClipboardList size={40} color="#D1D5DB" />
              </View>
              <Text className="text-[#1F2528] text-[20px] text-center font-black mb-3 tracking-tight">
                {i18n.t("therapist.no_exercises_assigned")}
              </Text>
              <Text className="text-[#1F2528]/50 text-[15px] text-center max-w-[320px] leading-relaxed font-medium">
                {i18n.t("therapist.tap_to_assign")}
              </Text>
            </View>
          ) : (
            <View className="mb-6">
              {/* Open Exercises Section */}
              {exercises.filter((e) => !e.completed).length > 0 && (
                <View className="mb-8">
                  <Text className="text-[13px] font-black text-[#1F2528]/40 uppercase tracking-widest mb-4 ml-2">
                    Offene Übungen
                  </Text>
                  <View className="flex-row flex-wrap gap-6">
                    {exercises
                      .filter((e) => !e.completed)
                      .map((ex) => (
                        <View
                          key={ex.id}
                          className="bg-white p-6 rounded-[28px] border border-orange-100/60 shadow-sm flex-1 min-w-[300px] max-w-full md:max-w-[calc(50%-12px)]"
                          style={{
                            shadowColor: "#F97316",
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.06,
                            shadowRadius: 24,
                            elevation: 4,
                          }}
                        >
                          <View className="flex-row justify-between items-start mb-4">
                            <View className="flex-1 pr-4">
                              <Text className="text-[18px] font-bold text-[#1F2528] mb-2">
                                {ex.title}
                              </Text>
                              <View className="flex-row flex-wrap gap-2 mt-1">
                                <View className="px-3 py-1.5 rounded-xl self-start bg-orange-50 border border-orange-100/50">
                                  <Text className="text-[13px] font-bold text-orange-600">
                                    {i18n.t("therapist.status_open")}
                                  </Text>
                                </View>
                                {ex.recurrence && ex.recurrence !== "none" && (
                                  <View className="bg-sky-50 px-3 py-1.5 rounded-xl self-start border border-sky-100/50">
                                    <Text className="text-sky-600 text-[13px] font-bold">
                                      {ex.recurrence === "daily"
                                        ? i18n.t("therapist.recur_daily")
                                        : i18n.t("therapist.recur_weekly")}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                            <TouchableOpacity
                              onPress={() =>
                                promptDeleteExercise(ex.id, ex.title)
                              }
                              className="bg-red-50/80 w-11 h-11 rounded-full items-center justify-center ml-2 border border-red-100"
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Trash2 size={18} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                  </View>
                </View>
              )}

              {/* Completed Exercises Section */}
              {exercises.filter((e) => e.completed).length > 0 && (
                <View className="mb-4">
                  <Text className="text-[13px] font-black text-[#1F2528]/40 uppercase tracking-widest mb-4 ml-2">
                    Abgeschlossene Übungen
                  </Text>
                  <View className="flex-row flex-wrap gap-6">
                    {exercises
                      .filter((e) => e.completed)
                      .map((ex) => (
                        <View
                          key={ex.id}
                          className="bg-white p-6 rounded-[28px] border border-emerald-100/60 shadow-sm flex-1 min-w-[300px] max-w-full md:max-w-[calc(50%-12px)]"
                          style={{
                            shadowColor: "#788E76",
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.04,
                            shadowRadius: 24,
                            elevation: 3,
                          }}
                        >
                          <View className="flex-row justify-between items-start mb-4">
                            <View className="flex-1 pr-4">
                              <Text className="text-[18px] font-bold text-[#1F2528] mb-2">
                                {ex.title}
                              </Text>
                              <View className="flex-row flex-wrap gap-2 mt-1">
                                <View className="px-3 py-1.5 rounded-xl self-start bg-emerald-50 border border-emerald-100/50">
                                  <Text className="text-[13px] font-bold text-emerald-600">
                                    {i18n.t("therapist.status_done")}
                                  </Text>
                                </View>
                              </View>
                            </View>
                            <TouchableOpacity
                              onPress={() =>
                                promptDeleteExercise(ex.id, ex.title)
                              }
                              className="bg-red-50/80 w-11 h-11 rounded-full items-center justify-center ml-2 border border-red-100"
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Trash2 size={18} color="#EF4444" />
                            </TouchableOpacity>
                          </View>

                          <View className="mt-auto pt-5 border-t border-gray-100">
                            <Text className="text-[#1F2528]/50 font-bold text-[12px] uppercase tracking-wider mb-4">
                              {i18n.t("therapist.client_answers")}
                            </Text>

                            {ex.sharedAnswers === false ? (
                              <View className="bg-[#F7F4EE] p-6 rounded-[20px] items-center justify-center border border-gray-100 mt-2 flex-1">
                                <Lock
                                  size={24}
                                  color="#B08C57"
                                  style={{ marginBottom: 12 }}
                                />
                                <Text className="text-[#1F2528]/70 text-[14px] font-medium text-center leading-relaxed">
                                  Der Klient hat sich entschieden, die Antworten
                                  privat zu halten.
                                </Text>
                                <Text className="text-[#1F2528]/50 text-[12px] text-center mt-3 font-medium">
                                  Abgeschlossen am:{" "}
                                  {new Date(
                                    ex.lastCompletedAt || ex.createdAt,
                                  ).toLocaleDateString(i18n.locale, {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </Text>
                              </View>
                            ) : (
                              <View className="flex-1 gap-3">
                                {ex.answers &&
                                  Object.keys(ex.answers).length > 0 &&
                                  ex.blocks?.map((block: any) => {
                                    if (!ex.answers[block.id]) return null;
                                    return (
                                      <View
                                        key={block.id}
                                        className="mb-2 bg-[#F7F4EE] p-4 rounded-[20px] border border-gray-200/50"
                                      >
                                        <View className="flex-row items-center mb-2 mt-0.5">
                                          {block.type === "scale" ? (
                                            <Activity
                                              size={16}
                                              color="#2D666B"
                                              style={{ marginRight: 6 }}
                                            />
                                          ) : (
                                            <Edit3
                                              size={16}
                                              color="#2D666B"
                                              style={{ marginRight: 6 }}
                                            />
                                          )}
                                          <Text className="text-[13px] text-[#2D666B]/80 font-bold tracking-wide">
                                            {block.type === "scale"
                                              ? i18n.t("blocks.scale") ||
                                              "Skala"
                                              : i18n.t("blocks.reflection") ||
                                              "Reflexion"}
                                          </Text>
                                        </View>
                                        <Text
                                          className="text-[14px] text-[#1F2528]/70 mb-3 font-medium"
                                          numberOfLines={2}
                                        >
                                          {block.content}
                                        </Text>
                                        <View className="bg-white px-4 py-3 rounded-2xl border border-gray-200 shadow-sm">
                                          <Text className="text-[15px] text-[#1F2528] font-semibold">
                                            {ex.answers[block.id]}
                                          </Text>
                                        </View>
                                      </View>
                                    );
                                  })}
                              </View>
                            )}
                          </View>
                        </View>
                      ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        <View className="max-w-4xl mx-auto w-full mt-8">
          <TouchableOpacity
            className="bg-[#2D666B] py-5 rounded-[24px] items-center justify-center flex-row shadow-sm mb-12"
            style={{
              shadowColor: "#2D666B",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 24,
              elevation: 6,
            }}
            onPress={handleOpenModal}
          >
            <Activity size={20} color="white" style={{ marginRight: 10 }} />
            <Text className="text-white font-bold text-[18px]">
              {i18n.t("therapist.assign_exercise")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Exercise Assignment Modal */}
      <Modal
        visible={showBuilder}
        animationType="slide"
        transparent={Platform.OS !== 'ios'}
        presentationStyle={Platform.OS === 'ios' ? 'formSheet' : 'overFullScreen'}
      >
        {Platform.OS !== 'ios' ? (
          // On Android/Web: overlay with our own rounded card
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ flex: 1, backgroundColor: '#F7F4EE', borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden', marginTop: 40 }}>
              {/* Header */}
              <View style={{ backgroundColor: '#2D666B', paddingTop: 24, paddingBottom: 24, paddingHorizontal: 32, shadowColor: '#2D666B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 8, borderTopLeftRadius: 40, borderTopRightRadius: 40 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: 896, width: '100%', alignSelf: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: 'white', letterSpacing: -0.5 }}>
                    {i18n.t("therapist.assign_title")}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowBuilder(false)}
                    style={{ backgroundColor: 'rgba(255,255,255,0.24)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 }}
                  >
                    <Text style={{ color: 'white', fontWeight: '700' }}>
                      {i18n.t("therapist.cancel")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              {/* Content */}
              {builderMode === "select" ? (
                <>
                  <ScrollView
                    style={{ flex: 1, width: '100%' }}
                    contentContainerStyle={{
                      padding: 32,
                      paddingBottom: 60,
                      maxWidth: 896,
                      marginHorizontal: 'auto',
                    }}
                  >
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#1F2528', marginBottom: 16 }}>
                      {i18n.t("therapist.step_1_select")}
                    </Text>

                    <TouchableOpacity
                      onPress={() => setBuilderMode("build")}
                      style={{ backgroundColor: '#EEF4F3', borderWidth: 1, borderColor: '#D8E6E4', padding: 24, borderRadius: 24, marginBottom: 32, shadowColor: '#4E7E82', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, flexDirection: 'row', alignItems: 'center' }}
                    >
                      <View style={{ width: 56, height: 56, backgroundColor: 'white', borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, marginRight: 20 }}>
                        <Sparkles size={24} color="#4E7E82" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#0C4A6E', fontWeight: '900', fontSize: 18, marginBottom: 4 }}>
                          {i18n.t("therapist.create_new")}
                        </Text>
                        <Text style={{ color: '#0369A1', fontSize: 14, fontWeight: '500', lineHeight: 20 }}>
                          {i18n.t("therapist.create_new_desc")}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {templates.length > 0 && (
                      <>
                        <Text style={{ color: '#8B938E', fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>
                          {i18n.t("therapist.or_template")}
                        </Text>
                        {templates.map((t) => (
                          <TouchableOpacity
                            key={t.id}
                            onPress={() => setSelectedTemplate(t)}
                            style={{
                              padding: 20, borderRadius: 24, marginBottom: 16,
                              borderWidth: 1.5,
                              borderColor: selectedTemplate?.id === t.id ? '#2D666B' : '#E2E8F0',
                              backgroundColor: selectedTemplate?.id === t.id ? 'rgba(19,115,134,0.06)' : 'white',
                              shadowColor: '#1F2528', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2
                            }}
                          >
                            <Text style={{ fontWeight: '800', fontSize: 18, marginBottom: 4, color: selectedTemplate?.id === t.id ? '#2D666B' : '#1F2528' }}>
                              {t.title}
                            </Text>
                            <Text style={{ color: '#8B938E', fontSize: 14, fontWeight: '500' }}>
                              {t.blocks?.length || 0} Module
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </>
                    )}

                    <View style={{ marginTop: 40 }}>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#1F2528', marginBottom: 16 }}>
                        Wiederholung der Übung
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                        {["none", "daily", "custom"].map((freq) => (
                          <TouchableOpacity
                            key={freq}
                            onPress={() => setRecurrence(freq)}
                            style={{
                              flex: 1, paddingVertical: 16, borderRadius: 20, alignItems: 'center',
                              borderWidth: 1.5,
                              borderColor: recurrence === freq ? '#1F2528' : '#E2E8F0',
                              backgroundColor: recurrence === freq ? '#1F2528' : 'white',
                              shadowColor: '#1F2528', shadowOffset: { width: 0, height: 4 }, shadowOpacity: recurrence === freq ? 0.15 : 0.02, shadowRadius: 12, elevation: 2
                            }}
                          >
                            <Text style={{ fontWeight: '800', fontSize: 15, color: recurrence === freq ? 'white' : '#8B938E' }}>
                              {freq === "none" ? "Keine" : freq === "daily" ? "Täglich" : "Spezifische Tage"}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      {recurrence === "custom" && (
                        <View
                          style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32, backgroundColor: 'white', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#1F2528', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 }}
                        >
                          {WEEKDAYS.map((day) => {
                            const isActive = recurrenceDays.includes(day.key);
                            return (
                              <TouchableOpacity
                                key={day.key}
                                onPress={() => toggleDay(day.key)}
                                style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: isActive ? '#2D666B' : '#F5F1EA', borderWidth: isActive ? 0 : 1, borderColor: '#E2E8F0' }}
                              >
                                <Text style={{ fontWeight: '800', fontSize: 15, color: isActive ? 'white' : '#8B938E' }}>
                                  {day.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>

                    <View style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#1F2528', marginBottom: 16 }}>
                        Push-Erinnerung (Uhrzeit)
                      </Text>
                      <View
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 24, padding: 20, marginBottom: 32, shadowColor: '#1F2528', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 12, elevation: 2 }}
                      >
                        <View style={{ width: 48, height: 48, backgroundColor: '#EEF4F3', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16, borderWidth: 1, borderColor: '#D8E6E4' }}>
                          <Clock size={24} color="#4E7E82" />
                        </View>
                        <TextInput
                          value={reminderTime}
                          onChangeText={setReminderTime}
                          placeholder="18:00"
                          keyboardType="numeric"
                          maxLength={5}
                          style={{ flex: 1, fontWeight: '900', fontSize: 24, color: '#1F2528', letterSpacing: 2 }}
                        />
                        <Text style={{ color: '#8B938E', fontWeight: '700', fontSize: 16, textTransform: 'uppercase', letterSpacing: 2, marginLeft: 12 }}>
                          Uhr
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={confirmTemplateAssignment}
                      disabled={!selectedTemplate}
                      style={{
                        paddingVertical: 20, borderRadius: 24, alignItems: 'center', marginTop: 8,
                        backgroundColor: selectedTemplate ? '#2D666B' : '#E2E8F0',
                        shadowColor: selectedTemplate ? '#2D666B' : 'transparent',
                        shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: selectedTemplate ? 4 : 0
                      }}
                    >
                      <Text style={{ color: selectedTemplate ? 'white' : '#8B938E', fontWeight: '900', fontSize: 18 }}>
                        {i18n.t("therapist.assign_save")}
                      </Text>
                    </TouchableOpacity>
                    <View style={{ height: 128 }} />
                  </ScrollView>

                  <SuccessAnimation
                    visible={showSuccess}
                    message={successMessage}
                    onAnimationDone={() => setShowSuccess(false)}
                  />
                </>
              ) : (
                <View style={{ flex: 1 }}>
                  <ExerciseBuilder
                    onSave={saveExercise}
                    onCancel={() => setBuilderMode("select")}
                  />
                </View>
              )}
            </View>
          </View>
        ) : (
          // On iOS: formSheet handles the presentation natively
          <View style={{ flex: 1, backgroundColor: '#F7F4EE' }}>
            {/* Header */}
            <View style={{ backgroundColor: '#2D666B', paddingTop: 32, paddingBottom: 24, paddingHorizontal: 32, shadowColor: '#2D666B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 24, fontWeight: '900', color: 'white', letterSpacing: -0.5 }}>
                  {i18n.t("therapist.assign_title")}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowBuilder(false)}
                  style={{ backgroundColor: 'rgba(255,255,255,0.24)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 }}
                >
                  <Text style={{ color: 'white', fontWeight: '700' }}>
                    {i18n.t("therapist.cancel")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {builderMode === "select" ? (
              <>
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ padding: 32, paddingBottom: 60, maxWidth: 896, marginHorizontal: 'auto' }}
                >
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#1F2528', marginBottom: 16 }}>
                    {i18n.t("therapist.step_1_select")}
                  </Text>

                  <TouchableOpacity
                    onPress={() => setBuilderMode("build")}
                    style={{ backgroundColor: '#EEF4F3', borderWidth: 1, borderColor: '#D8E6E4', padding: 24, borderRadius: 24, marginBottom: 32, flexDirection: 'row', alignItems: 'center' }}
                  >
                    <View style={{ width: 56, height: 56, backgroundColor: 'white', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 20 }}>
                      <Sparkles size={24} color="#4E7E82" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#0C4A6E', fontWeight: '900', fontSize: 18, marginBottom: 4 }}>
                        {i18n.t("therapist.create_new")}
                      </Text>
                      <Text style={{ color: '#0369A1', fontSize: 14, fontWeight: '500', lineHeight: 20 }}>
                        {i18n.t("therapist.create_new_desc")}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {templates.length > 0 && (
                    <>
                      <Text style={{ color: '#8B938E', fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>
                        {i18n.t("therapist.or_template")}
                      </Text>
                      {templates.map((t) => (
                        <TouchableOpacity
                          key={t.id}
                          onPress={() => setSelectedTemplate(t)}
                          style={{
                            padding: 20, borderRadius: 24, marginBottom: 16,
                            borderWidth: 1.5,
                            borderColor: selectedTemplate?.id === t.id ? '#2D666B' : '#E2E8F0',
                            backgroundColor: selectedTemplate?.id === t.id ? 'rgba(19,115,134,0.06)' : 'white',
                          }}
                        >
                          <Text style={{ fontWeight: '800', fontSize: 18, marginBottom: 4, color: selectedTemplate?.id === t.id ? '#2D666B' : '#1F2528' }}>
                            {t.title}
                          </Text>
                          <Text style={{ color: '#8B938E', fontSize: 14 }}>
                            {t.blocks?.length || 0} Module
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}

                  <View style={{ marginTop: 40 }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#1F2528', marginBottom: 16 }}>
                      Wiederholung der Übung
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                      {["none", "daily", "custom"].map((freq) => (
                        <TouchableOpacity
                          key={freq}
                          onPress={() => setRecurrence(freq)}
                          style={{ flex: 1, paddingVertical: 16, borderRadius: 20, alignItems: 'center', borderWidth: 1.5, borderColor: recurrence === freq ? '#1F2528' : '#E2E8F0', backgroundColor: recurrence === freq ? '#1F2528' : 'white' }}
                        >
                          <Text style={{ fontWeight: '800', fontSize: 15, color: recurrence === freq ? 'white' : '#8B938E' }}>
                            {freq === "none" ? "Keine" : freq === "daily" ? "Täglich" : "Spezifische Tage"}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {recurrence === "custom" && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32, backgroundColor: 'white', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0' }}>
                        {WEEKDAYS.map((day) => {
                          const isActive = recurrenceDays.includes(day.key);
                          return (
                            <TouchableOpacity
                              key={day.key}
                              onPress={() => toggleDay(day.key)}
                              style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: isActive ? '#2D666B' : '#F5F1EA' }}
                            >
                              <Text style={{ fontWeight: '800', fontSize: 15, color: isActive ? 'white' : '#8B938E' }}>
                                {day.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>

                  <View style={{ marginTop: 8 }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#1F2528', marginBottom: 16 }}>
                      Push-Erinnerung (Uhrzeit)
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 24, padding: 20, marginBottom: 32 }}>
                      <View style={{ width: 48, height: 48, backgroundColor: '#EEF4F3', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                        <Clock size={24} color="#4E7E82" />
                      </View>
                      <TextInput
                        value={reminderTime}
                        onChangeText={setReminderTime}
                        placeholder="18:00"
                        keyboardType="numeric"
                        maxLength={5}
                        style={{ flex: 1, fontWeight: '900', fontSize: 24, color: '#1F2528' }}
                      />
                      <Text style={{ color: '#8B938E', fontWeight: '700', fontSize: 16, textTransform: 'uppercase', marginLeft: 12 }}>Uhr</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={confirmTemplateAssignment}
                    disabled={!selectedTemplate}
                    style={{ paddingVertical: 20, borderRadius: 24, alignItems: 'center', backgroundColor: selectedTemplate ? '#2D666B' : '#E2E8F0', shadowColor: selectedTemplate ? '#2D666B' : 'transparent', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: selectedTemplate ? 4 : 0 }}
                  >
                    <Text style={{ color: selectedTemplate ? 'white' : '#8B938E', fontWeight: '900', fontSize: 18 }}>
                      {i18n.t("therapist.assign_save")}
                    </Text>
                  </TouchableOpacity>
                  <View style={{ height: 128 }} />
                </ScrollView>

                <SuccessAnimation
                  visible={showSuccess}
                  message={successMessage}
                  onAnimationDone={() => setShowSuccess(false)}
                />
              </>
            ) : (
              <View style={{ flex: 1 }}>
                <ExerciseBuilder
                  onSave={saveExercise}
                  onCancel={() => setBuilderMode("select")}
                />
              </View>
            )}
          </View>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteExerciseModalVisible}
        transparent
        animationType="fade"
      >
        <View className="flex-1 justify-center items-center bg-black/40 p-6">
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              width: "100%",
              maxWidth: 384,
              backgroundColor: "white",
              borderRadius: 40,
              padding: 40,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.15,
              shadowRadius: 40,
              elevation: 10,
            }}
          >
            <View className="items-center mb-10">
              <View className="w-20 h-20 bg-red-50 rounded-full items-center justify-center mb-6">
                <Trash2 size={40} color="#EF4444" />
              </View>
              <Text className="text-[24px] font-black text-[#1F2528] mb-3 text-center tracking-tight">
                {i18n.t("therapist.delete_title")}
              </Text>
              <Text className="font-medium text-center text-[16px] leading-relaxed mb-8" style={{ color: '#4B5A61' }}>
                Möchtest du diese Übung wirklich entfernen?
              </Text>
              {exerciseToDelete && (
                <View className="w-full bg-gray-50 border border-gray-100 rounded-3xl p-5 flex-row items-center">
                  <View className="flex-1">
                    <Text
                      className="font-bold text-[#1F2528] text-[17px] text-center"
                      numberOfLines={1}
                    >
                      {exerciseToDelete.title}
                    </Text>
                  </View>
                </View>
              )}
            </View>
            <View
              style={{ flexDirection: "row", gap: 12, paddingHorizontal: 4 }}
            >
              <TouchableOpacity
                onPress={() => setDeleteExerciseModalVisible(false)}
                style={{
                  flex: 1,
                  backgroundColor: "#F5F1EA",
                  paddingVertical: 18,
                  borderRadius: 20,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ fontWeight: "bold", fontSize: 17, color: "#1F2528" }}
                >
                  {i18n.t("therapist.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmDeleteExercise}
                style={{
                  flex: 1,
                  backgroundColor: "#EF4444",
                  paddingVertical: 18,
                  borderRadius: 20,
                  alignItems: "center",
                  shadowColor: "#EF4444",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 4,
                }}
              >
                <Text
                  style={{ fontWeight: "bold", fontSize: 17, color: "white" }}
                >
                  Löschen
                </Text>
              </TouchableOpacity>
            </View>
          </MotiView>
        </View>
      </Modal>


      <SuccessAnimation
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        subMessage={toast.subMessage}
        onAnimationDone={() =>
          setToast((prev) => ({ ...prev, visible: false }))
        }
      />
      </ScrollView>
    </View >
  );
}


