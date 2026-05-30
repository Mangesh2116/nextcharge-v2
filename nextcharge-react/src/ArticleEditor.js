import React, { useState, useEffect, useRef } from 'react';
import { useApp } from './context';
import { Spin } from './Sections';
import { btnBase } from './Navbar';

const inpStyle = { width:'100%', background:'var(--glass-bg)', border:'1.5px solid var(--input-border)', borderRadius:12, padding:'0.75rem 1rem', color:'var(--text)', fontFamily:'inherit', fontSize:'0.9rem', outline:'none', boxSizing:'border-box', transition:'border-color 0.2s, box-shadow 0.2s' };

const AVAILABLE_TAGS = ['EV News', 'Charging Tips', 'Tips & Guides', 'Technology', 'Travel', 'Policy', 'Industry'];

export default function ArticleEditorModal() {
  const { articleEditorModal, setArticleEditorModal, fetchAdminArticles, createArticle, updateArticle, deleteArticle, showToast, user } = useApp();
  const [view, setView] = useState('list'); // 'list' | 'editor'
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const fileInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const [form, setForm] = useState({
    title: '',
    excerpt: '',
    body: '',
    tags: [],
    status: 'draft'
  });

  // Load articles on open
  useEffect(() => {
    if (!articleEditorModal) return;
    loadArticles();
    setView('list');
  }, [articleEditorModal]); // eslint-disable-line

  const loadArticles = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminArticles();
      setArticles(data);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ title: '', excerpt: '', body: '', tags: [], status: 'draft' });
    setEditingArticle(null);
    setImagePreview(null);
    setSelectedFile(null);
  };

  const openEditor = (article = null) => {
    if (article) {
      setForm({
        title: article.title || '',
        excerpt: article.excerpt || '',
        body: article.body || '',
        tags: article.tags || [],
        status: article.status || 'draft'
      });
      setEditingArticle(article);
      setImagePreview(article.coverImage?.url || null);
      setSelectedFile(null);
    } else {
      resetForm();
    }
    setView('editor');
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be less than 5MB', 'error');
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async (publishOverride = null) => {
    if (!form.title.trim()) { showToast('Title is required', 'error'); return; }
    if (!form.body.trim()) { showToast('Article body is required', 'error'); return; }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('excerpt', form.excerpt);
      formData.append('body', form.body);
      formData.append('tags', JSON.stringify(form.tags));
      formData.append('status', publishOverride || form.status);
      if (selectedFile) {
        formData.append('coverImage', selectedFile);
      }

      if (editingArticle) {
        await updateArticle(editingArticle._id, formData);
        showToast('Article updated! ✅');
      } else {
        await createArticle(formData);
        showToast('Article created! 🎉');
      }

      await loadArticles();
      setView('list');
      resetForm();
    } catch (err) {
      showToast(err.message || 'Failed to save article', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this article?')) return;
    try {
      await deleteArticle(id);
      showToast('Article deleted', 'info');
      await loadArticles();
    } catch (err) {
      showToast(err.message || 'Failed to delete', 'error');
    }
  };

  const toggleTag = (tag) => {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag]
    }));
  };

  if (!articleEditorModal || !user || user.role !== 'admin') return null;

  const focusStyle = (e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = 'var(--focus-ring)'; };
  const blurStyle = (e) => { e.target.style.borderColor = 'var(--input-border)'; e.target.style.boxShadow = 'none'; };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--overlay-bg)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease' }} onClick={e => e.target === e.currentTarget && setArticleEditorModal(false)}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--input-border)', borderRadius: 24, padding: '2rem', width: 860, maxWidth: '95vw', maxHeight: '92vh', animation: 'scaleIn 0.3s cubic-bezier(0.16,1,0.3,1)', boxShadow: 'var(--shadow-xl)', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 850, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              ✍️ {view === 'list' ? 'Article Manager' : (editingArticle ? 'Edit Article' : 'New Article')}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.8rem', margin: '4px 0 0' }}>
              {view === 'list' ? 'Create, edit, and publish articles' : 'Write your article content below'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {view === 'editor' && (
              <button onClick={() => { setView('list'); resetForm(); }} style={btnBase('ghost', { padding: '0.5rem 1rem', fontSize: '0.8rem', borderRadius: 8 })}>← Back</button>
            )}
            <button onClick={() => setArticleEditorModal(false)} style={{ background: 'var(--bg-soft)', border: 'none', color: 'var(--muted)', fontSize: '1rem', cursor: 'pointer', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 6 }}>

          {/* ═══ LIST VIEW ═══ */}
          {view === 'list' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600 }}>{articles.length} article{articles.length !== 1 ? 's' : ''}</span>
                <button onClick={() => openEditor()} style={btnBase('primary', { padding: '0.55rem 1.2rem', fontSize: '0.82rem', borderRadius: 10 })}>+ New Article</button>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}><Spin s={24} /></div>
              ) : articles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--muted)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>📝</div>
                  <p>No articles yet. Create your first one!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {articles.map(article => (
                    <div key={article._id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 14, padding: '0.8rem 1rem', transition: 'all 0.2s' }}>
                      {/* Thumbnail */}
                      <div style={{ width: 60, height: 44, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-alt)' }}>
                        {article.coverImage?.url ? (
                          <img src={article.coverImage.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>📰</div>
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{article.title}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'flex', gap: 12, marginTop: 2 }}>
                          <span>{new Date(article.updatedAt || article.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                          <span>📖 {article.readTime}m</span>
                          <span>👁 {article.views}</span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span style={{
                        background: article.status === 'published' ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
                        color: article.status === 'published' ? 'var(--accent-dark)' : '#D97706',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: 20,
                        textTransform: 'capitalize',
                        flexShrink: 0
                      }}>
                        {article.status}
                      </span>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => openEditor(article)} style={btnBase('ghost', { padding: '4px 10px', fontSize: '0.72rem', borderRadius: 6 })}>Edit</button>
                        <button onClick={() => handleDelete(article._id)} style={{ ...btnBase('ghost', { padding: '4px 10px', fontSize: '0.72rem', borderRadius: 6 }), color: '#EF4444', borderColor: 'rgba(239,68,68,0.2)' }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ EDITOR VIEW ═══ */}
          {view === 'editor' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

              {/* Cover Image Upload */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.4rem', display: 'block', fontWeight: 600 }}>Cover Image</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%',
                    height: imagePreview ? 220 : 140,
                    border: '2px dashed var(--input-border)',
                    borderRadius: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    position: 'relative',
                    transition: 'all 0.2s',
                    background: imagePreview ? 'transparent' : 'var(--glass-bg)',
                  }}
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                        <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>📷 Change Image</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Click to upload cover image</div>
                      <div style={{ fontSize: '0.72rem', marginTop: 4 }}>JPEG, PNG, WebP — max 5MB</div>
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageSelect} style={{ display: 'none' }} />
              </div>

              {/* Title */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.35rem', display: 'block', fontWeight: 600 }}>Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Enter article title..."
                  style={{ ...inpStyle, fontSize: '1.1rem', fontWeight: 700 }}
                  onFocus={focusStyle} onBlur={blurStyle}
                />
              </div>

              {/* Excerpt */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.35rem', display: 'block', fontWeight: 600 }}>Excerpt <span style={{ fontWeight: 400 }}>(short summary for cards)</span></label>
                <textarea
                  value={form.excerpt}
                  onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
                  placeholder="Write a brief summary..."
                  rows={2}
                  maxLength={300}
                  style={{ ...inpStyle, resize: 'vertical', minHeight: 60 }}
                  onFocus={focusStyle} onBlur={blurStyle}
                />
                <div style={{ textAlign: 'right', fontSize: '0.7rem', color: 'var(--muted-light)', marginTop: 2 }}>{form.excerpt.length}/300</div>
              </div>

              {/* Body */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.35rem', display: 'block', fontWeight: 600 }}>Body * <span style={{ fontWeight: 400 }}>(supports **bold** and ## headings)</span></label>
                <textarea
                  value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="Write your article content here...

Use ## for headings
Use **text** for bold
Separate paragraphs with blank lines"
                  rows={12}
                  style={{ ...inpStyle, resize: 'vertical', minHeight: 200, lineHeight: 1.7 }}
                  onFocus={focusStyle} onBlur={blurStyle}
                />
                <div style={{ textAlign: 'right', fontSize: '0.7rem', color: 'var(--muted-light)', marginTop: 2 }}>~{Math.max(1, Math.ceil((form.body.split(/\s+/).length) / 200))} min read</div>
              </div>

              {/* Tags */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.4rem', display: 'block', fontWeight: 600 }}>Tags</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {AVAILABLE_TAGS.map(tag => {
                    const active = form.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        type="button"
                        style={{
                          ...btnBase(active ? 'primary' : 'ghost', {
                            padding: '0.35rem 0.9rem',
                            fontSize: '0.75rem',
                            borderRadius: 50,
                            fontWeight: active ? 700 : 500
                          })
                        }}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => handleSave('draft')}
                  disabled={saving}
                  style={btnBase('ghost', { flex: 1, padding: '0.75rem', fontSize: '0.88rem', opacity: saving ? 0.6 : 1 })}
                >
                  {saving ? <Spin s={14} /> : '💾'} Save as Draft
                </button>
                <button
                  onClick={() => handleSave('published')}
                  disabled={saving}
                  style={btnBase('primary', { flex: 1, padding: '0.75rem', fontSize: '0.88rem', opacity: saving ? 0.6 : 1 })}
                >
                  {saving ? <Spin s={14} /> : '🚀'} Publish
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
