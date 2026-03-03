
<!DOCTYPE html>

<html class="dark" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Futuristic Neon Music Player</title>
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script>
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "#0ddff2",
                        "background-light": "#f5f8f8",
                        "background-dark": "#102122",
                        "surface-dark": "#162a2c",
                    },
                    fontFamily: {
                        "display": ["Plus Jakarta Sans", "sans-serif"]
                    },
                    backgroundImage: {
                        'neon-gradient': 'linear-gradient(180deg, #102122 0%, #0a1516 100%)',
                        'glass': 'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                    },
                    boxShadow: {
                        'neon': '0 0 10px rgba(13, 223, 242, 0.5), 0 0 20px rgba(13, 223, 242, 0.3)',
                        'neon-sm': '0 0 5px rgba(13, 223, 242, 0.5)',
                        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                    }
                },
            },
        }
    </script>
<style>
        .vinyl-spin {
            animation: spin 10s linear infinite;
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .waveform-bar {
            animation: wave 1.2s ease-in-out infinite;
        }
        @keyframes wave {
            0%, 100% { height: 20%; opacity: 0.5; }
            50% { height: 100%; opacity: 1; }
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-background-dark text-slate-100 font-display min-h-screen flex flex-col overflow-hidden antialiased selection:bg-primary selection:text-background-dark">
<div class="relative flex h-full min-h-screen w-full flex-col bg-neon-gradient">
<!-- Background Glow Effects -->
<div class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none"></div>
<div class="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[100px] pointer-events-none"></div>
<!-- Top Bar -->
<header class="relative z-10 flex items-center justify-between p-6 pt-8">
<button class="flex items-center justify-center size-10 rounded-full bg-white/5 hover:bg-white/10 transition-colors backdrop-blur-md text-slate-200">
<span class="material-symbols-outlined text-2xl">arrow_back</span>
</button>
<div class="flex flex-col items-center">
<span class="text-primary text-xs font-bold uppercase tracking-widest mb-1 drop-shadow-[0_0_5px_rgba(13,223,242,0.8)]">Playing From</span>
<h2 class="text-white text-base font-bold tracking-wide">Brasil - Rio de Janeiro</h2>
</div>
<button class="flex items-center justify-center size-10 rounded-full bg-white/5 hover:bg-white/10 transition-colors backdrop-blur-md text-primary shadow-neon-sm">
<span class="material-symbols-outlined text-xl">map</span>
</button>
</header>
<!-- Main Content -->
<main class="flex-1 flex flex-col items-center justify-center relative z-10 px-6 pb-8 gap-8">
<!-- Vinyl Record / Album Art -->
<div class="relative w-72 h-72 md:w-80 md:h-80 flex-shrink-0 mb-4">
<!-- Glowing Ring Behind -->
<div class="absolute inset-0 rounded-full border border-primary/30 shadow-[0_0_30px_rgba(13,223,242,0.15)]"></div>
<div class="absolute -inset-4 rounded-full border border-primary/10 animate-[spin_15s_linear_infinite_reverse]"></div>
<!-- Album Art Container -->
<div class="w-full h-full rounded-full overflow-hidden shadow-2xl relative vinyl-spin ring-4 ring-black/40">
<img alt="Abstract colorful neon waves representing samba music vibe" class="w-full h-full object-cover opacity-90" data-alt="Abstract colorful neon waves representing samba music vibe" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC7levcKQtHD3JBy_osS2E8lK8_Oql3RiJPMoP0KeDCLiNNQPv8chmFOamuyeNNDGW5r6tKEaHd9alKJw_uexp12jtProEpLODRqfRNujJ7Y-z_o6LM2QvQnpTutV5PjDmnPdEAEnRrTXgSq8Js84-2Nj9N7aR1KOolwW5ZZJ2cHYMO7kfCnsgHOoo9xW-EHft94Wra8jOX7WWr5_yMC9jgh6S0X09L_1j4xjcqYsU5sELdpjaJwO4OP3DvbWSOh8CGTdtxU5MTY0Hn"/>
<!-- Vinyl Center Hole -->
<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-background-dark rounded-full flex items-center justify-center border-2 border-primary/20">
<div class="w-3 h-3 bg-black rounded-full"></div>
</div>
<!-- Shine Effect -->
<div class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none"></div>
</div>
</div>
<!-- Song Details & Visualizer -->
<div class="w-full max-w-sm flex flex-col items-center gap-6">
<!-- Text Info -->
<div class="text-center space-y-2">
<h1 class="text-3xl font-extrabold text-white tracking-tight leading-tight drop-shadow-md">Samba de Verão</h1>
<p class="text-primary/80 text-lg font-medium tracking-wide">Marcos Valle</p>
</div>
<!-- Waveform Visualizer -->
<div class="flex items-end justify-center gap-1 h-12 w-full px-8 opacity-80">
<div class="w-1 bg-primary rounded-full waveform-bar" style="animation-duration: 0.8s; height: 40%"></div>
<div class="w-1 bg-primary rounded-full waveform-bar" style="animation-duration: 1.1s; height: 70%"></div>
<div class="w-1 bg-primary rounded-full waveform-bar" style="animation-duration: 0.9s; height: 50%"></div>
<div class="w-1 bg-primary rounded-full waveform-bar" style="animation-duration: 1.3s; height: 90%"></div>
<div class="w-1 bg-primary rounded-full waveform-bar" style="animation-duration: 1.0s; height: 60%"></div>
<div class="w-1 bg-primary rounded-full waveform-bar" style="animation-duration: 0.7s; height: 30%"></div>
<div class="w-1 bg-primary rounded-full waveform-bar" style="animation-duration: 1.2s; height: 80%"></div>
<div class="w-1 bg-primary rounded-full waveform-bar" style="animation-duration: 0.9s; height: 45%"></div>
<div class="w-1 bg-primary rounded-full waveform-bar" style="animation-duration: 1.4s; height: 75%"></div>
<div class="w-1 bg-primary rounded-full waveform-bar" style="animation-duration: 0.8s; height: 55%"></div>
<div class="w-1 bg-primary rounded-full waveform-bar" style="animation-duration: 1.1s; height: 90%"></div>
<div class="w-1 bg-primary rounded-full waveform-bar" style="animation-duration: 0.9s; height: 40%"></div>
<div class="w-1 bg-primary rounded-full waveform-bar" style="animation-duration: 1.3s; height: 60%"></div>
<div class="w-1 bg-primary rounded-full waveform-bar" style="animation-duration: 1.0s; height: 30%"></div>
<div class="w-1 bg-primary rounded-full waveform-bar" style="animation-duration: 0.8s; height: 40%"></div>
</div>
</div>
<!-- Controls Section -->
<div class="w-full max-w-md flex flex-col gap-6 mt-auto">
<!-- Progress Bar -->
<div class="flex flex-col gap-2 w-full px-4">
<div class="relative w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
<div class="absolute top-0 left-0 h-full w-[45%] bg-primary shadow-[0_0_10px_#0ddff2]"></div>
</div>
<div class="flex justify-between text-xs font-medium text-slate-400">
<span>1:24</span>
<span>3:12</span>
</div>
</div>
<!-- Main Controls -->
<div class="flex items-center justify-between px-2">
<button class="p-3 text-slate-400 hover:text-white transition-colors">
<span class="material-symbols-outlined text-2xl">shuffle</span>
</button>
<button class="p-3 text-white hover:text-primary transition-colors">
<span class="material-symbols-outlined text-3xl font-light">skip_previous</span>
</button>
<button class="flex items-center justify-center size-20 rounded-full bg-primary/10 border border-primary/50 text-primary shadow-neon hover:scale-105 hover:bg-primary/20 transition-all active:scale-95 backdrop-blur-sm">
<span class="material-symbols-outlined text-5xl fill-current">play_arrow</span>
</button>
<button class="p-3 text-white hover:text-primary transition-colors">
<span class="material-symbols-outlined text-3xl font-light">skip_next</span>
</button>
<button class="p-3 text-slate-400 hover:text-white transition-colors">
<span class="material-symbols-outlined text-2xl">repeat</span>
</button>
</div>
<!-- Bottom Action Row -->
<div class="flex justify-center gap-6 mt-2 pb-4">
<button class="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition-all uppercase tracking-wider backdrop-blur-md">
<span class="material-symbols-outlined text-sm text-primary">lyrics</span>
                        Lyrics
                    </button>
<button class="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition-all uppercase tracking-wider backdrop-blur-md">
<span class="material-symbols-outlined text-sm text-primary">playlist_play</span>
                        Up Next
                    </button>
</div>
</div>
</main>
</div>
</body></html>