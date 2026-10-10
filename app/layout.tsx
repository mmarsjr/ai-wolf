import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
export const metadata: Metadata = {
  title: 'AI Made Simple — Learn AI by doing',
  description: 'Friendly AI lessons and an interactive AI tutor for absolute beginners.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><header className="site-header"><Link className="brand" href="/"><span className="brand-mark">✳</span> AI Made Simple</Link><nav><Link href="/#how-it-works">How it works</Link><Link href="/#curriculum">Lessons</Link><Link href="/#pricing">Pricing</Link><Link className="nav-cta" href="/login">Member sign in</Link></nav></header>{children}<footer className="footer"><div><strong>AI Made Simple</strong><p>Practical AI learning for real life.</p></div><div className="footer-links"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="mailto:support@aimadesimple.example">Contact</a></div><p className="fineprint">AI can make mistakes. Verify important information. This education service does not promise income or professional outcomes. Replace the example contact address and publish reviewed legal policies before launch.</p></footer></body></html>;
}
