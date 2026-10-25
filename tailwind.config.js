/** @type {import('tailwindcss').Config} */
const colors = require("tailwindcss/colors");

module.exports = {
	darkMode: ["class"],
	content: [
		"./src/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			colors: {
				white: '#fdfcf8',
				// Natural-science palette: neutrals lean green, red is terracotta,
				// green is forest (also the WhatsApp CTA), blue is moss.
				slate: {
					50: '#f6f5f0', 100: '#eeece4', 200: '#dedbd0', 300: '#c5c2b4', 400: '#8c978e',
					500: '#66746b', 600: '#4c5b52', 700: '#3a4840', 800: '#26332c', 900: '#17231c', 950: '#0e1612',
				},
				red: {
					50: '#fbf1ec', 100: '#f6e0d6', 200: '#edc3b0', 300: '#e1a086', 400: '#d27f5f',
					500: '#c4664a', 600: '#a9472d', 700: '#8a3922', 800: '#6d2e1d', 900: '#4f2216', 950: '#331409',
				},
				green: {
					50: '#eef5f0', 100: '#d9e9de', 200: '#b4d3be', 300: '#86b69a', 400: '#4f9a73',
					500: '#2f7a55', 600: '#1f6444', 700: '#1a5239', 800: '#154230', 900: '#0f3022', 950: '#08201a',
				},
				blue: {
					50: '#eff5f1', 100: '#dfeae3', 200: '#c0d5c8', 300: '#9bbaa8', 400: '#739d88',
					500: '#5b8570', 600: '#3f6d58', 700: '#335946', 800: '#284637', 900: '#1d3328', 950: '#13241b',
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))'
				}
			},
			fontFamily: {
				serif: ['var(--font-fraunces)', 'Georgia', 'serif'],
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
}

