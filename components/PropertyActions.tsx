'use client';

import { useState } from 'react';
import {
  Star, Copy, MessageSquare, Send, FileText, X,
  Phone, Calendar, DollarSign, Clock, Plus, Trash2
} from 'lucide-react';
import { API } from '@/lib/config';

interface PropertyNote {
  id: string;
  text: string;
  created_at: string;
  created_by: string;
  type?: 'general' | 'call' | 'meeting' | 'offer' | 'follow_up';
}

interface PropertyActionsProps {
  propertyId: string;
  location: string;
  isFavourite?: boolean;
  notes?: PropertyNote[];
  pitch?: string | null;
  evaluationReport?: string | null;
  userEmail: string;
  onFavouriteChange?: (isFavourite: boolean) => void;
  onDuplicate?: (newProperty: any) => void;
  onNotesChange?: (notes: PropertyNote[]) => void;
}

const NOTE_TYPES = [
  { value: 'general', label: 'General', icon: MessageSquare },
  { value: 'call', label: 'Phone Call', icon: Phone },
  { value: 'meeting', label: 'Meeting', icon: Calendar },
  { value: 'offer', label: 'Offer', icon: DollarSign },
  { value: 'follow_up', label: 'Follow Up', icon: Clock },
];

export default function PropertyActions({
  propertyId,
  location,
  isFavourite = false,
  notes = [],
  pitch,
  evaluationReport,
  userEmail,
  onFavouriteChange,
  onDuplicate,
  onNotesChange
}: PropertyActionsProps) {
  const [favourite, setFavourite] = useState(isFavourite);
  const [showNotes, setShowNotes] = useState(false);
  const [localNotes, setLocalNotes] = useState<PropertyNote[]>(notes);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteType, setNewNoteType] = useState<string>('general');
  const [addingNote, setAddingNote] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleToggleFavourite = async () => {
    const newValue = !favourite;
    setFavourite(newValue);

    try {
      await fetch(`${API}/properties/${propertyId}/favourite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favourite: newValue })
      });
      onFavouriteChange?.(newValue);
    } catch (error) {
      console.error('Error toggling favourite:', error);
      setFavourite(!newValue); // Revert on error
    }
  };

  const handleDuplicate = async () => {
    if (duplicating) return;
    setDuplicating(true);

    try {
      const response = await fetch(`${API}/properties/${propertyId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Failed to duplicate');

      const data = await response.json();
      onDuplicate?.(data.property);
      alert(`Property duplicated! New listing created at "${data.property.location}"`);
    } catch (error) {
      console.error('Error duplicating property:', error);
      alert('Failed to duplicate property');
    } finally {
      setDuplicating(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim() || addingNote) return;
    setAddingNote(true);

    try {
      const response = await fetch(`${API}/properties/${propertyId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newNoteText,
          type: newNoteType,
          created_by: userEmail
        })
      });

      if (!response.ok) throw new Error('Failed to add note');

      const data = await response.json();
      const updatedNotes = [...localNotes, data.note];
      setLocalNotes(updatedNotes);
      onNotesChange?.(updatedNotes);
      setNewNoteText('');
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await fetch(`${API}/properties/${propertyId}/notes?noteId=${noteId}`, {
        method: 'DELETE'
      });

      const updatedNotes = localNotes.filter(n => n.id !== noteId);
      setLocalNotes(updatedNotes);
      onNotesChange?.(updatedNotes);
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleCopyText = async (text: string, type: 'pitch' | 'report') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Error copying:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNoteIcon = (type: string) => {
    const noteType = NOTE_TYPES.find(t => t.value === type);
    const Icon = noteType?.icon || MessageSquare;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Quick Actions Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Favourite Button */}
        <button
          onClick={handleToggleFavourite}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            favourite
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title={favourite ? 'Remove from favourites' : 'Add to favourites'}
        >
          <Star className={`w-4 h-4 ${favourite ? 'fill-amber-500' : ''}`} />
          {favourite ? 'Starred' : 'Star'}
        </button>

        {/* Duplicate Button */}
        <button
          onClick={handleDuplicate}
          disabled={duplicating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
          title="Duplicate property"
        >
          <Copy className="w-4 h-4" />
          {duplicating ? 'Duplicating...' : 'Duplicate'}
        </button>

        {/* Notes Button */}
        <button
          onClick={() => setShowNotes(!showNotes)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showNotes || localNotes.length > 0
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title="View/add notes"
        >
          <MessageSquare className="w-4 h-4" />
          Notes {localNotes.length > 0 && `(${localNotes.length})`}
        </button>

        {/* Copy Pitch Button */}
        {pitch && (
          <button
            onClick={() => handleCopyText(pitch, 'pitch')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              copied === 'pitch'
                ? 'bg-green-100 text-green-700'
                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            }`}
            title="Copy pitch to clipboard"
          >
            <FileText className="w-4 h-4" />
            {copied === 'pitch' ? 'Copied!' : 'Copy Pitch'}
          </button>
        )}

        {/* Copy Report Button */}
        {evaluationReport && (
          <button
            onClick={() => handleCopyText(evaluationReport, 'report')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              copied === 'report'
                ? 'bg-green-100 text-green-700'
                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
            }`}
            title="Copy valuation report to clipboard"
          >
            <FileText className="w-4 h-4" />
            {copied === 'report' ? 'Copied!' : 'Copy Report'}
          </button>
        )}
      </div>

      {/* Notes Panel */}
      {showNotes && (
        <div className="mt-2 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          {/* Add Note Form */}
          <div className="p-3 border-b border-gray-200 bg-white">
            <div className="flex gap-2 mb-2">
              {NOTE_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => setNewNoteType(type.value)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                    newNoteType === type.value
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <type.icon className="w-3 h-3" />
                  {type.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newNoteText}
                onChange={e => setNewNoteText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                placeholder="Add a note..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNoteText.trim() || addingNote}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {/* Notes List */}
          <div className="max-h-64 overflow-y-auto">
            {localNotes.length === 0 ? (
              <p className="p-4 text-center text-gray-500 text-sm">No notes yet</p>
            ) : (
              localNotes.slice().reverse().map(note => (
                <div key={note.id} className="p-3 border-b border-gray-100 last:border-0 hover:bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      <span className={`mt-0.5 p-1 rounded ${
                        note.type === 'call' ? 'bg-green-100 text-green-600' :
                        note.type === 'meeting' ? 'bg-purple-100 text-purple-600' :
                        note.type === 'offer' ? 'bg-amber-100 text-amber-600' :
                        note.type === 'follow_up' ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {getNoteIcon(note.type || 'general')}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm text-gray-800">{note.text}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(note.created_at)} • {note.created_by}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for property cards
export function PropertyQuickActions({
  propertyId,
  isFavourite = false,
  notesCount = 0,
  onFavouriteChange,
  onNotesClick
}: {
  propertyId: string;
  isFavourite?: boolean;
  notesCount?: number;
  onFavouriteChange?: (isFavourite: boolean) => void;
  onNotesClick?: () => void;
}) {
  const [favourite, setFavourite] = useState(isFavourite);

  const handleToggleFavourite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const newValue = !favourite;
    setFavourite(newValue);

    try {
      await fetch(`${API}/properties/${propertyId}/favourite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favourite: newValue })
      });
      onFavouriteChange?.(newValue);
    } catch (error) {
      setFavourite(!newValue);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleToggleFavourite}
        className={`p-1.5 rounded-full transition-colors ${
          favourite ? 'text-amber-500 hover:bg-amber-100' : 'text-gray-400 hover:bg-gray-100'
        }`}
        title={favourite ? 'Remove from favourites' : 'Add to favourites'}
      >
        <Star className={`w-4 h-4 ${favourite ? 'fill-amber-500' : ''}`} />
      </button>
      {notesCount > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onNotesClick?.(); }}
          className="p-1.5 rounded-full text-blue-500 hover:bg-blue-100"
          title={`${notesCount} note${notesCount > 1 ? 's' : ''}`}
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
