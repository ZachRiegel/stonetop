// whether the user asks for reduced motion, read when called (motion that is already under
// way keeps the answer it started with)
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default prefersReducedMotion;
