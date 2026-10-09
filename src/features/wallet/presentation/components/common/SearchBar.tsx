import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useWalletTheme } from '../../theme';
import { UiIcon } from '../icons/UiIcon';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Buscar por título, categoría o número...',
  onClear,
}) => {
  const { colors, typography, spacing, borderRadius } = useWalletTheme();

  return (
    <View style={[styles.outerContainer, { paddingHorizontal: spacing.lg }]}>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surfaceSubtle,
            borderColor: colors.border,
            borderRadius: borderRadius.lg,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        <UiIcon
          name="search"
          size={18}
          color={colors.textSecondary}
          style={styles.searchIcon}
        />

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          style={[
            typography.bodyMedium,
            styles.textInput,
            { color: colors.textPrimary },
          ]}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityRole="search"
          accessibilityLabel="Campo de búsqueda de tarjetas"
        />

        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              onChangeText('');
              onClear?.();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[
              styles.clearButton,
              { backgroundColor: colors.border },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Limpiar búsqueda"
          >
            <UiIcon name="close" size={12} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    marginVertical: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    paddingVertical: 0,
    height: '100%',
  },
  clearButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

