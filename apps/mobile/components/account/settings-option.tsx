import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ChevronRight } from "lucide-react-native";
import { TouchableOpacity, View } from "react-native";
import tw from "twrnc";

export type SettingsOptionProps = {
  label: string;
  onPress?: () => void;
  isLast?: boolean;
};

export function SettingsOption({ label, onPress, isLast = false }: SettingsOptionProps) {
  const borderColor = useThemeColor({}, "border");
  const iconColor = useThemeColor({}, "icon");

  return (
    <TouchableOpacity
      style={[
        tw`flex-row justify-between items-center py-4`,
        !isLast && { borderBottomWidth: 1, borderBottomColor: borderColor },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <ThemedText type="defaultSemiBold" style={tw`text-base`}>
        {label}
      </ThemedText>
      <ChevronRight size={20} color={iconColor} />
    </TouchableOpacity>
  );
}
