'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Send, RotateCcw } from 'lucide-react';
import { useI18n } from '@/components/i18n/LanguageProvider';
import { RichText } from './RichText';
import { WorkingIndicator } from './WorkingIndicator';
import { VoiceInputButton, ReadAloudButton } from './VoiceControls';

export function ContentTutor({ endpoint, context, title, placeholder, testPrefix, citation }: {
  endpoint: string;
  context: Record<string, string | number>;
  title: string;
  placeholder: string;
  testPrefix: string;
  citation: string;
}) {
  const { t, locale } = useI18n();
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastQuestion = useRef('');
  const request = useRef<AbortController | null>(null);
  const transcript = useRef<HTMLDivElement>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    const element = transcript.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [turns, pending]);

  const ask = async (question = draft) => {
    if (!question.trim() || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    lastQuestion.current = question;
    setPending(question);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...context, question, locale, history: turns.slice(-8).map(turn => ({ ...turn, text: turn.text.slice(0, 4000) })) }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok || !data.ok || typeof data.reply !== 'string' || !data.reply.trim()) throw new Error(data.error || 'The tutor could not reply. Please try again.');
      setTurns(previous => [...previous, { role: 'user', text: question }, { role: 'assistant', text: data.reply }]);
      setDraft('');
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof TypeError ? 'Could not reach the tutor. Please try again.' : failure instanceof Error ? failure.message : 'The tutor could not reply. Please try again.');
    } finally {
      if (!controller.signal.aborted) setPending(null);
      request.current = null;
    }
  };
  return (
    <section className="border-t border-atelier-border pt-5" aria-label={t(title)}>
      <h3 className="text-sm font-semibold">{t(title)}</h3>
      <p className="mt-1 text-xs text-atelier-muted">{t('Grounded in: {source}', { source: citation })}</p>
      <div ref={transcript} className="tutor-transcript" aria-busy={Boolean(pending)}>
        {turns.map((turn, index) => (
          <div key={index} className={`tutor-message ${turn.role === 'user' ? 'tutor-message-user' : ''}`}
            data-testid={turn.role === 'assistant' ? `${testPrefix}-tutor-reply` : undefined}>
            <RichText text={turn.text} />
            {turn.role === 'assistant' && <ReadAloudButton text={turn.text} />}
          </div>
        ))}
        {pending && <><div className="tutor-message tutor-message-user"><RichText text={pending} /></div><WorkingIndicator /></>}
      </div>
      {error && <div className="tutor-error" role="alert"><span>{t(error)}</span><button type="button" onClick={() => void ask(lastQuestion.current)} className="text-button"><RotateCcw className="h-3 w-3" />{t('Retry')}</button></div>}
      <form className="lumina-composer-well mt-3 flex flex-wrap items-center gap-2 p-2" onSubmit={event => { event.preventDefault(); void ask(); }}>
        <input value={draft} onChange={event => setDraft(event.target.value)} maxLength={2000} disabled={Boolean(pending)}
          aria-label={t(title)} placeholder={t(placeholder)} data-testid={`${testPrefix}-tutor-input`} className="min-w-0 flex-1 px-2 py-2.5 text-sm" />
        <VoiceInputButton disabled={Boolean(pending)} onTranscript={text => setDraft(previous => `${previous}${previous ? ' ' : ''}${text}`.slice(0, 2000))} />
        <button type="submit" disabled={Boolean(pending) || !draft.trim()} data-testid={`${testPrefix}-tutor-ask-btn`} className="primary-button">
          <Send className="h-3.5 w-3.5" /><span>{t('Ask')}</span>
        </button>
      </form>
      <p className="voice-disclosure">{t('Voice uses Azure Speech. Tap the microphone to record up to 30 seconds; audio is not stored by Tavi.')}</p>
    </section>
  );
}
