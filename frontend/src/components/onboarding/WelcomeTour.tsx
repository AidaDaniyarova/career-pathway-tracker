import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface TourSlide {
  icon: string;
  title: string;
  body: string;
  /** Optional quick link shown on the slide. */
  link?: { to: string; label: string };
}

const SLIDES: TourSlide[] = [
  {
    icon: '👋',
    title: 'Welcome to Career Pathway Tracker',
    body: 'This app helps you choose a career, learn the skills for it and get job-ready. Here is how it works in four short steps. You can skip at any time.',
  },
  {
    icon: '👤',
    title: '1. Set up your profile',
    body: 'Add your skills, experience and education in Profile. They are used to suggest career paths that suit you.',
    link: { to: '/dashboard/profile', label: 'Go to Profile' },
  },
  {
    icon: '📝',
    title: '2. Discover your direction',
    body: 'Take the short career quiz, then open Recommendations to see the careers that match your answers and skills.',
    link: { to: '/dashboard/quizzes', label: 'Take the quiz' },
  },
  {
    icon: '🎯',
    title: '3. Follow a career path',
    body: 'Enroll in a career path and work through its learning modules in order. Finished modules earn XP, and Progress shows how far you have come.',
    link: { to: '/dashboard/career-paths', label: 'Browse career paths' },
  },
  {
    icon: '📄',
    title: '4. Get job-ready',
    body: 'Build your CV, compare it with job descriptions in Job Scanner and practise with Interview Help. These AI features need your consent first.',
    link: { to: '/dashboard/cv-builder', label: 'Open CV Builder' },
  },
];

interface WelcomeTourProps {
  isOpen: boolean;
  firstName?: string;
  /** Called when the tour is finished or skipped. */
  onClose: () => void;
}

const WelcomeTour: React.FC<WelcomeTourProps> = ({ isOpen, firstName, onClose }) => {
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        setIndex(0);
      }
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const slide = SLIDES[index];
  const isFirst = index === 0;
  const isLast = index === SLIDES.length - 1;
  const title = isFirst && firstName ? `Welcome, ${firstName}!` : slide.title;

  const finish = (to?: string) => {
    onClose();
    setIndex(0);
    if (to) navigate(to);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) finish();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden outline-none animate-slide-up"
      >
        {/* Progress bar */}
        <div className="h-1 bg-gray-100" aria-hidden="true">
          <div
            className="h-1 bg-blue-600 transition-all duration-300"
            style={{ width: `${((index + 1) / SLIDES.length) * 100}%` }}
          />
        </div>

        <div className="px-6 pt-5 flex justify-between items-center">
          <span className="text-xs font-medium text-gray-500">
            {isFirst ? 'Quick tour' : `Step ${index} of ${SLIDES.length - 1}`}
          </span>
          <button
            type="button"
            onClick={() => finish()}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            Skip tour
          </button>
        </div>

        <div className="px-6 pt-4 pb-6 text-center" aria-live="polite">
          <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-3xl mb-4" aria-hidden="true">
            {slide.icon}
          </div>
          <h2 id="tour-title" className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
          <p id="tour-body" className="text-gray-600 text-sm leading-relaxed">{slide.body}</p>
          {slide.link && (
            <button
              type="button"
              onClick={() => finish(slide.link!.to)}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              {slide.link.label} →
            </button>
          )}
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 pb-4" role="tablist" aria-label="Tour steps">
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Go to step ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-blue-600' : 'w-2 bg-gray-300 hover:bg-gray-400'}`}
            />
          ))}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-between gap-3">
          <button
            type="button"
            onClick={() => setIndex((i) => i - 1)}
            disabled={isFirst}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:invisible"
          >
            Back
          </button>
          {isLast ? (
            <button
              type="button"
              onClick={() => finish('/dashboard/profile')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start with my profile
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIndex((i) => i + 1)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isFirst ? 'Show me around' : 'Next'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomeTour;
