/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#4f46e5', // indigo-600
        'primary-light': '#a5b4fc', // indigo-400
        'primary-dark': '#3730a3', // indigo-800
        background: '#f1f5f9', // slate-100
        card: '#ffffff', // white
        text: '#1e293b', // slate-800
        muted: '#94a3b8', // slate-400
        disabled: '#cbd5e1', // slate-300
        inverted: '#ffffff', // white
        'primary-hover': '#e0e7ff', // for active/hover states
        'background-subtle': '#f8fafc', // for headers, disabled cards
        emphasis: '#475569', // for scores, important text
        border: '#e2e8f0', // slate-200
        destructive: '#ef4444', // red-500
        'destructive-light': '#f87171', // red-400
        success: '#16a34a', // green-600
      },
    },
  },
  plugins: [],
};
