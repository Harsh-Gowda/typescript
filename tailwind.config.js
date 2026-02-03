export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            // You can add more custom theme extensions here if needed
            // to match your previous inline styles or CDN config
        },
    },
    plugins: [],
}
