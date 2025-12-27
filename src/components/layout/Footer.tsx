interface FooterProps {
  className?: string
}

export function Footer({ className = "" }: FooterProps) {
  return (
    <footer className={`bg-white/50 border-t border-indigo-100 py-2 mt-4 ${className}`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-1">
          <div className="text-center md:text-left" style={{ fontSize: '15px', fontWeight: '500' }}>
            <span style={{ color: '#334155', fontWeight: '500' }}>Amar Harolikar</span>
            <span className="mx-1.5 text-indigo-600">•</span>
            <span style={{ color: '#334155', fontWeight: '500' }}>Decision Sciences & Applied AI</span>
            <span className="mx-1.5 text-indigo-600">•</span>
            <span style={{ color: '#334155', fontWeight: '500' }}>
              <i className="fas fa-envelope mr-1"></i>amar@harolikar.com
            </span>
            <span className="mx-1.5 text-indigo-600">•</span>
            <a
              href="https://www.linkedin.com/in/amarharolikar"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#4f46e5', fontWeight: '500' }}
              className="hover:text-slate-800 hover:underline"
            >
              <i className="fab fa-linkedin mr-1"></i>LinkedIn
            </a>
          </div>
          <div className="flex items-center gap-4" style={{ fontSize: '14px', fontWeight: '500' }}>
            <a
              href="https://www.tigzig.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#4f46e5', fontWeight: '500' }}
              className="hover:text-slate-800 hover:underline"
            >
              <i className="fas fa-globe mr-1"></i>Tigzig
            </a>
            <a
              href="/about"
              style={{ color: '#4f46e5', fontWeight: '500' }}
              className="hover:text-slate-800 hover:underline"
            >
              <i className="fas fa-user mr-1"></i>About
            </a>
            <a
              href="/privacy"
              style={{ color: '#4f46e5', fontWeight: '500' }}
              className="hover:text-slate-800 hover:underline"
            >
              <i className="fas fa-shield-alt mr-1"></i>Privacy
            </a>
            <a
              href="/terms"
              style={{ color: '#4f46e5', fontWeight: '500' }}
              className="hover:text-slate-800 hover:underline"
            >
              <i className="fas fa-file-contract mr-1"></i>Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
