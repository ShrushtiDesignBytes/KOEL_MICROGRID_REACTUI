/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'], // Add Poppins font
        sans: ['Arial', 'Helvetica', 'sans-serif'],
      },
      colors: {
        'custom-green': '#031816',
        'custom-dark': '#030F0E',
      },
    },
  },
  plugins: [],
};
