import { Pressable, PressableProps, StyleSheet, Text, TextInput, TextInputProps } from 'react-native';

import { useDetailScreenStyles } from '@/components/detail-screen-shell';
import { useAppTheme } from '@/contexts/app-theme-context';

export function DetailTextField(props: TextInputProps) {
  const detailScreenStyles = useDetailScreenStyles();
  const { theme } = useAppTheme();

  return (
    <TextInput
      {...props}
      style={[detailScreenStyles.input, props.style]}
      placeholderTextColor={props.placeholderTextColor ?? theme.text.placeholder}
    />
  );
}

export function DetailTextArea(props: TextInputProps) {
  const detailScreenStyles = useDetailScreenStyles();
  const { theme } = useAppTheme();

  return (
    <TextInput
      {...props}
      multiline
      textAlignVertical={props.textAlignVertical ?? 'top'}
      style={[detailScreenStyles.textArea, props.style]}
      placeholderTextColor={props.placeholderTextColor ?? theme.text.placeholder}
    />
  );
}

type DetailPrimaryButtonProps = PressableProps & {
  label: string;
};

export function DetailPrimaryButton({
  label,
  disabled,
  style,
  ...props
}: DetailPrimaryButtonProps) {
  const detailScreenStyles = useDetailScreenStyles();

  return (
    <Pressable
      {...props}
      disabled={disabled}
      style={[
        detailScreenStyles.primaryButton,
        disabled && detailScreenStyles.primaryButtonDisabled,
        style,
      ]}
    >
      <Text style={detailScreenStyles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export const detailFormStyles = StyleSheet.create({
  fieldBlock: {
    marginBottom: 12,
  },
});
