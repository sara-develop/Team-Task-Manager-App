import { useEffect, useState } from 'react';
import { fetchComments, addComment } from '../../services/api';
import './comments.css';

const CommentsModal = ({ taskId, onClose }) => {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    const load = async () => {
      const data = await fetchComments(taskId);
      setComments(data);
    };
    load();
  }, [taskId]);

  const submit = async () => {
    if (!text.trim()) return;
    try {
      const newC = await addComment(taskId, {
        userId: 'anonymous',
        content: text
      });
      setComments(prev => [newC, ...prev]);
      setText('');
    } catch (err) {
      console.error('add comment failed', err);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Comments for task #{taskId}</h3>
          <button onClick={onClose}>Close</button>
        </div>
        <div className="modal-body">
          <div className="comment-input">
            <textarea value={text} onChange={(e) => setText(e.target.value)} />
            <button onClick={submit}>Add</button>
          </div>
          <ul className="comments-list">
            {comments.map(c => (
              <li key={c._id}>
                <div className="comment-meta">{c.userId} • {new Date(c.createdAt).toLocaleString()}</div>
                <div>{c.content}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CommentsModal;
