import React, { useState, useEffect } from 'react';
import { useApp } from './context';
import { btnBase } from './Navbar';
import { Spin } from './Sections';

const tagStyle = { color:'var(--accent)', fontSize:'0.75rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:'0.8rem', textShadow: 'var(--tag-glow)' };
const h2Style = { fontSize:'clamp(1.8rem,4vw,2.8rem)', fontWeight:800, letterSpacing:'-0.03em', color:'var(--text)', marginBottom:'0.8rem', lineHeight:1.15 };

const TAG_COLORS = {
  'EV News': { bg: 'rgba(59,130,246,0.1)', color: '#3B82F6' },
  'Policy': { bg: 'rgba(139,92,246,0.1)', color: '#8B5CF6' },
  'Charging Tips': { bg: 'rgba(16,185,129,0.1)', color: '#10B981' },
  'Tips & Guides': { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B' },
  'Travel': { bg: 'rgba(236,72,153,0.1)', color: '#EC4899' },
  'Technology': { bg: 'rgba(6,182,212,0.1)', color: '#06B6D4' },
  'Industry': { bg: 'rgba(99,102,241,0.1)', color: '#6366F1' },
};

function getTagStyle(tag) {
  return TAG_COLORS[tag] || { bg: 'var(--accent-light)', color: 'var(--accent)' };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Simple markdown-like renderer for article body
function renderBody(text) {
  if (!text) return null;
  return text.split('\n\n').map((paragraph, i) => {
    // Headings
    if (paragraph.startsWith('### ')) return <h3 key={i} style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.8rem', marginTop: '1.5rem' }}>{paragraph.slice(4)}</h3>;
    if (paragraph.startsWith('## ')) return <h2 key={i} style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.8rem', marginTop: '2rem' }}>{paragraph.slice(3)}</h2>;
    // Bold text
    const parts = paragraph.split(/\*\*(.*?)\*\*/g);
    return (
      <p key={i} style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.85, marginBottom: '1.2rem' }}>
        {parts.map((part, j) => j % 2 === 1 ? <strong key={j} style={{ color: 'var(--text)', fontWeight: 600 }}>{part}</strong> : part)}
      </p>
    );
  });
}

// ─── Article List Page ─────────────────────────────────────────────────────
function ArticleListPage() {
  const { fetchArticles } = useApp();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState('All');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const tags = ['All', 'EV News', 'Tips & Guides', 'Charging Tips', 'Technology', 'Travel', 'Policy', 'Industry'];

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const tag = activeTag === 'All' ? '' : activeTag;
        const { articles: fetched, pagination: pg } = await fetchArticles(page, tag);
        setArticles(fetched);
        setPagination(pg);
      } catch { setArticles([]); }
      finally { setLoading(false); }
    })();
  }, [fetchArticles, page, activeTag]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: '6rem' }}>
      {/* Hero Header */}
      <div style={{ textAlign: 'center', padding: '3rem 5% 2rem' }}>
        <div style={tagStyle}>News & Articles</div>
        <h1 style={{ ...h2Style, fontSize: 'clamp(2rem, 5vw, 3.2rem)' }}>EV Insights & Updates</h1>
        <p style={{ color: 'var(--muted)', maxWidth: 520, margin: '0 auto 2rem', lineHeight: 1.7, fontSize: '0.95rem' }}>
          Expert analysis, charging tips, industry news, and everything you need to stay ahead in the EV world.
        </p>

        {/* Tag Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
          {tags.map(t => {
            const active = activeTag === t;
            return (
              <button
                key={t}
                onClick={() => { setActiveTag(t); setPage(1); }}
                style={{
                  ...btnBase(active ? 'primary' : 'ghost', {
                    fontSize: '0.78rem',
                    padding: '0.4rem 1rem',
                    fontWeight: active ? 700 : 500,
                    borderRadius: 50
                  })
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Articles Grid */}
      <div style={{ padding: '0 5% 4rem', maxWidth: 1200, margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <Spin s={28} /><p>Loading articles...</p>
          </div>
        ) : articles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📰</div>
            <p style={{ fontSize: '1rem' }}>No articles found{activeTag !== 'All' ? ` for "${activeTag}"` : ''}.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Check back soon for new content!</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {articles.map(article => (
                <ArticleCard key={article._id} article={article} />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '3rem' }}>
                {Array.from({ length: pagination.pages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    style={{
                      ...btnBase(page === i + 1 ? 'primary' : 'ghost', {
                        padding: '0.5rem 1rem',
                        fontSize: '0.82rem',
                        borderRadius: 8,
                        minWidth: 40
                      })
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ArticleCard({ article }) {
  const [hov, setHov] = useState(false);
  const tag = article.tags?.[0] || 'News';
  const ts = getTagStyle(tag);

  return (
    <a
      href={'/news/' + article.slug}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'block',
        textDecoration: 'none',
        background: 'var(--surface)',
        border: '1px solid ' + (hov ? 'var(--glass-border-hover)' : 'var(--glass-border)'),
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: hov ? 'var(--shadow-lg), var(--card-hover-glow)' : 'var(--shadow-sm)',
        transform: hov ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.3s cubic-bezier(0.23,1,0.32,1)',
      }}
    >
      <div style={{ width: '100%', height: 200, background: 'var(--bg-alt)', position: 'relative', overflow: 'hidden' }}>
        {article.coverImage?.url ? (
          <img src={article.coverImage.url} alt={article.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s', transform: hov ? 'scale(1.05)' : 'scale(1)' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, var(--bg-alt) 0%, var(--bg-soft) 100%)`, fontSize: '3rem' }}>📰</div>
        )}
        <span style={{ position: 'absolute', top: 12, left: 12, background: ts.bg, color: ts.color, fontSize: '0.68rem', fontWeight: 700, padding: '4px 10px', borderRadius: 20, backdropFilter: 'blur(8px)', border: `1px solid ${ts.color}22` }}>
          {tag}
        </span>
      </div>
      <div style={{ padding: '1.3rem 1.5rem 1.5rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 750, color: 'var(--text)', marginBottom: '0.5rem', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {article.title}
        </h3>
        <p style={{ fontSize: '0.84rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {article.excerpt || article.body?.substring(0, 150) + '...'}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--muted-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>📖 {article.readTime || 3} min</span>
            <span>👁 {article.views || 0}</span>
          </div>
          <span>{formatDate(article.publishedAt)}</span>
        </div>
      </div>
    </a>
  );
}

// ─── Article Detail Page ─────────────────────────────────────────────────────
function ArticleDetailPage({ slug }) {
  const { fetchArticle } = useApp();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const a = await fetchArticle(slug);
        setArticle(a);
      } catch { setArticle(null); }
      finally { setLoading(false); }
    })();
  }, [fetchArticle, slug]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '5rem' }}>
        <div style={{ textAlign: 'center', color: 'var(--muted)' }}><Spin s={32} /><p style={{ marginTop: '1rem' }}>Loading article...</p></div>
      </div>
    );
  }

  if (!article) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '5rem' }}>
        <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📄</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.5rem' }}>Article Not Found</h2>
          <p style={{ marginBottom: '1.5rem' }}>The article you're looking for doesn't exist or has been removed.</p>
          <a href="/news" style={{ ...btnBase('primary', { textDecoration: 'none', padding: '0.7rem 1.5rem' }) }}>← Back to News</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Cover Image */}
      {article.coverImage?.url && (
        <div style={{ width: '100%', height: 'min(50vh, 480px)', position: 'relative', overflow: 'hidden' }}>
          <img src={article.coverImage.url} alt={article.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)' }} />
        </div>
      )}

      {/* Article Content */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: article.coverImage?.url ? '0 5% 4rem' : '8rem 5% 4rem', marginTop: article.coverImage?.url ? '-6rem' : 0, position: 'relative', zIndex: 2 }}>
        {/* Back link */}
        <a href="/news" style={{ color: 'var(--accent)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: '1.5rem' }}>
          ← Back to News
        </a>

        {/* Tags */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
          {article.tags?.map(tag => {
            const ts = getTagStyle(tag);
            return (
              <span key={tag} style={{ background: ts.bg, color: ts.color, fontSize: '0.72rem', fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
                {tag}
              </span>
            );
          })}
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 850, color: 'var(--text)', lineHeight: 1.2, marginBottom: '1.2rem', letterSpacing: '-0.03em' }}>
          {article.title}
        </h1>

        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem', fontSize: '0.85rem', color: 'var(--muted)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)' }}>
              {article.author?.name?.[0] || 'N'}
            </div>
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{article.author?.name || 'NextCharge Team'}</span>
          </div>
          <span>📅 {formatDate(article.publishedAt)}</span>
          <span>📖 {article.readTime} min read</span>
          <span>👁 {article.views} views</span>
        </div>

        {/* Excerpt */}
        {article.excerpt && (
          <div style={{ fontSize: '1.1rem', color: 'var(--text)', lineHeight: 1.75, marginBottom: '2rem', fontWeight: 500, fontStyle: 'italic', borderLeft: '3px solid var(--accent)', paddingLeft: '1.2rem', background: 'var(--accent-light)', padding: '1rem 1.2rem', borderRadius: '0 12px 12px 0' }}>
            {article.excerpt}
          </div>
        )}

        {/* Body */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
          {renderBody(article.body)}
        </div>
      </div>
    </div>
  );
}

// ─── Main NewsPage Component ─────────────────────────────────────────────────
export default function NewsPage() {
  // Parse URL to determine if we're showing list or detail
  const path = window.location.pathname;
  const slugMatch = path.match(/^\/news\/(.+)$/);

  if (slugMatch) {
    return <ArticleDetailPage slug={slugMatch[1]} />;
  }

  return <ArticleListPage />;
}
