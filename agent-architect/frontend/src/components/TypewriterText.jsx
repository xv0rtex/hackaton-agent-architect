import { useState, useEffect, useRef } from 'react';

/**
 * Typewriter text effect — reveals text character by character.
 * Optionally adds a blinking cursor at the end.
 *
 * @param {string} text — the text to type
 * @param {number} speed — ms per character (default 30)
 * @param {boolean} showCursor — show blinking cursor
 * @param {function} onComplete — called when typing finishes
 */
export default function TypewriterText({ text, speed = 30, showCursor = true, onComplete, className = '' }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    indexRef.current = 0;

    const interval = setInterval(() => {
      indexRef.current++;
      if (indexRef.current <= text.length) {
        setDisplayed(text.slice(0, indexRef.current));
      } else {
        clearInterval(interval);
        setDone(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <span className={className}>
      {displayed}
      {showCursor && !done && (
        <span className="inline-block w-[2px] h-[1em] bg-primary ml-0.5 animate-pulse" />
      )}
    </span>
  );
}
