import type { ThemeConfig } from 'antd';

/** Palet utama aplikasi (hijau zamrud khas keuangan desa). */
export const WARNA = {
  primer: '#0f7a4d',
  primerGelap: '#0a3d2a',
  siderAtas: '#0b3326',
  siderBawah: '#0e4733',
  latar: '#f4f7f5',
  garis: '#e6ebe8',
  teks: '#14221b',
  teksLembut: '#5d6b64',
};

export const FONT = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export const tema: ThemeConfig = {
  token: {
    colorPrimary: WARNA.primer,
    colorInfo: '#2563eb',
    colorSuccess: '#16a34a',
    colorWarning: '#d97706',
    colorError: '#dc2626',
    colorTextBase: WARNA.teks,
    colorBgLayout: WARNA.latar,
    colorBorderSecondary: WARNA.garis,
    fontFamily: FONT,
    fontSize: 14,
    borderRadius: 8,
    borderRadiusLG: 14,
    borderRadiusSM: 6,
    controlHeight: 36,
    wireframe: false,
  },
  components: {
    Layout: { headerBg: 'rgba(255,255,255,0.85)', headerHeight: 64, headerPadding: '0 24px', siderBg: WARNA.siderAtas, bodyBg: WARNA.latar },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(52, 211, 153, 0.16)',
      darkItemSelectedColor: '#ecfdf5',
      darkItemColor: 'rgba(236, 253, 245, 0.72)',
      darkItemHoverColor: '#ffffff',
      darkItemHoverBg: 'rgba(255,255,255,0.06)',
      darkGroupTitleColor: 'rgba(236, 253, 245, 0.45)',
      itemBorderRadius: 8,
      itemMarginInline: 10,
      itemHeight: 40,
      subMenuItemBorderRadius: 8,
      iconSize: 16,
      collapsedIconSize: 18,
    },
    Card: { headerFontSize: 15, headerHeight: 52, paddingLG: 20 },
    Table: { headerBg: '#f7faf8', headerColor: WARNA.teksLembut, headerSplitColor: 'transparent', rowHoverBg: '#f2f8f5', cellPaddingBlockSM: 10, borderColor: '#eef2ef' },
    Button: { fontWeight: 500, primaryShadow: '0 2px 6px rgba(15,122,77,0.25)' },
    Modal: { titleFontSize: 17 },
    Statistic: { contentFontSize: 22, titleFontSize: 13 },
    Tag: { defaultBg: '#f4f6f5' },
  },
};
