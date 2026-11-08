import { ExternalLink } from 'lucide-react'
import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Hero Section - Large Media-Led */}
      <header className="relative min-h-[85vh] flex items-center overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/40 via-slate-950 to-fuchsia-950/40" />
        
        {/* Hero background media - Violin demo still */}
        <div className="absolute inset-0 opacity-25">
          <img 
            src="/media/invisible-violin-still.jpg" 
            alt="Angel Wen demonstrating invisible violin with gesture tracking"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8 w-full py-32">
          <div className="max-w-3xl">
            <h1 className="text-7xl md:text-8xl font-bold tracking-tight text-white mb-8 leading-[0.95]">
              Invisible<br />Instruments
            </h1>
            <p className="text-2xl md:text-3xl text-slate-300 mb-8 font-light">
              Play music through the air
            </p>
            <div className="flex items-center gap-3 text-lg text-slate-400">
              <span>Created by</span>
              <a 
                href="https://x.com/creativelyange" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 transition-colors font-medium border-b border-violet-400/30 hover:border-violet-300/50"
              >
                Angel Wen
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 lg:px-8 pb-32">
        {/* Violin Section - Visual First */}
        <section className="py-20 border-b border-slate-800/50">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Large Visual - Violin Demo Still */}
            <div className="order-2 lg:order-1">
              <div className="relative rounded-2xl overflow-hidden border border-violet-500/20 shadow-2xl shadow-violet-500/10">
                <img 
                  src="/media/invisible-violin-still.jpg" 
                  alt="Angel Wen demonstrating the invisible violin at a workshop with gesture tracking visualization"
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>

            {/* Concise Content */}
            <div className="order-1 lg:order-2">
              <h2 className="text-5xl font-bold text-white mb-6 tracking-tight">
                Invisible<br />Air Violin
              </h2>
              <p className="text-xl text-slate-400 mb-8">
                Height Control · G Major
              </p>
              
              <div className="space-y-4 text-slate-300 mb-10 text-lg">
                <p>Left arm height selects strings</p>
                <p>Sideways motion bows</p>
                <p>Right fingers add notes</p>
              </div>

              <a
                href="https://newlegna.github.io/invisible-violin/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 rounded-full bg-violet-600 px-8 py-4 text-lg font-semibold text-white shadow-2xl shadow-violet-500/30 hover:bg-violet-500 transition-all hover:scale-105 active:scale-95"
              >
                Play Violin
                <ExternalLink className="h-5 w-5" />
              </a>
              <p className="text-sm text-slate-500 mt-4">
                Opens in new tab · Webcam required
              </p>
            </div>
          </div>
        </section>

        {/* Cello Section - Visual First */}
        <section className="py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Concise Content */}
            <div>
              <h2 className="text-5xl font-bold text-white mb-6 tracking-tight">
                Invisible<br />Cello
              </h2>
              <p className="text-xl text-slate-400 mb-8">
                Gesture-Controlled Performance
              </p>
              
              <p className="text-lg text-slate-300 mb-10 leading-relaxed">
                Hand tracking brings cello performance into the air. Watch the demonstration to see it in action.
              </p>

              <a
                href="https://x.com/creativelyange/status/2111150255681270105"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 rounded-full bg-fuchsia-600 px-8 py-4 text-lg font-semibold text-white shadow-2xl shadow-fuchsia-500/30 hover:bg-fuchsia-500 transition-all hover:scale-105 active:scale-95"
              >
                Watch Demo
                <ExternalLink className="h-5 w-5" />
              </a>
              <p className="text-sm text-slate-500 mt-4">
                Demonstration video
              </p>
            </div>

            {/* Large Visual - Cello Demo Still */}
            <div>
              <div className="relative rounded-2xl overflow-hidden border border-fuchsia-500/20 shadow-2xl shadow-fuchsia-500/10">
                <img 
                  src="/media/invisible-cello-still.jpg" 
                  alt="Angel Wen performing with the invisible cello, showing active gesture tracking overlays"
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/30 py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="text-center text-slate-500">
            Invisible Instruments · Angel Wen · 2024
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
