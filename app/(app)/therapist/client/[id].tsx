import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { ClientRepository } from "../../../../utils/repositories/ClientRepository";
import i18n from "../../../../utils/i18n";
import { Activity, Edit3, FileText, ArrowLeft } from "lucide-react-native";
import { MotiView } from "moti";
import { useSafeBack } from "../../../../hooks/useSafeBack";
import { db } from "../../../../utils/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { Calendar } from "lucide-react-native";

export default function ClientView() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const goBack = useSafeBack();

  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Next Appointment state
  const [nextAppointment, setNextAppointment] = useState<string>("");
  const [savingAppointment, setSavingAppointment] = useState(false);

  useEffect(() => {
    if (id) {
      fetchClientData();
    }
  }, [id]);

  const fetchClientData = async () => {
    try {
      const c = await ClientRepository.findById(id as string);
      if (c) {
        setClient(c);
        if (c.nextAppointment) setNextAppointment(c.nextAppointment);
      }
    } catch (error) {
      console.error("Error fetching client data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAppointment = async () => {
    if (!id || !client) return;
    setSavingAppointment(true);
    try {
      await updateDoc(doc(db, "users", id as string), {
        nextAppointment: nextAppointment.trim()
      });
      alert("Termin erfolgreich gespeichert!");
    } catch (e) {
      console.error("Failed to save appointment", e);
      alert("Fehler beim Speichern des Termins.");
    } finally {
      setSavingAppointment(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#FAF9F6]">
        <ActivityIndicator size="large" color="#137386" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FAF9F6]">
      {/* Header Section */}
      <View className="bg-[#137386] pt-16 pb-8 px-8 rounded-b-[40px] shadow-lg z-10">
        <View className="flex-row items-center justify-between w-full max-w-5xl mx-auto">
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
                ? `${client.firstName} ${client.lastName}`
                : i18n.t("therapist.client_details")}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 w-full"
        contentContainerStyle={{
          paddingHorizontal: 32,
          paddingTop: 32,
          paddingBottom: 120,
          maxWidth: 1024,
          marginHorizontal: "auto",
        }}
      >
        <View className="w-full max-w-4xl mx-auto">
          <Text className="text-[28px] font-black text-[#243842] mb-8 tracking-tight">
            Patienten-Akte
          </Text>

          <View className="flex-row flex-wrap gap-6 mb-12">
            <TouchableOpacity
              onPress={() =>
                router.push(`/(app)/therapist/client/${id}/exercises` as any)
              }
              className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 items-center justify-center flex-1 min-w-[240px] max-w-full md:max-w-[calc(25%-18px)] aspect-square max-h-[260px]"
              style={{
                shadowColor: "#243842",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.04,
                shadowRadius: 24,
                elevation: 4,
              }}
            >
              <View className="w-20 h-20 bg-orange-50 rounded-full items-center justify-center mb-5 border border-orange-100/50">
                <Activity size={36} color="#F97316" />
              </View>
              <Text className="text-[22px] font-bold text-[#243842] mb-1.5">
                Übungen
              </Text>
              <Text className="text-[15px] text-[#243842]/50 font-medium text-center leading-relaxed">
                Zuweisen & Auswerten
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                router.push(`/(app)/therapist/client/${id}/notes` as any)
              }
              className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 items-center justify-center flex-1 min-w-[240px] max-w-full md:max-w-[calc(25%-18px)] aspect-square max-h-[260px]"
              style={{
                shadowColor: "#243842",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.04,
                shadowRadius: 24,
                elevation: 4,
              }}
            >
              <View className="w-20 h-20 bg-blue-50 rounded-full items-center justify-center mb-5 border border-blue-100/50">
                <Edit3 size={36} color="#3B82F6" />
              </View>
              <Text className="text-[22px] font-bold text-[#243842] mb-1.5">
                Session Notes
              </Text>
              <Text className="text-[15px] text-[#243842]/50 font-medium text-center leading-relaxed">
                Verwalte Notizen
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                router.push(`/(app)/therapist/client/${id}/files` as any)
              }
              className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 items-center justify-center flex-1 min-w-[240px] max-w-full md:max-w-[calc(25%-18px)] aspect-square max-h-[260px]"
              style={{
                shadowColor: "#243842",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.04,
                shadowRadius: 24,
                elevation: 4,
              }}
            >
              <View className="w-20 h-20 bg-amber-50 rounded-full items-center justify-center mb-5 border border-amber-100/50">
                <FileText size={36} color="#C09D59" />
              </View>
              <Text className="text-[22px] font-bold text-[#243842] mb-1.5">
                Dateien
              </Text>
              <Text className="text-[15px] text-[#243842]/50 font-medium text-center leading-relaxed">
                Hinterlegte Dokumente
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                router.push(`/(app)/therapist/client/${id}/checkins` as any)
              }
              className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 items-center justify-center flex-1 min-w-[240px] max-w-full md:max-w-[calc(25%-18px)] aspect-square max-h-[260px]"
              style={{
                shadowColor: "#243842",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.04,
                shadowRadius: 24,
                elevation: 4,
              }}
            >
              <View className="w-20 h-20 bg-emerald-50 rounded-full items-center justify-center mb-5 border border-emerald-100/50">
                <Activity size={36} color="#10B981" />
              </View>
              <Text className="text-[22px] font-bold text-[#243842] mb-1.5">
                Check-ins
              </Text>
              <Text className="text-[15px] text-[#243842]/50 font-medium text-center leading-relaxed">
                Stimmungs-Tagebuch
              </Text>
            </TouchableOpacity>
          </View>

          {/* Next Appointment Section */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 400, delay: 200 }}
            className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 mb-12"
            style={{
              shadowColor: "#243842",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.04,
              shadowRadius: 24,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center mb-6">
              <View className="w-12 h-12 bg-pink-50 rounded-full items-center justify-center mr-4 border border-pink-100">
                <Calendar size={24} color="#DB2777" />
              </View>
              <View>
                <Text className="text-[20px] font-bold text-[#243842] tracking-tight">Nächster Termin</Text>
                <Text className="text-[14px] text-gray-500 mt-1">Wird dem Klienten direkt auf dem Dashboard angezeigt</Text>
              </View>
            </View>

            <View className="flex-row items-center gap-4">
              {Platform.OS === 'web' ? (
                // @ts-ignore
                <input
                  type="datetime-local"
                  value={nextAppointment}
                  onChange={(e: any) => setNextAppointment(e.target.value)}
                  style={{
                    flex: 1,
                    backgroundColor: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    fontSize: '16px',
                    color: '#243842',
                    fontFamily: 'inherit',
                    outline: 'none'
                  }}
                />
              ) : (
                <View className="flex-1 bg-gray-50 border border-gray-200 rounded-[16px] px-5 py-4">
                  <Text className="text-gray-400 text-xs mb-1 font-bold tracking-wider uppercase">Datum & Uhrzeit (z.B. 14.10.2026 15:00)</Text>
                  <Text style={{ display: 'none' }}>Dummy Import Fix for TextInput</Text>
                  {/* We are reusing a generic text input on mobile for now since it doesn't have a reliable datetime picker package */}
                  <View style={{ display: 'flex', flexDirection: 'row' }}>
                    <Text className="text-[#243842] text-base">{nextAppointment || 'Nicht gesetzt'}</Text>
                  </View>
                </View>
              )}
              <TouchableOpacity
                onPress={handleSaveAppointment}
                disabled={savingAppointment}
                className="bg-[#137386] px-8 py-4 rounded-[16px] items-center justify-center"
                style={{ opacity: savingAppointment ? 0.7 : 1 }}
              >
                <Text className="text-white font-bold text-base">{savingAppointment ? '...' : 'Speichern'}</Text>
              </TouchableOpacity>
            </View>
          </MotiView>

        </View>
      </ScrollView>
    </View>
  );
}
