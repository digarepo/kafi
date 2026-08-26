'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@ui/lib/utils';

// -----------------------------------------------------------------------------
// Reduced-motion hook
// -----------------------------------------------------------------------------
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}

// -----------------------------------------------------------------------------
// Simple in-view hook
// -----------------------------------------------------------------------------
function useInView(
  ref: React.RefObject<Element>,
  options?: IntersectionObserverInit & { once?: boolean },
) {
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (options?.once) observer.disconnect();
        } else if (!options?.once) {
          setIsInView(false);
        }
      },
      { ...options },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, options]);

  return isInView;
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
type MotionElementType =
  | 'article'
  | 'div'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'li'
  | 'p'
  | 'section'
  | 'span';

interface TypingAnimationProps {
  children?: string;
  words?: string[];
  className?: string;
  duration?: number;
  typeSpeed?: number;
  deleteSpeed?: number;
  delay?: number;
  pauseDelay?: number;
  loop?: boolean;
  as?: MotionElementType;
  startOnView?: boolean;
  showCursor?: boolean;
  blinkCursor?: boolean;
  cursorStyle?: 'line' | 'block' | 'underscore';
}

// -----------------------------------------------------------------------------
// The component — lightweight, no GSAP dependency
// -----------------------------------------------------------------------------
export function TypingAnimation({
  children,
  words,
  className,
  duration = 100,
  typeSpeed,
  deleteSpeed,
  delay = 0,
  pauseDelay = 1000,
  loop = false,
  as: Component = 'span',
  startOnView = true,
  showCursor = true,
  blinkCursor = true,
  cursorStyle = 'line',
}: TypingAnimationProps) {
  const elementRef = useRef<HTMLElement | null>(null);
  const isInView = useInView(elementRef as React.RefObject<Element>, {
    threshold: 0.3,
    once: true,
  });
  const prefersReducedMotion = usePrefersReducedMotion();

  const wordsToAnimate = useMemo(
    () => words ?? (children ? [children] : []),
    [words, children],
  );

  const typingSpeed = typeSpeed ?? duration;
  const deletingSpeed = deleteSpeed ?? typingSpeed / 2;

  const shouldStart = startOnView ? isInView : true;

  const animationKey = useMemo(
    () => (words ? words.join('\u0000') : (children ?? '')),
    [words, children],
  );

  const [displayedText, setDisplayedText] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Reset when source words change
  useEffect(() => {
    setDisplayedText('');
    setCurrentWordIndex(0);
    setCurrentCharIndex(0);
    setIsAnimating(false);
  }, [animationKey]);

  // When reduced motion is preferred, show the first word immediately
  useEffect(() => {
    if (prefersReducedMotion && wordsToAnimate.length > 0) {
      setDisplayedText(wordsToAnimate[0]!);
      setCurrentWordIndex(0);
      setCurrentCharIndex(wordsToAnimate[0]!.length);
      setIsAnimating(false);
    }
  }, [prefersReducedMotion, wordsToAnimate]);

  // Lightweight typing loop using setTimeout — no GSAP
  useEffect(() => {
    if (!shouldStart || prefersReducedMotion || wordsToAnimate.length === 0)
      return;

    let timeoutId: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const runSequence = (
      wordIdx: number,
      charIdx: number,
      isDeleting: boolean,
    ) => {
      if (cancelled) return;
      const word = wordsToAnimate[wordIdx]!;
      const isLastWord = wordIdx === wordsToAnimate.length - 1;

      if (!isDeleting) {
        // Typing phase
        if (charIdx <= word.length) {
          setDisplayedText(word.slice(0, charIdx));
          setCurrentCharIndex(charIdx);
          setCurrentWordIndex(wordIdx);
          timeoutId = setTimeout(
            () => runSequence(wordIdx, charIdx + 1, false),
            typingSpeed,
          );
        } else {
          // Word complete — pause, then delete (if more words or looping)
          if (!isLastWord || loop) {
            timeoutId = setTimeout(
              () => runSequence(wordIdx, word.length, true),
              pauseDelay,
            );
          } else {
            setIsAnimating(false);
          }
        }
      } else {
        // Deleting phase
        if (charIdx > 0) {
          setDisplayedText(word.slice(0, charIdx - 1));
          setCurrentCharIndex(charIdx - 1);
          timeoutId = setTimeout(
            () => runSequence(wordIdx, charIdx - 1, true),
            deletingSpeed,
          );
        } else {
          // Move to next word
          const nextIdx = (wordIdx + 1) % wordsToAnimate.length;
          if (nextIdx === 0 && !loop) {
            setIsAnimating(false);
            return;
          }
          timeoutId = setTimeout(
            () => runSequence(nextIdx, 0, false),
            typingSpeed,
          );
        }
      }
    };

    setIsAnimating(true);
    timeoutId = setTimeout(() => runSequence(0, 0, false), delay);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [
    shouldStart,
    prefersReducedMotion,
    animationKey,
    typingSpeed,
    deletingSpeed,
    pauseDelay,
    delay,
    loop,
    wordsToAnimate,
  ]);

  // Cursor visibility logic
  const lastWord = wordsToAnimate[currentWordIndex] ?? '';
  const isComplete =
    !loop &&
    currentWordIndex === wordsToAnimate.length - 1 &&
    currentCharIndex >= lastWord.length &&
    !isAnimating;

  const shouldShowCursor =
    showCursor &&
    !isComplete &&
    (wordsToAnimate.length > 1 || loop || currentCharIndex < lastWord.length);

  const cursorChar = {
    line: '|',
    block: '▌',
    underscore: '_',
  }[cursorStyle];

  const Element = Component as React.ElementType;

  // Reserve space for the longest word to prevent CLS from text reflow
  const longestWord = useMemo(
    () => wordsToAnimate.reduce((a, b) => (b.length > a.length ? b : a), ''),
    [wordsToAnimate],
  );

  return (
    <Element
      ref={elementRef}
      className={cn(
        'relative leading-20 tracking-[-0.02em]',
        Component === 'span' && 'inline-block',
        className,
      )}
    >
      {/* Invisible spacer reserves the width of the longest word */}
      <span aria-hidden="true" className="invisible whitespace-nowrap">
        {longestWord}
      </span>
      {/* Visible typing text overlaid on top */}
      <span className="absolute left-0 top-0 whitespace-nowrap">
        {displayedText}
        {shouldShowCursor && (
          <span
            className={cn(
              'inline-block',
              blinkCursor && 'animate-blink-cursor',
            )}
          >
            {cursorChar}
          </span>
        )}
      </span>
    </Element>
  );
}
