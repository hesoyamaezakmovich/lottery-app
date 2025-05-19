module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: { 
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FFCC00', 
          light: '#FFDD33',
          dark: '#E6B800',
        },
        secondary: {
          DEFAULT: '#212121', 
          light: '#303030',
          dark: '#000000',
        },
        background: {
          dark: '#121212', 
          medium: '#1E1E1E',
          light: '#2D2D2D',
        }
      },
    } 
  },
  plugins: [],
};