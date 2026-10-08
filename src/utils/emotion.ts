// Emotion's development build warns on :first-child and :nth-child selectors, in case the
// styles are server-rendered (the <style> tags it inserts during hydration would shift the
// child indices). This app only renders in the browser. Emotion's opt-out is this comment
// written just before the rule; @emotion/babel-plugin strips comments out of templates, so
// it has to be interpolated instead: `${ALLOW_CHILD_SELECTORS} & > :first-child { … }`
export const ALLOW_CHILD_SELECTORS =
  "/* emotion-disable-server-rendering-unsafe-selector-warning-please-do-not-use-this-the-warning-exists-for-a-reason */";
