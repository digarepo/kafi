'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { cn } from '@ui/lib/utils';

// -----------------------------------------------------------------------------
// Simple in‑view hook – mimics the original useInView(…, { amount: 0.3, once: true })
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
// Types (identical to your original, with minor additions)
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
  duration?: number; // fallback for typeSpeed
  typeSpeed?: number; // ms per character (default duration)
  deleteSpeed?: number; // ms per character (default half of typeSpeed)
  delay?: number; // initial delay in ms
  pauseDelay?: number; // pause between words in ms
  loop?: boolean;
  as?: MotionElementType;
  startOnView?: boolean;
  showCursor?: boolean;
  blinkCursor?: boolean;
  cursorStyle?: 'line' | 'block' | 'underscore';
}

// -----------------------------------------------------------------------------
// The component
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

  // ---------------------------------------------------------------------------
  // Derive settings
  // ---------------------------------------------------------------------------
  const wordsToAnimate = useMemo(
    () => words ?? (children ? [children] : []),
    [words, children],
  );

  const typingSpeed = typeSpeed ?? duration;
  const deletingSpeed = deleteSpeed ?? typingSpeed / 2;

  const shouldStart = startOnView ? isInView : true;

  // Key that changes when the source words / children change, forcing a timeline reset
  const animationKey = useMemo(
    () => (words ? words.join('\u0000') : (children ?? '')),
    [words, children],
  );

  // ---------------------------------------------------------------------------
  // Internal state for rendering & cursor logic
  // ---------------------------------------------------------------------------
  const [displayedText, setDisplayedText] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Reset all state when the source words change
  useEffect(() => {
    setDisplayedText('');
    setCurrentWordIndex(0);
    setCurrentCharIndex(0);
    setIsAnimating(false);
  }, [animationKey]);

  // ---------------------------------------------------------------------------
  // GSAP timeline
  // ---------------------------------------------------------------------------
  useGSAP(
    () => {
      if (!shouldStart || wordsToAnimate.length === 0) return;

      const tl = gsap.timeline({
        delay: delay / 1000,
        repeat: loop ? -1 : 0,
        onStart: () => setIsAnimating(true),
        onComplete: () => {
          // Only fires when repeat is not infinite and the whole sequence finishes
          if (!loop) setIsAnimating(false);
        },
      });

      // Shared object that GSAP will tween – we read it in onUpdate
      const charObj = { value: 0 };

      wordsToAnimate.forEach((word, i) => {
        const isLastWord = i === wordsToAnimate.length - 1;

        // ----- Typing phase -----
        tl.to(charObj, {
          value: word.length,
          duration: (word.length * typingSpeed) / 1000,
          ease: 'none',
          onUpdate: () => {
            const len = Math.floor(charObj.value);
            setDisplayedText(word.slice(0, len));
            setCurrentCharIndex(len);
            setCurrentWordIndex(i);
          },
          onComplete: () => {
            // Snap to final string at the end of typing
            setDisplayedText(word);
            setCurrentCharIndex(word.length);
          },
        });

        // ----- Pause & delete (only if there are more words or we loop) -----
        if (!isLastWord || loop) {
          // Pause between words
          tl.to({}, { duration: pauseDelay / 1000 });

          // Deleting phase
          tl.to(charObj, {
            value: 0,
            duration: (word.length * deletingSpeed) / 1000,
            ease: 'none',
            onUpdate: () => {
              const len = Math.floor(charObj.value);
              setDisplayedText(word.slice(0, len));
              setCurrentCharIndex(len);
            },
            onComplete: () => {
              setDisplayedText('');
              setCurrentCharIndex(0);
            },
          });
        }
      });
    },
    {
      // Re‑run the effect whenever these dependencies change
      dependencies: [
        shouldStart,
        animationKey,
        typingSpeed,
        deletingSpeed,
        pauseDelay,
        delay,
        loop,
      ],
      revertOnUpdate: true, // cleans up the previous timeline automatically
    },
  );

  // ---------------------------------------------------------------------------
  // Cursor visibility logic (mirrors original)
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Render – using a plain HTML element (no motion)
  // ---------------------------------------------------------------------------
  const Element = Component as React.ElementType;

  return (
    <Element
      ref={elementRef}
      className={cn(
        'leading-20 tracking-[-0.02em]',
        Component === 'span' && 'inline-block',
        className,
      )}
    >
      {displayedText}
      {shouldShowCursor && (
        <span
          className={cn('inline-block', blinkCursor && 'animate-blink-cursor')}
        >
          {cursorChar}
        </span>
      )}
    </Element>
  );
}
