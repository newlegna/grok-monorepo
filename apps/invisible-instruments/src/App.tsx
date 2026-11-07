import { ExternalLink, Music, Camera } from 'lucide-react'
import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Hero Section */}
      <header className="relative overflow-hidden border-b border-slate-800/50">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-transparent to-fuchsia-500/10" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold tracking-tight text-slate-50 sm:text-7xl">
              Invisible Instruments
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-300 max-w-2xl mx-auto">
              Play music through the air with your hands. No physical instrument required—just your gestures, captured by your webcam.
            </p>
            <div className="mt-8 flex items-center justify-center gap-2 text-slate-400">
              <Music className="h-4 w-4" />
              <span className="text-sm">Created by</span>
              <a 
                href="https://x.com/creativelyange" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 transition-colors font-medium"
              >
                Angel Wen (@creativelyange)
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Violin Section */}
        <section className="mb-32">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-sm">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                  <Music className="h-6 w-6 text-violet-400" />
                </div>
                <h2 className="text-3xl font-bold text-slate-50">Invisible Air Violin</h2>
              </div>
              <p className="text-slate-400 text-lg mb-6">
                Height Control in G Major
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-4">How It Works</h3>
                <div className="space-y-3 text-slate-400">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-violet-400 flex-shrink-0" />
                    <p><strong className="text-slate-300">Left arm height:</strong> Selects which string to play</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-violet-400 flex-shrink-0" />
                    <p><strong className="text-slate-300">Left arm sideways:</strong> Bowing motion to produce sound</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-violet-400 flex-shrink-0" />
                    <p><strong className="text-slate-300">Right hand fingers:</strong> Bend fingers to add notes</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-6">
                <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <Camera className="h-5 w-5 text-violet-400" />
                  Requirements
                </h3>
                <ul className="space-y-2 text-slate-400">
                  <li className="flex items-center gap-2">
                    <span className="text-violet-400">✓</span>
                    Working webcam
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-violet-400">✓</span>
                    Modern web browser
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-violet-400">✓</span>
                    Camera permissions enabled
                  </li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-6">
              <p className="text-sm text-slate-400 mb-4">
                The violin opens in a new tab. You'll need to allow camera access to play.
              </p>
              <a
                href="https://newlegna.github.io/invisible-violin/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-violet-500/20 hover:bg-violet-500 transition-all hover:scale-105 active:scale-95"
              >
                Play Invisible Violin
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        {/* Cello Section */}
        <section>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-sm">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20">
                  <Music className="h-6 w-6 text-fuchsia-400" />
                </div>
                <h2 className="text-3xl font-bold text-slate-50">Invisible Cello</h2>
              </div>
              <p className="text-slate-400 text-lg mb-6">
                Gesture-controlled cello performance
              </p>
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">About This Instrument</h3>
              <p className="text-slate-400 leading-relaxed">
                The invisible cello uses hand tracking to simulate cello playing through the air. 
                See the demonstration video to watch it in action.
              </p>
            </div>

            <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-6">
              <p className="text-sm text-slate-400 mb-4">
                Watch a demonstration of the invisible cello on X.
              </p>
              <a
                href="https://x.com/creativelyange/status/2111150255681270105"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-fuchsia-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-fuchsia-500/20 hover:bg-fuchsia-500 transition-all hover:scale-105 active:scale-95"
              >
                Watch Demo Video
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 mt-24">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-slate-500">
            Invisible Instruments by Angel Wen · Built with gesture recognition and web audio
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
