// mongoDB/commentsRoute.js
import { addComment, getCommentsByTask, deleteComment } from './commentsController.js';

export const commentsRoutes = async (fastify) => {
  // נרשם עם prefix '/tasks/:taskId/comments'
  fastify.get('/', getCommentsByTask);           // GET /tasks/:taskId/comments
  fastify.post('/', addComment);                 // POST /tasks/:taskId/comments
  fastify.delete('/:id', deleteComment);         // DELETE /tasks/:taskId/comments/:id
};
