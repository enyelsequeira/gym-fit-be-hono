let getSourceCode = context =>
  /* v8 ignore next 2 */
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  context.sourceCode ?? context.getSourceCode()
export { getSourceCode }
