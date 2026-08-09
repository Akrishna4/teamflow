import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import axios from 'axios';
import { Paperclip, UploadCloud, X, Download, FileText, Image as ImageIcon, Trash2 } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import EmptyState from '../ui/EmptyState';

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

const isImage = (mimetype) => mimetype.startsWith('image/');

export default function TaskAttachments({ taskId, projectId, newAttachmentEvent }) {
  const { user } = useContext(AuthContext);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeUploads, setActiveUploads] = useState([]);
  
  const fileInputRef = useRef(null);

  const fetchAttachments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/v1/tasks/${taskId}/attachments`);
      setAttachments(res.data.data);
    } catch (err) {
      console.error('Failed to fetch attachments', err);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (taskId) fetchAttachments();
  }, [taskId, fetchAttachments]);

  useEffect(() => {
    if (!newAttachmentEvent) return;
    const { event, payload } = newAttachmentEvent;
    
    setAttachments((prev) => {
      if (event === 'attachment.uploaded') {
        const exists = prev.some(a => a._id === payload._id);
        if (exists) return prev;
        return [payload, ...prev]; // newer first
      }
      if (event === 'attachment.deleted') {
        return prev.filter(a => a._id !== payload._id);
      }
      return prev;
    });
  }, [newAttachmentEvent]);

  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach(async (file) => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} exceeds 10MB limit.`);
        return;
      }
      
      const uploadId = Date.now() + Math.random().toString(36).substr(2, 9);
      setActiveUploads(prev => [...prev, { id: uploadId, name: file.name, progress: 0 }]);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);
      
      try {
        await axios.post(`/v1/tasks/${taskId}/attachments`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setActiveUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress: percentCompleted } : u));
          }
        });
      } catch (err) {
        console.error(`Failed to upload file ${file.name}`, err);
        alert(err.response?.data?.message || `Failed to upload file ${file.name}`);
      } finally {
        setActiveUploads(prev => prev.filter(u => u.id !== uploadId));
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleUpload(e.dataTransfer.files);
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDelete = async (attachmentId) => {
    if (!window.confirm('Delete this attachment permanently?')) return;
    
    // Optimistic delete
    const attachmentToDelete = attachments.find(a => a._id === attachmentId);
    setAttachments(prev => prev.filter(a => a._id !== attachmentId));
    
    try {
      await axios.delete(`/v1/attachments/${attachmentId}?projectId=${projectId}`);
    } catch (err) {
      // Rollback
      if (attachmentToDelete) {
        setAttachments(prev => {
          const arr = [...prev, attachmentToDelete];
          return arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        });
      }
      console.error('Failed to delete attachment', err);
      alert('Failed to delete attachment');
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div 
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="relative border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer flex flex-col items-center justify-center p-8 overflow-hidden group"
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          multiple
          onChange={(e) => handleUpload(e.target.files)}
        />
        
        {activeUploads.length > 0 ? (
          <div className="flex flex-col space-y-3 w-full max-w-sm">
            {activeUploads.map(upload => (
              <div key={upload.id} className="w-full">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700 truncate mr-2">{upload.name}</span>
                  <span className="text-blue-600 font-semibold">{upload.progress}%</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-300 ease-out"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-400 group-hover:text-blue-500 mb-3 transition-colors">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">Click to upload or drag and drop</p>
            <p className="text-xs text-slate-500 mt-1">Images, PDFs, or Documents up to 10MB</p>
          </>
        )}
      </div>

      {/* Attachments List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : attachments.length === 0 ? (
        <EmptyState
          icon={Paperclip}
          title="No attachments yet"
          description="Upload files to share context with your team."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {attachments.map((attachment) => {
            const canDelete = user?.role === 'Admin' || attachment.uploader._id === user?._id;
            const downloadUrl = `/v1/attachments/${attachment._id}/download?projectId=${projectId}`;
            
            return (
              <div key={attachment._id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-start gap-3 group hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600">
                  {isImage(attachment.mimetype) ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <a 
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-slate-900 truncate hover:text-blue-600 block mb-0.5 transition-colors"
                    title={attachment.originalName}
                  >
                    {attachment.originalName}
                  </a>
                  <div className="flex items-center text-xs text-slate-500 gap-2">
                    <span>{formatBytes(attachment.size)}</span>
                    <span>•</span>
                    <span className="truncate">{attachment.uploader.name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a 
                    href={downloadUrl}
                    download={attachment.originalName}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  {canDelete && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(attachment._id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
