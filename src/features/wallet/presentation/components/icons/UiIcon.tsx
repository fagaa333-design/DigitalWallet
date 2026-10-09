import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

export type UiIconName =
  | 'search'
  | 'plus'
  | 'close'
  | 'settings'
  | 'chevronRight'
  | 'card'
  | 'badge'
  | 'shield'
  | 'book'
  | 'transit'
  | 'star'
  | 'wallet'
  | 'tag'
  | 'check';

interface UiIconProps {
  name: UiIconName | string;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export const UiIcon: React.FC<UiIconProps> = ({
  name,
  size = 20,
  color = '#0F172A',
  style,
}) => {
  const containerStyle = [styles.base, { width: size, height: size }, style];

  switch (name) {
    case 'search': {
      const circleSize = size * 0.62;
      return (
        <View style={containerStyle}>
          <View
            style={[
              styles.searchCircle,
              {
                width: circleSize,
                height: circleSize,
                borderColor: color,
                borderWidth: Math.max(1.8, size * 0.09),
                top: size * 0.08,
                left: size * 0.08,
              },
            ]}
          />
          <View
            style={[
              styles.searchHandle,
              {
                backgroundColor: color,
                width: Math.max(2, size * 0.1),
                height: size * 0.42,
                bottom: size * 0.08,
                right: size * 0.16,
              },
            ]}
          />
        </View>
      );
    }

    case 'plus': {
      const thickness = Math.max(2, size * 0.1);
      const length = size * 0.72;
      return (
        <View style={containerStyle}>
          <View
            style={[
              styles.centerLineH,
              { backgroundColor: color, height: thickness, width: length },
            ]}
          />
          <View
            style={[
              styles.centerLineV,
              { backgroundColor: color, width: thickness, height: length },
            ]}
          />
        </View>
      );
    }

    case 'close': {
      const thickness = Math.max(2, size * 0.09);
      const length = size * 0.65;
      return (
        <View style={containerStyle}>
          <View
            style={[
              styles.crossLine,
              {
                backgroundColor: color,
                height: thickness,
                width: length,
                transform: [{ rotate: '45deg' }],
              },
            ]}
          />
          <View
            style={[
              styles.crossLine,
              {
                backgroundColor: color,
                height: thickness,
                width: length,
                transform: [{ rotate: '-45deg' }],
              },
            ]}
          />
        </View>
      );
    }

    case 'settings': {
      const barHeight = Math.max(1.8, size * 0.08);
      const dotSize = Math.max(3.6, size * 0.22);
      return (
        <View style={[containerStyle, styles.settingsContainer]}>
          <View style={styles.sliderRow}>
            <View style={[styles.sliderTrack, { backgroundColor: color, height: barHeight }]} />
            <View
              style={[
                styles.sliderDot,
                {
                  backgroundColor: color,
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                  left: size * 0.2,
                },
              ]}
            />
          </View>
          <View style={styles.sliderRow}>
            <View style={[styles.sliderTrack, { backgroundColor: color, height: barHeight }]} />
            <View
              style={[
                styles.sliderDot,
                {
                  backgroundColor: color,
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                  left: size * 0.55,
                },
              ]}
            />
          </View>
          <View style={styles.sliderRow}>
            <View style={[styles.sliderTrack, { backgroundColor: color, height: barHeight }]} />
            <View
              style={[
                styles.sliderDot,
                {
                  backgroundColor: color,
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                  left: size * 0.35,
                },
              ]}
            />
          </View>
        </View>
      );
    }

    case 'chevronRight': {
      const chevronSize = size * 0.38;
      const borderW = Math.max(2, size * 0.1);
      return (
        <View style={containerStyle}>
          <View
            style={[
              styles.chevron,
              {
                width: chevronSize,
                height: chevronSize,
                borderTopColor: color,
                borderRightColor: color,
                borderTopWidth: borderW,
                borderRightWidth: borderW,
                left: size * 0.25,
              },
            ]}
          />
        </View>
      );
    }

    case 'card': {
      const w = size * 0.88;
      const h = size * 0.62;
      const bW = Math.max(1.6, size * 0.08);
      return (
        <View style={containerStyle}>
          <View
            style={[
              styles.cardBox,
              {
                width: w,
                height: h,
                borderColor: color,
                borderWidth: bW,
                borderRadius: Math.max(3, size * 0.14),
              },
            ]}
          >
            <View
              style={[
                styles.cardStripe,
                {
                  backgroundColor: color,
                  height: Math.max(1.8, size * 0.1),
                  top: h * 0.22,
                },
              ]}
            />
            <View
              style={[
                styles.cardChip,
                {
                  backgroundColor: color,
                  width: size * 0.16,
                  height: size * 0.12,
                  bottom: h * 0.18,
                  left: w * 0.15,
                  borderRadius: 1.5,
                },
              ]}
            />
          </View>
        </View>
      );
    }

    case 'badge': {
      const w = size * 0.72;
      const h = size * 0.86;
      const bW = Math.max(1.6, size * 0.08);
      return (
        <View style={containerStyle}>
          <View
            style={[
              styles.badgeFrame,
              {
                width: w,
                height: h,
                borderColor: color,
                borderWidth: bW,
                borderRadius: Math.max(3, size * 0.12),
              },
            ]}
          >
            <View
              style={[
                styles.badgePhoto,
                {
                  borderColor: color,
                  borderWidth: 1.2,
                  width: w * 0.5,
                  height: h * 0.35,
                  borderRadius: 2,
                  top: h * 0.14,
                },
              ]}
            />
            <View
              style={[
                styles.badgeLine,
                {
                  backgroundColor: color,
                  width: w * 0.6,
                  height: 1.5,
                  bottom: h * 0.18,
                },
              ]}
            />
          </View>
        </View>
      );
    }

    case 'shield': {
      const bW = Math.max(1.8, size * 0.08);
      return (
        <View style={containerStyle}>
          <View
            style={[
              styles.shieldOuter,
              {
                width: size * 0.75,
                height: size * 0.85,
                borderColor: color,
                borderWidth: bW,
                borderTopLeftRadius: size * 0.12,
                borderTopRightRadius: size * 0.12,
                borderBottomLeftRadius: size * 0.4,
                borderBottomRightRadius: size * 0.4,
              },
            ]}
          >
            <View
              style={{
                width: Math.max(2, size * 0.08),
                height: size * 0.3,
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
          </View>
        </View>
      );
    }

    case 'book': {
      const w = size * 0.8;
      const h = size * 0.66;
      const bW = Math.max(1.6, size * 0.08);
      return (
        <View style={containerStyle}>
          <View
            style={[
              styles.bookFrame,
              {
                width: w,
                height: h,
                borderColor: color,
                borderWidth: bW,
                borderRadius: 3,
              },
            ]}
          >
            <View
              style={[
                styles.bookSpine,
                {
                  width: bW,
                  backgroundColor: color,
                  height: '100%',
                },
              ]}
            />
          </View>
        </View>
      );
    }

    case 'transit': {
      const w = size * 0.68;
      const h = size * 0.84;
      const bW = Math.max(1.6, size * 0.08);
      return (
        <View style={containerStyle}>
          <View
            style={[
              styles.transitBox,
              {
                width: w,
                height: h,
                borderColor: color,
                borderWidth: bW,
                borderRadius: size * 0.18,
              },
            ]}
          >
            <View
              style={{
                width: w * 0.65,
                height: h * 0.35,
                borderColor: color,
                borderWidth: 1.2,
                borderRadius: 2,
                marginTop: h * 0.1,
              }}
            />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                width: w * 0.65,
                marginTop: h * 0.15,
              }}
            >
              <View
                style={{
                  width: size * 0.1,
                  height: size * 0.1,
                  borderRadius: size * 0.05,
                  backgroundColor: color,
                }}
              />
              <View
                style={{
                  width: size * 0.1,
                  height: size * 0.1,
                  borderRadius: size * 0.05,
                  backgroundColor: color,
                }}
              />
            </View>
          </View>
        </View>
      );
    }

    case 'star': {
      const diamondSize = size * 0.52;
      return (
        <View style={containerStyle}>
          <View
            style={[
              styles.diamond,
              {
                width: diamondSize,
                height: diamondSize,
                borderColor: color,
                borderWidth: Math.max(1.8, size * 0.09),
                borderRadius: 2,
              },
            ]}
          />
        </View>
      );
    }

    case 'wallet': {
      const w = size * 0.82;
      const h = size * 0.68;
      const bW = Math.max(1.6, size * 0.08);
      return (
        <View style={containerStyle}>
          <View
            style={[
              styles.walletBody,
              {
                width: w,
                height: h,
                borderColor: color,
                borderWidth: bW,
                borderRadius: size * 0.15,
              },
            ]}
          >
            <View
              style={[
                styles.walletClasp,
                {
                  borderColor: color,
                  borderWidth: 1.2,
                  width: size * 0.22,
                  height: size * 0.2,
                  right: -1,
                  borderRadius: 2,
                  backgroundColor: '#FFFFFF',
                },
              ]}
            />
          </View>
        </View>
      );
    }

    case 'tag': {
      const w = size * 0.72;
      const h = size * 0.72;
      const bW = Math.max(1.6, size * 0.08);
      return (
        <View style={containerStyle}>
          <View
            style={[
              styles.tagShape,
              {
                width: w,
                height: h,
                borderColor: color,
                borderWidth: bW,
                borderRadius: 4,
                transform: [{ rotate: '45deg' }],
              },
            ]}
          />
        </View>
      );
    }

    case 'check': {
      const checkW = size * 0.26;
      const checkH = size * 0.52;
      const bW = Math.max(2, size * 0.1);
      return (
        <View style={containerStyle}>
          <View
            style={[
              styles.checkMark,
              {
                width: checkW,
                height: checkH,
                borderBottomColor: color,
                borderRightColor: color,
                borderBottomWidth: bW,
                borderRightWidth: bW,
                transform: [{ rotate: '40deg' }],
                marginBottom: size * 0.1,
              },
            ]}
          />
        </View>
      );
    }

    default:
      return (
        <View style={containerStyle}>
          <View
            style={{
              width: size * 0.5,
              height: size * 0.5,
              borderRadius: size * 0.25,
              backgroundColor: color,
            }}
          />
        </View>
      );
  }
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  searchCircle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  searchHandle: {
    position: 'absolute',
    borderRadius: 2,
    transform: [{ rotate: '-45deg' }],
  },
  centerLineH: {
    position: 'absolute',
    borderRadius: 2,
  },
  centerLineV: {
    position: 'absolute',
    borderRadius: 2,
  },
  crossLine: {
    position: 'absolute',
    borderRadius: 2,
  },
  settingsContainer: {
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  sliderRow: {
    width: '88%',
    height: 4,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrack: {
    width: '100%',
    borderRadius: 1,
    opacity: 0.65,
  },
  sliderDot: {
    position: 'absolute',
    top: -2,
  },
  chevron: {
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
  },
  cardBox: {
    position: 'relative',
    overflow: 'hidden',
  },
  cardStripe: {
    position: 'absolute',
    left: 0,
    right: 0,
    opacity: 0.85,
  },
  cardChip: {
    position: 'absolute',
  },
  badgeFrame: {
    alignItems: 'center',
    position: 'relative',
  },
  badgePhoto: {
    position: 'absolute',
  },
  badgeLine: {
    position: 'absolute',
    borderRadius: 1,
  },
  shieldOuter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookFrame: {
    position: 'relative',
    alignItems: 'center',
  },
  bookSpine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  transitBox: {
    alignItems: 'center',
    position: 'relative',
  },
  diamond: {
    transform: [{ rotate: '45deg' }],
  },
  walletBody: {
    position: 'relative',
    justifyContent: 'center',
  },
  walletClasp: {
    position: 'absolute',
  },
  tagShape: {
    position: 'relative',
  },
  checkMark: {},
});

