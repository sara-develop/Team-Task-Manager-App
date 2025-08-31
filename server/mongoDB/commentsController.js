// mongoDB/commentsController.js
import { Comment } from './commentModel.js';

export const addComment = async (req, reply) => {
  try {
    const { userId, content } = req.body;
    const { taskId } = req.params;

    if (!taskId) return reply.code(400).send({ error: 'taskId missing in path' });
    if (!userId || !content) return reply.code(400).send({ error: 'userId and content are required' });

    const comment = new Comment({ taskId, userId, content });
    await comment.save();

    // עדכון Cache (אלגנטי-אופציונלי)
    try {
      const redis = req.server.redis;
      if (redis) {
        await redis.del(`comments:${taskId}`); // לפשטות: נבטל cache לרענון
      }
    } catch (e) {
      req.log.warn('Redis cache invalidation failed:', e?.message || e);
    }

    reply.code(201).send(comment);
  } catch (err) {
    reply.code(500).send({ error: 'Failed to add comment', details: err.message });
  }
};

export const getCommentsByTask = async (req, reply) => {
  try {
    const { taskId } = req.params;
    if (!taskId) return reply.code(400).send({ error: 'taskId missing in path' });

    const redis = req.server.redis;
    if (redis) {
      const cached = await redis.get(`comments:${taskId}`);
      if (cached) return reply.send(JSON.parse(cached));
    }

    const comments = await Comment.find({ taskId }).sort({ createdAt: 1 });

    if (redis) await redis.setEx(`comments:${taskId}`, 60, JSON.stringify(comments));
    reply.send(comments);
  } catch (err) {
    reply.code(500).send({ error: 'Failed to fetch comments', details: err.message });
  }
};

export const deleteComment = async (req, reply) => {
  try {
    const { id, taskId } = req.params;
    if (!id) return reply.code(400).send({ error: 'comment id missing in path' });

    await Comment.findByIdAndDelete(id);

    try {
      const redis = req.server.redis;
      if (redis && taskId) await redis.del(`comments:${taskId}`);
    } catch {}

    reply.send({ message: 'Comment deleted' });
  } catch (err) {
    reply.code(500).send({ error: 'Failed to delete comment', details: err.message });
  }
};
