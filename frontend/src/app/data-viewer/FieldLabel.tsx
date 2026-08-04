import { COLORS, FONTS } from '@/app/theme';
import { Text } from '@mantine/core';

export function FieldLabel({
  children,
  small,
}: {
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <Text
      style={{
        fontFamily: FONTS.mono,
        fontSize: small ? 10 : 11,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'rgba(246,245,239,0.5)',
        marginBottom: 4,
      }}
    >
      {children}
    </Text>
  );
}
