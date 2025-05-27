'use client';

import * as React from 'react';
import {
  motion,
  useInView,
  type UseInViewOptions,
  type Transition,
} from 'motion/react';

const ENTRY_ANIMATION = {
  initial: { rotateX: 0 },
  animate: { rotateX: 90 },
};

const EXIT_ANIMATION = {
  initial: { rotateX: 90 },
  animate: { rotateX: 0 },
};

const formatCharacter = (char: string) => (char === ' ' ? '\u00A0' : char);

type RollingTextProps = Omit<React.ComponentProps<'span'>, 'children'> & {
  transition?: Transition;
  inView?: boolean;
  inViewMargin?: UseInViewOptions['margin'];
  inViewOnce?: boolean;
  text: string;
  loop?: boolean;
  loopDelay?: number;
};

function RollingText({
  ref,
  transition = { duration: 0.5, delay: 0.1, ease: 'easeOut' },
  inView = false,
  inViewMargin = '0px',
  inViewOnce = true,
  text,
  loop = false,
  loopDelay = 3000,
  ...props
}: RollingTextProps) {
  const localRef = React.useRef<HTMLSpanElement>(null);
  React.useImperativeHandle(ref, () => localRef.current!);

  const inViewResult = useInView(localRef, {
    once: inViewOnce,
    margin: inViewMargin,
  });
  
  // 控制动画的计数器和当前动画状态
  const [animationCount, setAnimationCount] = React.useState(0);
  const [isAnimating, setIsAnimating] = React.useState(false);
  
  // 基础状态：如果在视图中则应该动画
  const isInView = !inView || inViewResult;
  
  // 初始动画
  React.useEffect(() => {
    if (isInView) {
      setIsAnimating(true);
    }
  }, [isInView]);
  
  // 处理循环逻辑
  React.useEffect(() => {
    if (!loop || !isInView) return;
    
    const intervalId = setInterval(() => {
      // 重置动画状态，先关闭再打开
      setIsAnimating(false);
      
      // 增加计数并在短暂延迟后重新启动动画
      setTimeout(() => {
        setAnimationCount(prev => prev + 1);
        setIsAnimating(true);
      }, 50);
    }, loopDelay);
    
    return () => clearInterval(intervalId);
  }, [loop, loopDelay, isInView]);
  
  const characters = React.useMemo(() => text.split(''), [text]);

  return (
    <span data-slot="rolling-text" {...props} ref={localRef}>
      {characters.map((char, idx) => (
        <span
          key={`${idx}-${animationCount}`}
          className="relative inline-block perspective-[9999999px] transform-3d w-auto"
          aria-hidden="true"
        >
          <motion.span
            className="absolute inline-block backface-hidden origin-[50%_25%]"
            initial={ENTRY_ANIMATION.initial}
            animate={isAnimating ? ENTRY_ANIMATION.animate : ENTRY_ANIMATION.initial}
            transition={{
              ...transition,
              delay: idx * (transition?.delay ?? 0),
            }}
          >
            {formatCharacter(char)}
          </motion.span>
          <motion.span
            className="absolute inline-block backface-hidden origin-[50%_100%]"
            initial={EXIT_ANIMATION.initial}
            animate={isAnimating ? EXIT_ANIMATION.animate : EXIT_ANIMATION.initial}
            transition={{
              ...transition,
              delay: idx * (transition?.delay ?? 0) + 0.3,
            }}
          >
            {formatCharacter(char)}
          </motion.span>
          <span className="invisible">{formatCharacter(char)}</span>
        </span>
      ))}

      <span className="sr-only">{text}</span>
    </span>
  );
}

export { RollingText, type RollingTextProps };
