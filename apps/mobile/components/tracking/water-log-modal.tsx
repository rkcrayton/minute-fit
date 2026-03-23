import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import React from "react";
import { Modal, Pressable, View } from "react-native";
import tw from "twrnc";
import ProgressRing from "./progress-ring";

type WaterLogModalProps = {
  visible: boolean;
  currentOz: number;
  goalOz: number;
  onClose: () => void;
  onAddWater: (amountOz: number) => void;
};

export default function WaterLogModal({
  visible,
  currentOz,
  goalOz,
  onClose,
  onAddWater,
}: WaterLogModalProps) {
  const progress = goalOz > 0 ? currentOz / goalOz : 0;
  const percent = Math.min(100, Math.round(progress * 100));

  const sheetBgColor = useThemeColor({}, "surface");
  const borderColor = useThemeColor({}, "border");
  const helperTextColor = useThemeColor({}, "textSecondary");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={tw`flex-1 justify-end bg-black/40`} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={[
            tw`rounded-t-3xl p-5 border-t`,
            { backgroundColor: sheetBgColor, borderColor },
          ]}
        >
          <View style={tw`items-center mb-4`}>
            <ThemedText type="defaultSemiBold" style={tw`text-lg`}>
              Water Intake
            </ThemedText>
          </View>

          <View style={tw`items-center mb-5`}>
            <ProgressRing
              progress={progress}
              size={120}
              strokeWidth={12}
              centerValue={`${currentOz.toLocaleString()} oz`}
              centerLabel={`${percent}% of goal`}
              color="#3B82F6"
            />
          </View>

          <View style={[tw`rounded-2xl p-4 mb-5 border`, { borderColor }]}>
            <ThemedText style={tw`text-base font-semibold mb-2`}>
              Today’s Goal
            </ThemedText>
            <ThemedText style={tw`text-2xl font-bold mb-1`}>
              {goalOz.toLocaleString()} oz
            </ThemedText>
            <ThemedText style={[tw`text-sm`, { color: helperTextColor }]}>
              Based on half your body weight.
            </ThemedText>
          </View>

          <View style={tw`mb-5`}>
            <ThemedText style={tw`text-base font-semibold mb-3`}>
              Quick Add
            </ThemedText>

            <View style={tw`flex-row justify-between`}>
              {[8, 16, 24].map((amount) => (
                <Pressable
                  key={amount}
                  style={tw`bg-blue-600 rounded-xl px-5 py-4 flex-1 mx-1 items-center`}
                  onPress={() => onAddWater(amount)}
                >
                  <ThemedText style={tw`text-white font-semibold`}>
                    +{amount} oz
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable style={tw`items-center py-3`} onPress={onClose}>
            <ThemedText style={tw`text-base font-semibold opacity-70`}>
              Close
            </ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
