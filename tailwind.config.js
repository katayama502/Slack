/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          bg: '#3F0E40',
          hover: '#521853',
          active: '#1164A3',
          text: '#CFC3CF',
          textActive: '#FFFFFF',
        },
        channel: {
          bg: '#FFFFFF',
          header: '#FFFFFF',
          border: '#E8E8E8',
        },
        message: {
          hover: '#F8F8F8',
          mention: '#FFF9E6',
          mentionBorder: '#E8A838',
        },
        accent: '#1D9BD1',
        online: '#007A5A',
        away: '#E8A838',
        busy: '#E01E5A',
      },
      fontFamily: {
        sans: [
          'Slack-Lato',
          'appleLogo',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Segoe UI Symbol',
          'Noto Color Emoji',
        ],
      },
      boxShadow: {
        modal: '0 8px 32px rgba(0, 0, 0, 0.24)',
        popover: '0 2px 12px rgba(0, 0, 0, 0.16)',
      },
    },
  },
  plugins: [],
}
