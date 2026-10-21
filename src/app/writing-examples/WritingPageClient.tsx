'use client';

import { useI18n } from '@/components/i18n/LanguageProvider';
import { RichText } from '@/components/ui/RichText';
import React, { useState, useRef } from 'react';
import { PenTool, ArrowRight, ChevronDown, FileText, Download } from 'lucide-react';
import { WorkingIndicator } from '@/components/ui/WorkingIndicator';
import { VoiceInputButton, ReadAloudButton } from '@/components/ui/VoiceControls';
import { Select } from '@/components/ui/Select';

interface AnnotationItem {
  paragraph: number;
  type: string;
  badge: string;
  comment: string;
}

export interface WritingDoc {
  id: string;
  slug: string;
  title: string;
  genre: string;
  gradeLevel: string;
  wordCount: number;
  contentText: string;
  aiScore: number;
  annotations: AnnotationItem[];
  isCuratedExample: boolean;
}

const GENRES = ['Argumentative Essay', 'Research Paper', 'College Application Essay'];

export default function WritingExamplesPage({ documents }: { documents: WritingDoc[] }) {
  const { t } = useI18n();
  const [docs, setDocs] = useState(documents);
  const [activeDoc, setActiveDoc] = useState<WritingDoc | null>(documents[0] || null);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [customTitle, setCustomTitle] = useState('');
  const [customGenre, setCustomGenre] = useState(GENRES[0]);
  const [customContent, setCustomContent] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const analyzingRef = useRef(false);
  const [action, setAction] = useState<'grade' | 'polish' | 'grammar'>('grade');

  const filtered = selectedGenre === 'All' ? docs : docs.filter((doc) => doc.genre === selectedGenre);

  const handleAnalyzeEssay = async (action: 'grade' | 'outline' | 'polish' | 'grammar') => {
    if (analyzingRef.current) return;
    if (!customContent.trim()) {
      setErrorMsg('Add a draft or a few notes before asking for feedback.');
      return;
    }
    setErrorMsg(null);
    analyzingRef.current = true;
    setAnalyzing(true);
    try {
      const response = await fetch('/api/writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: customTitle.trim() || 'Untitled draft',
          genre: customGenre,
          content: customContent.trim(),
          action,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok || !data.document) {
        setErrorMsg(data.error || 'Your draft could not be reviewed. Please try again.');
        return;
      }
      setDocs((previous) => [data.document, ...previous]);
      setActiveDoc(data.document);
    } catch {
      setErrorMsg('Could not connect to the writing studio. Please try again.');
    } finally {
      analyzingRef.current = false;
      setAnalyzing(false);
    }
  };
  const exportFeedback = () => {
    if (!activeDoc) return;
    const notes = activeDoc.annotations.map(note => `### ${t('Paragraph {number}', { number: note.paragraph })} - ${note.type}\n\n${note.comment}`).join('\n\n');
    const text = `# ${activeDoc.title}\n\n${activeDoc.contentText}\n\n## ${t('Notes on the writing')}\n\n${notes}`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tavi-writing-feedback.md';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="page-container" data-testid="writing-examples-page">
      <div className="page-heading">
        <p className="eyebrow">{t("The writing studio / Give your ideas a little room")}</p>
        <h1>{t("Your next draft, a little clearer.")}</h1>
        <p>{t("Find the shape of an argument, strengthen your voice, or see what makes a good paragraph work.")}</p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          <form
            className="paper-panel p-5 sm:p-6"
            data-testid="ai-essay-grader-card"
            onSubmit={(event) => { event.preventDefault(); handleAnalyzeEssay(action); }}
            aria-busy={analyzing}
          >
            <div className="mb-5 flex items-center gap-3">
              <PenTool className="h-5 w-5 text-atelier-vermilion" aria-hidden="true" />
              <h2 className="text-xl font-semibold">{t("Start with your words.")}</h2>
            </div>
            <label htmlFor="writing-title" className="text-xs font-semibold">{t("Title or prompt")}</label>
            <input
              id="writing-title"
              value={customTitle}
              maxLength={200}
              onChange={(event) => setCustomTitle(event.target.value)}
              placeholder={t("What are you writing about?")}
              data-testid="writing-title-input"
              className="lumina-input mb-5 mt-2 w-full px-4 py-3 text-sm"
            />
            <label htmlFor="writing-genre" className="text-xs font-semibold">{t("A little context")}</label>
            <Select
              id="writing-genre"
              value={customGenre}
              onValueChange={setCustomGenre}
              options={GENRES.map(genre => ({ value: genre, label: t(genre) }))}
              className="mb-5 mt-2 w-full"
            />
            <label htmlFor="writing-draft" className="text-xs font-semibold">{t("Your draft or notes")}</label>
            <textarea
              id="writing-draft"
              value={customContent}
              maxLength={20000}
              disabled={analyzing}
              onChange={(event) => setCustomContent(event.target.value)}
              placeholder={t("A rough first draft is a perfectly good place to start...")}
              rows={9}
              data-testid="writing-content-input"
              className="lumina-input mt-2 w-full resize-y p-4 text-base leading-7"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <VoiceInputButton disabled={analyzing} onTranscript={text => setCustomContent(previous => `${previous}${previous ? ' ' : ''}${text}`.slice(0, 20000))} />
              <span className="text-xs text-atelier-muted">{customContent.length} / 20000</span>
            </div>
            <p className="voice-disclosure">{t('Voice uses Azure Speech. Tap the microphone to record up to 30 seconds; audio is not stored by Tavi.')}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold">
              <label htmlFor="writing-action">
              {t('What would help your draft?')}
              </label>
              <Select id="writing-action" value={action} disabled={analyzing} onValueChange={setAction}
                data-testid="writing-action" options={[
                  { value: 'grade', label: t('Review my draft') },
                  { value: 'polish', label: t('Polish the wording') },
                  { value: 'grammar', label: t('Check grammar') },
                ]} />
            </div>
            {analyzing && <div className="mt-3"><WorkingIndicator label="Reading your draft..." /></div>}
            {errorMsg && <p role="alert" className="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-800">{t(errorMsg)}</p>}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button type="submit" disabled={analyzing} data-testid="writing-grade-btn" className="primary-button flex-1">
                {analyzing ? t('Reading your draft...') : t('Get a fresh perspective')}
                {!analyzing && <ArrowRight className="h-4 w-4" />}
              </button>
              <button type="button" disabled={analyzing} onClick={() => handleAnalyzeEssay('outline')} className="secondary-button">{t("Build an outline")}</button>
            </div>
          </form>

          <details className="mt-7 border-y border-atelier-border py-5">
            <summary className="flex items-center justify-between gap-3 text-sm font-medium">{t("A little inspiration from the reading shelf")}<ChevronDown className="h-4 w-4 shrink-0" />
            </summary>
            <label htmlFor="reading-genre" className="sr-only">{t("Filter the reading shelf")}</label>
            <Select id="reading-genre" value={selectedGenre} onValueChange={setSelectedGenre} className="mb-4 mt-5 w-full"
              options={['All', ...GENRES].map(genre => ({ value: genre, label: genre === 'All' ? t('All writing') : t(genre) }))} />
            <div className="space-y-2">
              {filtered.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setActiveDoc(doc)}
                  aria-pressed={activeDoc?.id === doc.id}
                  data-testid={`writing-doc-card-${doc.slug}`}
                  className={`w-full rounded-md p-4 text-left ${activeDoc?.id === doc.id ? 'bg-atelier-lilac' : 'hover:bg-atelier-subtle'}`}
                >
                  <span className="text-xs text-atelier-muted">{t(doc.genre)} / {doc.wordCount}{t(" words")}</span>
                  <h3 className="mt-2 text-sm font-semibold">{doc.title}</h3>
                </button>
              ))}
            </div>
          </details>
        </div>

        <div className="min-w-0">
          {activeDoc ? (
            <article className="paper-panel p-5 sm:p-6" data-testid="writing-active-reader">
              <p className="eyebrow text-atelier-vermilion">{activeDoc.isCuratedExample ? t('From the reading shelf') : t('Your writing feedback')}</p>
              <h2 className="mt-5 text-2xl font-semibold" data-testid="writing-reader-title">{activeDoc.title}</h2>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-atelier-border pb-6">
                <span className="text-xs text-atelier-muted">{t(activeDoc.genre)}</span>
                <div className="flex items-center gap-2 rounded-md bg-atelier-citron/50 px-3 py-2">
                  <span className="text-xs">{t("Estimated rubric score")}</span>
                  <span className="text-sm font-semibold" data-testid="writing-reader-score">{activeDoc.aiScore} / 100</span>
                </div>
              </div>
              <p className="mt-3 text-xs text-atelier-muted">{t('Scores are automated estimates, not a human assessment.')}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" className="text-button" data-testid="writing-export-feedback" onClick={exportFeedback}><Download className="h-3.5 w-3.5" />{t('Export feedback')}</button>
                  <ReadAloudButton text={activeDoc.contentText} />
              </div>
              <RichText text={activeDoc.contentText} className="mt-5 text-base leading-8 text-atelier-muted" />
              <details className="mt-8 border-t border-atelier-border pt-6">
                <summary className="flex items-center justify-between gap-3 text-sm font-semibold">
                  <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-atelier-vermilion" />{t("Notes on the writing")}</span>
                  <span className="text-xs font-normal text-atelier-muted">{activeDoc.annotations.length}{t(" notes")}</span>
                </summary>
                <div className="mt-5 space-y-5">
                  {activeDoc.annotations.map((annotation, index) => (
                    <div key={index} className="border-l-2 border-atelier-lilac pl-4">
                      <h3 className="text-sm font-semibold">{t('Paragraph {number}', { number: annotation.paragraph })} / {annotation.type}</h3>
                      <RichText text={annotation.comment} className="mt-2 text-sm leading-6 text-atelier-muted" />
                      <span className="mt-2 inline-block text-xs text-atelier-vermilion">{annotation.badge}</span>
                    </div>
                  ))}
                </div>
              </details>
            </article>
          ) : (
            <div className="flex min-h-80 flex-col justify-center px-8 py-16">
              <p className="eyebrow text-atelier-vermilion">{t("A fresh pair of eyes")}</p>
              <h2 className="mt-5 text-3xl font-medium">{t("Your ideas.")}<br />{t("With a little more clarity.")}</h2>
              <p className="mt-5 text-sm leading-7 text-atelier-muted">{t("Your feedback will appear here. Start with a draft, or open a piece from the reading shelf.")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
