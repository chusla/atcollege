import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ThreadedComment({ comment, onReply, depth = 0 }) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const handleSubmitReply = () => {
    if (!replyContent.trim()) return;
    onReply(comment.id, replyContent);
    setReplyContent('');
    setShowReplyForm(false);
  };

  return (
    <div className={`${depth > 0 ? 'ml-8 border-l-2 border-gray-100 pl-4' : ''}`}>
      <div className="py-3">
        <div className="flex items-start gap-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={comment.user_avatar_url} />
            <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
              {comment.user_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-gray-900">
                {comment.user_name || 'Anonymous'}
              </span>
              <span className="text-xs text-gray-500">
                {comment.created_at && formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="text-gray-700 text-sm mb-2">{comment.content}</p>
            
            {depth < 3 && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600"
              >
                <MessageSquare className="w-3 h-3" />
                Reply
              </button>
            )}

            {showReplyForm && (
              <div className="mt-3">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  rows={2}
                  className="text-sm"
                />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={handleSubmitReply}>
                    Reply
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowReplyForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            {comment.replies.map((reply) => (
              <ThreadedComment
                key={reply.id}
                comment={reply}
                onReply={onReply}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

