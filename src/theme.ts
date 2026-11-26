import type { ThemeConfig } from 'antd';

export const tema: ThemeConfig = {
  token: {
    colorPrimary: '#0f7a4d',
    colorInfo: '#0f7a4d',
    colorBgLayout: '#f4f7f5',
    borderRadius: 8,
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  components: {
    Layout: {
      bodyBg: '#f4f7f5',
      headerBg: 'rgba(255, 255, 255, 0.88)',
      headerHeight: 64,
      headerPadding: '0 24px',
      siderBg: '#0b3326',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'rgba(0, 0, 0, 0.14)',
      darkItemSelectedBg: 'rgba(52, 211, 153, 0.16)',
      darkItemSelectedColor: '#ffffff',
      darkItemColor: 'rgba(236, 253, 245, 0.78)',
      darkItemHoverColor: '#ffffff',
      darkItemHoverBg: 'rgba(255, 255, 255, 0.06)',
    },
    Card: {
      borderRadiusLG: 14,
    },
    Table: {
      headerBg: '#f7faf8',
      headerColor: '#5d6b64',
    },
  },
};
