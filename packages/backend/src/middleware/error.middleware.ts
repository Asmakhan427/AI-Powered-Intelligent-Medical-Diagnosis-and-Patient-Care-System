// ============================================
// error.middleware.ts - spec-named entry point.
// --------------------------------------------
// The implementation lives in `./errorHandler.middleware.ts` (kept for
// backward compatibility with existing imports). This module re-exports it
// under the names from the spec:
//   - errorHandler(err, req, res, next)
//   - notFound(req, res)
//   - asyncHandler(fn)
// ============================================
export { errorHandler, notFound, notFoundHandler, asyncHandler } from './errorHandler.middleware';

export { default } from './errorHandler.middleware';
