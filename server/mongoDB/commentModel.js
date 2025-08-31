// mongoDB/commentModel.js
import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema({
  taskId: { type: String, required: true },
  userId: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Comment = mongoose.model('Comment', CommentSchema);
